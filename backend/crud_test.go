package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func call(t *testing.T, method, url, token, body string) (int, map[string]any) {
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
	var out map[string]any
	_ = json.NewDecoder(res.Body).Decode(&out)
	return res.StatusCode, out
}

func tokens(t *testing.T, url string) (admin, staff string) {
	t.Helper()
	_, admin = login(t, url, "admin", "Presisi#2026")
	_, staff = login(t, url, "staff", "Staff#2026")
	if admin == "" || staff == "" {
		t.Fatal("login demo gagal")
	}
	return
}

const newCar = `{"slug":"avanza-veloz","name":"Avanza Veloz","category":"Family MPV","price":500000,"seats":7,"transmission":"Automatic","fuel":"Bensin","image":"/fleet-mpv.jpg","rental_type":"Lepas Kunci","features":["AC dingin"," ","Audio"]}`

func TestCarCRUDAndRoles(t *testing.T) {
	server, _ := testServer(t)
	admin, staff := tokens(t, server.URL)
	cars := server.URL + "/api/cars"

	if code, _ := call(t, "POST", cars, "", newCar); code != 401 {
		t.Fatalf("tanpa login = %d", code)
	}
	if code, _ := call(t, "POST", cars, staff, newCar); code != 403 {
		t.Fatalf("staf membuat mobil = %d, harusnya 403", code)
	}

	code, out := call(t, "POST", cars, admin, newCar)
	if code != 201 || out["slug"] != "avanza-veloz" || out["id"].(float64) != 14 || out["available"] != true {
		t.Fatalf("create = %d %v", code, out)
	}
	if feats := out["features"].([]any); len(feats) != 2 {
		t.Fatalf("fasilitas kosong harus dibuang: %v", feats)
	}
	if code, _ := call(t, "POST", cars, admin, newCar); code != 409 {
		t.Fatalf("slug ganda = %d", code)
	}

	// validasi
	bad := map[string]string{
		"slug jelek":   strings.Replace(newCar, `"avanza-veloz"`, `"Avanza Veloz!"`, 1),
		"harga rendah": strings.Replace(newCar, `"price":500000`, `"price":500`, 1),
		"kursi nol":    strings.Replace(newCar, `"seats":7`, `"seats":0`, 1),
		"gambar luar":  strings.Replace(newCar, `"/fleet-mpv.jpg"`, `"http://x.com/a.jpg"`, 1),
		"gambar naik":  strings.Replace(newCar, `"/fleet-mpv.jpg"`, `"/../etc/passwd"`, 1),
		"tipe sewa":    strings.Replace(newCar, `"Lepas Kunci"`, `"Gratis"`, 1),
		"field asing":  strings.Replace(newCar, `"seats":7`, `"seats":7,"id":99`, 1),
		"nama kosong":  strings.Replace(newCar, `"Avanza Veloz"`, `" "`, 1),
	}
	for name, body := range bad {
		b := strings.Replace(body, `"avanza-veloz"`, `"mobil-baru-uji"`, 1)
		if name == "slug jelek" {
			b = body
		}
		if code, _ := call(t, "POST", cars, admin, b); code < 400 || code >= 500 {
			t.Errorf("%s: status %d, harusnya 4xx", name, code)
		}
	}

	// read
	if code, out := call(t, "GET", cars+"/avanza-veloz", "", ""); code != 200 || out["name"] != "Avanza Veloz" {
		t.Fatalf("get = %d %v", code, out)
	}

	// update: harga berubah, slug tak boleh berubah
	upd := strings.Replace(newCar, `"price":500000`, `"price":525000`, 1)
	if code, out := call(t, "PUT", cars+"/avanza-veloz", admin, upd); code != 200 || out["price"].(float64) != 525000 {
		t.Fatalf("update = %d %v", code, out)
	}
	if code, _ := call(t, "PUT", cars+"/avanza-veloz", admin, strings.Replace(upd, `"avanza-veloz"`, `"lain"`, 1)); code != 422 {
		t.Fatalf("ganti slug = %d", code)
	}
	if code, _ := call(t, "PUT", cars+"/tidak-ada", admin, strings.Replace(upd, `"avanza-veloz"`, `"tidak-ada"`, 1)); code != 404 {
		t.Fatalf("update tidak ada = %d", code)
	}
	if code, _ := call(t, "PUT", cars+"/avanza-veloz", staff, upd); code != 403 {
		t.Fatalf("staf update = %d", code)
	}

	// ketersediaan boleh oleh staf
	if code, out := call(t, "PATCH", cars+"/avanza-veloz/availability", staff, `{"available":false}`); code != 200 || out["available"] != false {
		t.Fatalf("availability = %d %v", code, out)
	}
	if code, _ := call(t, "PATCH", cars+"/avanza-veloz/availability", staff, `{}`); code != 400 {
		t.Fatalf("availability kosong = %d", code)
	}

	// hapus: staf tidak boleh, admin boleh
	if code, _ := call(t, "DELETE", cars+"/avanza-veloz", staff, ""); code != 403 {
		t.Fatalf("staf hapus = %d", code)
	}
	if code, _ := call(t, "DELETE", cars+"/avanza-veloz", admin, ""); code != 204 {
		t.Fatalf("hapus = %d", code)
	}
	if code, _ := call(t, "GET", cars+"/avanza-veloz", "", ""); code != 404 {
		t.Fatalf("setelah hapus = %d", code)
	}
	if code, _ := call(t, "DELETE", cars+"/avanza-veloz", admin, ""); code != 404 {
		t.Fatalf("hapus dua kali = %d", code)
	}
}

func TestCarsPersistAcrossRestart(t *testing.T) {
	dir := t.TempDir()
	store, err := newStore(dir)
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(newAPI(store, newAuth("s", demoUsers(), dir)).routes())
	_, admin := login(t, server.URL, "admin", "Presisi#2026")
	if code, _ := call(t, "POST", server.URL+"/api/cars", admin, newCar); code != 201 {
		t.Fatalf("create = %d", code)
	}
	server.Close()

	reloaded, err := newStore(dir) // "restart"
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := reloaded.carBySlug("avanza-veloz"); !ok {
		t.Fatal("mobil baru hilang setelah restart")
	}
	if len(reloaded.cars) != 14 {
		t.Fatalf("jumlah mobil = %d, harusnya 14", len(reloaded.cars))
	}
}
