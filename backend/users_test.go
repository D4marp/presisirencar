package main

import (
	"encoding/hex"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestPBKDF2KnownVectors(t *testing.T) {
	// Vektor uji baku PBKDF2-HMAC-SHA256 (password="password", salt="salt", dkLen=32).
	cases := map[int]string{
		1:    "120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b",
		2:    "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43",
		4096: "c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a",
	}
	for iter, want := range cases {
		if got := hex.EncodeToString(pbkdf2SHA256([]byte("password"), []byte("salt"), iter, 32)); got != want {
			t.Errorf("PBKDF2 iter=%d: %s, harusnya %s", iter, got, want)
		}
	}
	// Vektor RFC 7914 (dkLen=64, c=1)
	want := "55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783"
	if got := hex.EncodeToString(pbkdf2SHA256([]byte("passwd"), []byte("salt"), 1, 64)); got != want {
		t.Errorf("PBKDF2 64 byte: %s", got)
	}
}

func TestEachUserGetsRandomSalt(t *testing.T) {
	a, b := newUser("satu", "Satu", "staff", "KataSandiKuat123"), newUser("dua", "Dua", "staff", "KataSandiKuat123")
	if a.salt == b.salt || a.hash == b.hash {
		t.Fatal("salt harus acak per akun: password sama tidak boleh menghasilkan hash sama")
	}
}

// newTestAPI membuat server dengan akses langsung ke Auth (untuk memanipulasi undangan di tes).
func newTestAPI(t *testing.T, dir string) (*httptest.Server, *Auth) {
	t.Helper()
	store, err := newStore(dir)
	if err != nil {
		t.Fatal(err)
	}
	auth := newAuth("test-secret", demoUsers(), dir)
	server := httptest.NewServer(newAPI(store, auth).routes())
	t.Cleanup(server.Close)
	return server, auth
}

func register(t *testing.T, url, username, name, password, code string) (int, map[string]any) {
	t.Helper()
	body := `{"username":"` + username + `","name":"` + name + `","password":"` + password + `","invite_code":"` + code + `"}`
	return call(t, "POST", url+"/api/auth/register", "", body)
}

func invite_(t *testing.T, url, adminToken, role string) string {
	t.Helper()
	code, out := call(t, "POST", url+"/api/invites", adminToken, `{"role":"`+role+`"}`)
	if code != 201 {
		t.Fatalf("buat undangan = %d %v", code, out)
	}
	c, _ := out["code"].(string)
	if len(c) != 19 { // 16 karakter + 3 tanda hubung
		t.Fatalf("format kode = %q", c)
	}
	return c
}

const strongPw = "Vq7mK2xR9tLp4Z8w"

func TestRegistrationRequiresInvite(t *testing.T) {
	server, _ := newTestAPI(t, t.TempDir())
	// tanpa kode, kode kosong, kode ngawur, kode berformat benar tapi tidak ada
	for name, code := range map[string]string{"kosong": "", "ngawur": "abc", "tidak ada": "ABCD-EFGH-JKLM-NPQR"} {
		if c, _ := register(t, server.URL, "penyusup", "Penyusup", strongPw, code); c != 422 {
			t.Errorf("%s: status %d, harusnya 422", name, c)
		}
	}
	if c, _ := call(t, "POST", server.URL+"/api/auth/login", "", `{"username":"penyusup","password":"`+strongPw+`"}`); c != 401 {
		t.Fatalf("akun tidak boleh terbentuk tanpa undangan, login = %d", c)
	}
}

func TestInviteFlowAndRoles(t *testing.T) {
	server, _ := newTestAPI(t, t.TempDir())
	admin, staff := tokens(t, server.URL)

	// hanya admin yang bisa membuat undangan / melihat pengguna
	for method, path := range map[string]string{"POST": "/api/invites", "GET": "/api/invites", "GET ": "/api/users"} {
		if c := do(t, strings.TrimSpace(method), server.URL+path, staff, `{"role":"staff"}`); c != 403 {
			t.Errorf("staf %s %s = %d, harusnya 403", method, path, c)
		}
		if c := do(t, strings.TrimSpace(method), server.URL+path, "", `{"role":"staff"}`); c != 401 {
			t.Errorf("tanpa login %s %s = %d, harusnya 401", method, path, c)
		}
	}
	if c, _ := call(t, "POST", server.URL+"/api/invites", admin, `{"role":"superuser"}`); c != 422 {
		t.Fatalf("role tidak valid = %d", c)
	}

	// daftar sebagai STAF dengan kode undangan
	code := invite_(t, server.URL, admin, "staff")
	c, out := register(t, server.URL, "Dewi.Baru", "Dewi Baru", strongPw, strings.ToLower(code)) // huruf kecil juga diterima
	if c != 201 || out["role"] != "staff" || out["username"] != "dewi.baru" {
		t.Fatalf("daftar = %d %v", c, out)
	}
	// kode sekali pakai
	if c, _ := register(t, server.URL, "orang-lain", "Orang Lain", strongPw, code); c != 422 {
		t.Fatalf("kode kedua kali = %d, harusnya 422", c)
	}
	// login akun baru; peran staf: boleh toggle ketersediaan, tidak boleh membuat mobil/undangan
	lc, newTok := login(t, server.URL, "dewi.baru", strongPw)
	if lc != 200 {
		t.Fatalf("login akun baru = %d", lc)
	}
	if c := do(t, "PATCH", server.URL+"/api/cars/xpander/availability", newTok, `{"available":true}`); c != 200 {
		t.Fatalf("staf toggle = %d", c)
	}
	if c, _ := call(t, "POST", server.URL+"/api/cars", newTok, newCar); c != 403 {
		t.Fatalf("staf membuat mobil = %d", c)
	}
	if c := do(t, "POST", server.URL+"/api/invites", newTok, `{"role":"admin"}`); c != 403 {
		t.Fatalf("staf mengundang admin = %d", c)
	}

	// daftar sebagai ADMIN: boleh membuat mobil
	acode := invite_(t, server.URL, admin, "admin")
	if c, o := register(t, server.URL, "admin-dua", "Admin Dua", strongPw, acode); c != 201 || o["role"] != "admin" {
		t.Fatalf("daftar admin = %d %v", c, o)
	}
	_, tok2 := login(t, server.URL, "admin-dua", strongPw)
	if c, _ := call(t, "POST", server.URL+"/api/cars", tok2, newCar); c != 201 {
		t.Fatalf("admin baru membuat mobil = %d", c)
	}

	// daftar pengguna menampilkan akun baru (tanpa hash)
	_, list := call(t, "GET", server.URL+"/api/users", admin, "")
	raw := ""
	for _, u := range list["data"].([]any) {
		raw += strings.ToLower(strings.Join([]string{u.(map[string]any)["username"].(string)}, ","))
	}
	if !strings.Contains(raw, "dewi.baru") || !strings.Contains(raw, "admin-dua") {
		t.Fatalf("daftar pengguna = %v", list)
	}
	if b, _ := call(t, "GET", server.URL+"/api/users", admin, ""); strings.Contains(strings.ToLower(toJSON(b)), "hash") || strings.Contains(toJSON(b), "salt") {
		t.Fatal("hash/salt tidak boleh bocor di daftar pengguna")
	}
}

func TestRegistrationValidation(t *testing.T) {
	server, _ := newTestAPI(t, t.TempDir())
	admin, _ := tokens(t, server.URL)
	cases := map[string][4]string{
		"password lemah":          {"pengguna1", "Nama Valid", "presisisemarang1", "422"},
		"password pendek":         {"pengguna2", "Nama Valid", "Pendek1!", "422"},
		"username terlalu pendek": {"ab", "Nama Valid", strongPw, "422"},
		"username karakter aneh":  {"nama pengguna!", "Nama Valid", strongPw, "422"},
		"nama kosong":             {"pengguna3", " ", strongPw, "422"},
		"username root bentrok":   {"admin", "Nama Valid", strongPw, "409"},
	}
	for name, v := range cases {
		code := invite_(t, server.URL, admin, "staff")
		want := 422
		if v[3] == "409" {
			want = 409
		}
		if c, _ := register(t, server.URL, v[0], v[1], v[2], code); c != want {
			t.Errorf("%s: status %d, harusnya %d", name, c, want)
		}
	}
}

func TestExpiredInviteRejected(t *testing.T) {
	server, auth := newTestAPI(t, t.TempDir())
	admin, _ := tokens(t, server.URL)
	code := invite_(t, server.URL, admin, "staff")
	auth.mu.Lock()
	auth.invites[0].ExpiresAt = time.Now().Add(-time.Minute)
	auth.mu.Unlock()
	if c, _ := register(t, server.URL, "terlambat", "Terlambat Daftar", strongPw, code); c != 422 {
		t.Fatalf("undangan kedaluwarsa = %d, harusnya 422", c)
	}
}

func TestRevokeInvite(t *testing.T) {
	server, auth := newTestAPI(t, t.TempDir())
	admin, _ := tokens(t, server.URL)
	code := invite_(t, server.URL, admin, "staff")
	auth.mu.RLock()
	id := auth.invites[0].ID
	auth.mu.RUnlock()
	if c := do(t, "DELETE", server.URL+"/api/invites/"+id, admin, ""); c != 204 {
		t.Fatalf("cabut undangan = %d", c)
	}
	if c, _ := register(t, server.URL, "dicabut", "Dicabut Undangan", strongPw, code); c != 422 {
		t.Fatalf("undangan yang dicabut masih bisa dipakai = %d", c)
	}
	if c := do(t, "DELETE", server.URL+"/api/invites/"+id, admin, ""); c != 404 {
		t.Fatalf("cabut dua kali = %d", c)
	}
}

func TestRegistrationRateLimit(t *testing.T) {
	server, _ := newTestAPI(t, t.TempDir())
	var last int
	for i := 0; i < 12; i++ {
		last, _ = register(t, server.URL, "coba", "Coba Coba", strongPw, "ABCD-EFGH-JKLM-NPQR")
	}
	if last != 429 {
		t.Fatalf("percobaan ke-12 = %d, harusnya 429", last)
	}
}

func TestDeleteUser(t *testing.T) {
	server, _ := newTestAPI(t, t.TempDir())
	admin, _ := tokens(t, server.URL)
	code := invite_(t, server.URL, admin, "staff")
	register(t, server.URL, "akan-dihapus", "Akan Dihapus", strongPw, code)
	_, tok := login(t, server.URL, "akan-dihapus", strongPw)
	if c := do(t, "GET", server.URL+"/api/auth/me", tok, ""); c != 200 {
		t.Fatalf("sebelum dihapus = %d", c)
	}
	if c := do(t, "DELETE", server.URL+"/api/users/admin", admin, ""); c != 403 {
		t.Fatalf("hapus akun utama = %d, harusnya 403", c)
	}
	if c := do(t, "DELETE", server.URL+"/api/users/staff", admin, ""); c != 403 {
		t.Fatalf("hapus akun utama (staf demo) = %d, harusnya 403", c)
	}
	if c := do(t, "DELETE", server.URL+"/api/users/akan-dihapus", admin, ""); c != 204 {
		t.Fatalf("hapus pengguna = %d", c)
	}
	// token lama langsung tidak berlaku, dan login ulang gagal
	if c := do(t, "GET", server.URL+"/api/auth/me", tok, ""); c != 401 {
		t.Fatalf("token pengguna terhapus masih berlaku = %d", c)
	}
	if c, _ := login(t, server.URL, "akan-dihapus", strongPw); c != 401 {
		t.Fatalf("login akun terhapus = %d", c)
	}
	if c := do(t, "DELETE", server.URL+"/api/users/akan-dihapus", admin, ""); c != 404 {
		t.Fatalf("hapus dua kali = %d", c)
	}
}

func TestCannotDeleteSelf(t *testing.T) {
	server, _ := newTestAPI(t, t.TempDir())
	admin, _ := tokens(t, server.URL)
	code := invite_(t, server.URL, admin, "admin")
	register(t, server.URL, "admin-saya", "Admin Saya", strongPw, code)
	_, tok := login(t, server.URL, "admin-saya", strongPw)
	if c := do(t, "DELETE", server.URL+"/api/users/admin-saya", tok, ""); c != 403 {
		t.Fatalf("hapus diri sendiri = %d, harusnya 403", c)
	}
}

func TestUsersAndInvitesPersistAcrossRestart(t *testing.T) {
	dir := t.TempDir()
	server, _ := newTestAPI(t, dir)
	admin, _ := tokens(t, server.URL)
	pending := invite_(t, server.URL, admin, "staff")
	used := invite_(t, server.URL, admin, "staff")
	register(t, server.URL, "bertahan", "Akun Bertahan", strongPw, used)
	server.Close()

	server2, _ := newTestAPI(t, dir) // "restart" dengan folder data yang sama
	if c, _ := login(t, server2.URL, "bertahan", strongPw); c != 200 {
		t.Fatalf("akun hilang setelah restart: login = %d", c)
	}
	if c, _ := register(t, server2.URL, "lain", "Orang Lain", strongPw, used); c != 422 {
		t.Fatalf("undangan terpakai hidup lagi setelah restart = %d", c)
	}
	if c, o := register(t, server2.URL, "dari-pending", "Dari Pending", strongPw, pending); c != 201 {
		t.Fatalf("undangan yang belum dipakai hilang setelah restart = %d %v", c, o)
	}
}

func toJSON(v any) string {
	b, _ := json.Marshal(v)
	return string(b)
}
