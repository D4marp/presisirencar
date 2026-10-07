package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func futureDate(days int) string { return time.Now().In(wib).AddDate(0, 0, days).Format("2006-01-02") }

func testServer(t *testing.T, seed bool) (*httptest.Server, *Store) {
	t.Helper()
	if seed {
		t.Setenv("SEED_DEMO", "1")
	} else {
		t.Setenv("SEED_DEMO", "0")
	}
	store, err := newStore(filepath.Join(t.TempDir(), "bookings.json"))
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(newAPI(store, newAuth("test-secret", demoUsers())).routes())
	t.Cleanup(server.Close)
	return server, store
}

func postBooking(t *testing.T, url, body string) (int, map[string]any) {
	t.Helper()
	res, err := http.Post(url+"/api/bookings", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var out map[string]any
	_ = json.NewDecoder(res.Body).Decode(&out)
	return res.StatusCode, out
}

func bookingJSON(slug, phone, date string, days int) string {
	return `{"customer_name":"Sinta","phone":"` + phone + `","car_slug":"` + slug + `","pickup_location":"Semarang","start_date":"` + date + `","duration":` + string(rune('0'+days)) + `,"with_driver":true}`
}

func TestCreateBooking(t *testing.T) {
	server, store := testServer(t, false)
	code, out := postBooking(t, server.URL, bookingJSON("innova-reborn", "08123456789", futureDate(3), 2))
	if code != http.StatusCreated {
		t.Fatalf("status = %d (%v)", code, out)
	}
	if len(store.bookings) != 1 || store.bookings[0].Total != 2000000 {
		t.Fatalf("booking tersimpan salah: %+v", store.bookings)
	}
	if out["id"] != "PR-1001" {
		t.Fatalf("id = %v", out["id"])
	}
}

func TestBookingValidation(t *testing.T) {
	server, _ := testServer(t, false)
	cases := map[string]string{
		"mobil tidak ada":      bookingJSON("tidak-ada", "08123456789", futureDate(2), 1),
		"mobil tidak tersedia": bookingJSON("hiace-premio", "08123456789", futureDate(2), 1),
		"telepon invalid":      bookingJSON("agya", "abc", futureDate(2), 1),
		"tanggal lewat":        bookingJSON("agya", "08123456789", futureDate(-2), 1),
		"format tanggal":       bookingJSON("agya", "08123456789", "10-10-2026", 1),
		"durasi nol":           bookingJSON("agya", "08123456789", futureDate(2), 0),
		"durasi 31 hari":       strings.Replace(bookingJSON("agya", "08123456789", futureDate(2), 1), `"duration":1`, `"duration":31`, 1),
		"nama kosong":          strings.Replace(bookingJSON("agya", "08123456789", futureDate(2), 1), `"Sinta"`, `""`, 1),
		"field asing":          strings.Replace(bookingJSON("agya", "08123456789", futureDate(2), 1), `"with_driver"`, `"total":1,"with_driver"`, 1),
	}
	for name, body := range cases {
		code, _ := postBooking(t, server.URL, body)
		if code < 400 || code >= 500 {
			t.Errorf("%s: status = %d, harusnya 4xx", name, code)
		}
	}
}

func TestBookingTotalIgnoresClientInput(t *testing.T) {
	server, store := testServer(t, false)
	// klien mencoba mengirim status/total sendiri: ditolak (field tak dikenal)
	body := `{"customer_name":"A","phone":"08123456789","car_slug":"agya","pickup_location":"x","start_date":"` + futureDate(2) + `","duration":1,"status":"Selesai","total":1}`
	if code, _ := postBooking(t, server.URL, body); code != 400 {
		t.Fatalf("status = %d", code)
	}
	if len(store.bookings) != 0 {
		t.Fatal("booking tidak boleh tersimpan")
	}
}

func TestBookingRateLimit(t *testing.T) {
	server, _ := testServer(t, false)
	var last int
	for i := 0; i < 12; i++ {
		last, _ = postBooking(t, server.URL, bookingJSON("agya", "08123456789", futureDate(2), 1))
	}
	if last != 429 {
		t.Fatalf("permintaan ke-12 = %d, harusnya 429", last)
	}
}

func TestBookingIDsStayUniqueAfterSeed(t *testing.T) {
	server, store := testServer(t, true)
	_, out := postBooking(t, server.URL, bookingJSON("agya", "08123456789", futureDate(2), 1))
	seen := map[string]bool{}
	for _, b := range store.bookings {
		if seen[b.ID] {
			t.Fatalf("ID ganda: %s", b.ID)
		}
		seen[b.ID] = true
	}
	if out["id"] != "PR-1013" {
		t.Fatalf("id = %v", out["id"])
	}
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

func TestAdminEndpointsRequireLogin(t *testing.T) {
	server, _ := testServer(t, true)
	for _, p := range []string{"/api/bookings", "/api/dashboard"} {
		if code := do(t, "GET", server.URL+p, "", ""); code != 401 {
			t.Fatalf("%s tanpa login = %d", p, code)
		}
		if code := do(t, "GET", server.URL+p, "palsu.token", ""); code != 401 {
			t.Fatalf("%s token palsu = %d", p, code)
		}
	}
	if code := do(t, "PATCH", server.URL+"/api/bookings/PR-1001/status", "", `{"status":"Selesai"}`); code != 401 {
		t.Fatalf("patch tanpa login = %d", code)
	}
	if code := do(t, "GET", server.URL+"/api/cars", "", ""); code != 200 {
		t.Fatalf("cars publik = %d", code)
	}
}

func TestExpiredAndTamperedTokens(t *testing.T) {
	a := newAuth("secret-a", demoUsers())
	expired := a.issue(a.users[0], -time.Minute)
	if _, err := a.verify(expired); err == nil {
		t.Fatal("token kedaluwarsa harus ditolak")
	}
	other := newAuth("secret-b", demoUsers()).issue(a.users[0], time.Hour)
	if _, err := a.verify(other); err == nil {
		t.Fatal("token dengan secret lain harus ditolak")
	}
	good := a.issue(a.users[0], time.Hour)
	if _, err := a.verify(good); err != nil {
		t.Fatalf("token valid ditolak: %v", err)
	}
}

func TestLoginFlowAndStatusUpdate(t *testing.T) {
	server, _ := testServer(t, true)
	if code, _ := login(t, server.URL, "admin", "salah"); code != 401 {
		t.Fatalf("password salah = %d", code)
	}
	code, token := login(t, server.URL, "ADMIN", "Presisi#2026")
	if code != 200 || token == "" {
		t.Fatalf("login = %d", code)
	}
	if got := do(t, "GET", server.URL+"/api/bookings", token, ""); got != 200 {
		t.Fatalf("bookings = %d", got)
	}
	if got := do(t, "PATCH", server.URL+"/api/bookings/PR-1001/status", token, `{"status":"Selesai"}`); got != 200 {
		t.Fatalf("patch = %d", got)
	}
	if got := do(t, "PATCH", server.URL+"/api/bookings/PR-1001/status", token, `{"status":"Hack"}`); got != 422 {
		t.Fatalf("status invalid = %d", got)
	}
	if got := do(t, "PATCH", server.URL+"/api/bookings/PR-9999/status", token, `{"status":"Selesai"}`); got != 404 {
		t.Fatalf("id tidak ada = %d", got)
	}
}

func TestLoginRateLimit(t *testing.T) {
	server, _ := testServer(t, false)
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
	server, _ := testServer(t, false)
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
