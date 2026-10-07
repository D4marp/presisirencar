package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
)

func TestCreateBooking(t *testing.T) {
	t.Setenv("SEED_DEMO", "0")
	store, err := newStore(filepath.Join(t.TempDir(), "bookings.json"))
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer((&API{store: store, auth: newAuth("test-secret")}).routes())
	defer server.Close()

	body := []byte(`{"customer_name":"Sinta","phone":"08123456789","car_slug":"innova-reborn","pickup_location":"Semarang","start_date":"2026-10-10","duration":2,"with_driver":true}`)
	res, err := http.Post(server.URL+"/api/bookings", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("status = %d", res.StatusCode)
	}
	if len(store.bookings) != 1 {
		t.Fatalf("booking = %d", len(store.bookings))
	}
	if store.bookings[0].Total != 2000000 {
		t.Fatalf("total = %d", store.bookings[0].Total)
	}
}

func TestUnknownCar(t *testing.T) {
	t.Setenv("SEED_DEMO", "0")
	store, _ := newStore(filepath.Join(t.TempDir(), "bookings.json"))
	server := httptest.NewServer((&API{store: store, auth: newAuth("test-secret")}).routes())
	defer server.Close()
	body := []byte(`{"customer_name":"Sinta","phone":"0812","car_slug":"tidak-ada","start_date":"2026-10-10","duration":1}`)
	res, err := http.Post(server.URL+"/api/bookings", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d", res.StatusCode)
	}
}

func testServer(t *testing.T) (*httptest.Server, *Store) {
	t.Helper()
	store, err := newStore(filepath.Join(t.TempDir(), "bookings.json"))
	if err != nil {
		t.Fatal(err)
	}
	return httptest.NewServer((&API{store: store, auth: newAuth("test-secret")}).routes()), store
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

func get(t *testing.T, url, token string) int {
	t.Helper()
	req, _ := http.NewRequest("GET", url, nil)
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
	server, _ := testServer(t)
	defer server.Close()
	for _, p := range []string{"/api/bookings", "/api/dashboard"} {
		if code := get(t, server.URL+p, ""); code != 401 {
			t.Fatalf("%s tanpa login = %d", p, code)
		}
		if code := get(t, server.URL+p, "palsu.token"); code != 401 {
			t.Fatalf("%s token palsu = %d", p, code)
		}
	}
	if code := get(t, server.URL+"/api/cars", ""); code != 200 {
		t.Fatalf("cars publik = %d", code)
	}
}

func TestLoginFlow(t *testing.T) {
	server, store := testServer(t)
	defer server.Close()
	if code, _ := login(t, server.URL, "admin", "salah"); code != 401 {
		t.Fatalf("password salah = %d", code)
	}
	code, token := login(t, server.URL, "admin", "Presisi#2026")
	if code != 200 || token == "" {
		t.Fatalf("login = %d", code)
	}
	if got := get(t, server.URL+"/api/bookings", token); got != 200 {
		t.Fatalf("bookings = %d", got)
	}
	if len(store.bookings) == 0 {
		t.Fatal("data demo tidak ter-seed")
	}
}

func TestLoginRateLimit(t *testing.T) {
	server, _ := testServer(t)
	defer server.Close()
	var last int
	for i := 0; i < 7; i++ {
		last, _ = login(t, server.URL, "admin", "salah")
	}
	if last != 429 {
		t.Fatalf("percobaan ke-7 = %d, harusnya 429", last)
	}
}
