package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func testServer(t *testing.T) (*httptest.Server, *Store) {
	t.Helper()
	store, err := newStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(newAPI(store, newAuth("test-secret", demoUsers())).routes())
	t.Cleanup(server.Close)
	return server, store
}

func login(t *testing.T, url, user, pass string) (int, string) {
	t.Helper()
	body := []byte(`{"username":"` + user + `","password":"` + pass + `"}`)
	res, err := http.Post(url+"/api/auth/login", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var out struct{ Token string }
	_ = json.NewDecoder(res.Body).Decode(&out)
	return res.StatusCode, out.Token
}

func do(t *testing.T, method, url, token, body string) int {
	t.Helper()
	req, _ := http.NewRequest(method, url, strings.NewReader(body))
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	return res.StatusCode
}

func TestPublicCarsAndNoBookingEndpoints(t *testing.T) {
	server, _ := testServer(t)
	if code := do(t, "GET", server.URL+"/api/cars", "", ""); code != 200 {
		t.Fatalf("cars publik = %d", code)
	}
	if code := do(t, "GET", server.URL+"/api/cars/xpander", "", ""); code != 200 {
		t.Fatalf("detail mobil = %d", code)
	}
	// Pemesanan lewat WhatsApp: server tidak menyimpan data pelanggan, jadi endpoint ini tidak ada.
	for _, p := range []string{"/api/bookings", "/api/customers", "/api/dashboard"} {
		for _, method := range []string{"GET", "POST"} {
			if code := do(t, method, server.URL+p, "", "{}"); code != 404 && code != 405 {
				t.Errorf("%s %s = %d, harusnya tidak ada", method, p, code)
			}
		}
	}
}

func TestMutationsRequireLogin(t *testing.T) {
	server, _ := testServer(t)
	for method, path := range map[string]string{"POST": "/api/cars", "PUT": "/api/cars/agya", "DELETE": "/api/cars/agya", "PATCH": "/api/cars/agya/availability"} {
		if code := do(t, method, server.URL+path, "", "{}"); code != 401 {
			t.Errorf("%s %s tanpa login = %d", method, path, code)
		}
		if code := do(t, method, server.URL+path, "palsu.token", "{}"); code != 401 {
			t.Errorf("%s %s token palsu = %d", method, path, code)
		}
	}
}

func TestExpiredAndTamperedTokens(t *testing.T) {
	a := newAuth("secret-a", demoUsers())
	if _, err := a.verify(a.issue(a.users[0], -time.Minute)); err == nil {
		t.Fatal("token kedaluwarsa harus ditolak")
	}
	if _, err := a.verify(newAuth("secret-b", demoUsers()).issue(a.users[0], time.Hour)); err == nil {
		t.Fatal("token dengan secret lain harus ditolak")
	}
	if _, err := a.verify(a.issue(a.users[0], time.Hour)); err != nil {
		t.Fatalf("token valid ditolak: %v", err)
	}
}

func TestLoginFlow(t *testing.T) {
	server, _ := testServer(t)
	if code, _ := login(t, server.URL, "admin", "salah"); code != 401 {
		t.Fatalf("password salah = %d", code)
	}
	code, token := login(t, server.URL, "ADMIN", "Presisi#2026")
	if code != 200 || token == "" {
		t.Fatalf("login = %d", code)
	}
	if got := do(t, "GET", server.URL+"/api/auth/me", token, ""); got != 200 {
		t.Fatalf("me = %d", got)
	}
}

func TestLoginRateLimit(t *testing.T) {
	server, _ := testServer(t)
	var last int
	for i := 0; i < 7; i++ {
		last, _ = login(t, server.URL, "admin", "salah")
	}
	if last != 429 {
		t.Fatalf("percobaan ke-7 = %d, harusnya 429", last)
	}
}

func TestProductionUsersHaveNoDemoAccounts(t *testing.T) {
	t.Setenv("ADMIN_PASSWORD", "RahasiaKuat#123")
	users := adminUsers()
	if len(users) != 1 || users[0].Role != "admin" {
		t.Fatalf("users = %+v", users)
	}
	a := newAuth("x", users)
	if len(a.users) != 1 || hashPassword("Presisi#2026", a.users[0].salt) == a.users[0].hash {
		t.Fatal("password demo tidak boleh berlaku di produksi")
	}
}

func TestSecurityHeadersAndCORS(t *testing.T) {
	server, _ := testServer(t)
	req, _ := http.NewRequest("GET", server.URL+"/api/health", nil)
	req.Header.Set("Origin", "http://evil.example")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.Header.Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("origin asing tidak boleh diizinkan")
	}
	if res.Header.Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("header keamanan hilang")
	}
}

func TestLegacyDataFileEnv(t *testing.T) {
	t.Setenv("DATA_DIR", "")
	t.Setenv("DATA_FILE", "/var/lib/presisi/bookings.json")
	if got := dataDir(); got != "/var/lib/presisi" {
		t.Fatalf("dataDir = %q", got)
	}
}
