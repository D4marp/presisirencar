package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
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
	server, _ := testServer(t, true)
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
	// mobil nonaktif tidak bisa dibooking
	if code, _ := postBooking(t, server.URL, bookingJSON("avanza-veloz", "08123456789", futureDate(2), 1)); code != 422 {
		t.Fatalf("booking mobil nonaktif = %d", code)
	}

	// hapus: mobil berriwayat booking ditolak, mobil baru boleh
	if code, _ := call(t, "DELETE", cars+"/agya", admin, ""); code != 409 {
		t.Fatalf("hapus mobil berriwayat = %d", code)
	}
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
	t.Setenv("SEED_DEMO", "0")
	dir := t.TempDir()
	path := filepath.Join(dir, "bookings.json")
	store, err := newStore(path)
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(newAPI(store, newAuth("s", demoUsers())).routes())
	_, admin := login(t, server.URL, "admin", "Presisi#2026")
	if code, _ := call(t, "POST", server.URL+"/api/cars", admin, newCar); code != 201 {
		t.Fatalf("create = %d", code)
	}
	server.Close()

	reloaded, err := newStore(path) // "restart"
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

func TestBookingCRUD(t *testing.T) {
	server, _ := testServer(t, true)
	admin, staff := tokens(t, server.URL)
	b := server.URL + "/api/bookings"

	if code, _ := call(t, "GET", b+"/PR-1012", "", ""); code != 401 {
		t.Fatalf("get tanpa login = %d", code)
	}
	code, out := call(t, "GET", b+"/PR-1012", staff, "")
	if code != 200 || out["total"].(float64) != 3000000 { // 750rb*3 + driver 250rb*3
		t.Fatalf("get = %d %v", code, out)
	}
	if code, _ := call(t, "GET", b+"/PR-9999", staff, ""); code != 404 {
		t.Fatalf("get tidak ada = %d", code)
	}

	edit := func(extra string) string {
		return `{"customer_name":"Aditya P.","phone":"081234560001","car_slug":"innova-reborn","pickup_location":"Hotel Padma","start_date":"` + futureDate(1) + `","duration":2,"with_driver":false` + extra + `}`
	}
	// staf mengedit: durasi 3->2 dan tanpa driver => total dihitung ulang 1.500.000
	code, out = call(t, "PUT", b+"/PR-1012", staff, edit(`,"status":"Dikonfirmasi"`))
	if code != 200 || out["total"].(float64) != 1500000 || out["customer_name"] != "Aditya P." || out["status"] != "Dikonfirmasi" {
		t.Fatalf("edit = %d %v", code, out)
	}
	// total tidak berubah bila hanya data kontak yang diubah (harga historis tetap)
	code, out = call(t, "PUT", b+"/PR-1012", staff, strings.Replace(edit(``), "Aditya P.", "Aditya Pratama", 1))
	if code != 200 || out["total"].(float64) != 1500000 {
		t.Fatalf("edit kontak = %d %v", code, out)
	}
	// override total: hanya admin
	if code, _ := call(t, "PUT", b+"/PR-1012", staff, edit(`,"total":1000000`)); code != 403 {
		t.Fatalf("staf override total = %d", code)
	}
	if code, out := call(t, "PUT", b+"/PR-1012", admin, edit(`,"total":1000000`)); code != 200 || out["total"].(float64) != 1000000 {
		t.Fatalf("admin override total = %d %v", code, out)
	}
	// validasi
	if code, _ := call(t, "PUT", b+"/PR-1012", admin, edit(`,"status":"Hack"`)); code != 422 {
		t.Fatalf("status salah = %d", code)
	}
	if code, _ := call(t, "PUT", b+"/PR-1012", admin, strings.Replace(edit(``), "innova-reborn", "tidak-ada", 1)); code != 422 {
		t.Fatalf("mobil tidak ada = %d", code)
	}
	if code, _ := call(t, "PUT", b+"/PR-1012", admin, strings.Replace(edit(``), "081234560001", "abc", 1)); code != 422 {
		t.Fatalf("telepon salah = %d", code)
	}
	if code, _ := call(t, "PUT", b+"/PR-9999", admin, edit(``)); code != 404 {
		t.Fatalf("edit tidak ada = %d", code)
	}

	// hapus: staf tidak boleh, admin boleh
	if code, _ := call(t, "DELETE", b+"/PR-1012", staff, ""); code != 403 {
		t.Fatalf("staf hapus = %d", code)
	}
	if code, _ := call(t, "DELETE", b+"/PR-1012", admin, ""); code != 204 {
		t.Fatalf("hapus = %d", code)
	}
	if code, _ := call(t, "GET", b+"/PR-1012", admin, ""); code != 404 {
		t.Fatalf("setelah hapus = %d", code)
	}
	// nomor tidak dipakai ulang secara salah: booking baru tetap unik
	_, created := postBooking(t, server.URL, bookingJSON("agya", "08123456789", futureDate(2), 1))
	if created["id"] == "PR-1012" {
		t.Fatalf("ID bentrok dengan data seed: %v", created["id"])
	}
}

func TestCustomersAggregate(t *testing.T) {
	server, _ := testServer(t, false)
	_, staff := login(t, server.URL, "staff", "Staff#2026")
	for i := 0; i < 2; i++ { // pelanggan sama (nomor sama, format beda) memesan 2x
		phone := "081234567890"
		if i == 1 {
			phone = "0812-3456-7890"
		}
		if code, _ := postBooking(t, server.URL, bookingJSON("agya", phone, futureDate(2+i), 1)); code != 201 {
			t.Fatalf("booking %d gagal: %d", i, code)
		}
	}
	postBooking(t, server.URL, strings.Replace(bookingJSON("xpander", "08991112222", futureDate(5), 1), "Sinta", "Budi", 1))

	code, out := call(t, "GET", server.URL+"/api/customers", staff, "")
	if code != 200 || out["total"].(float64) != 2 {
		t.Fatalf("customers = %d %v", code, out)
	}
	_, filtered := call(t, "GET", server.URL+"/api/customers?q=budi", staff, "")
	if filtered["total"].(float64) != 1 {
		t.Fatalf("filter nama = %v", filtered["total"])
	}
	if code, _ := call(t, "GET", server.URL+"/api/customers", "", ""); code != 401 {
		t.Fatalf("customers tanpa login = %d", code)
	}
}
