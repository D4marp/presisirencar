package main

import (
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"unicode"
	"unicode/utf8"
)

const driverFeePerDay = 250000

var bookingStatuses = map[string]bool{"Menunggu": true, "Dikonfirmasi": true, "Berjalan": true, "Selesai": true, "Dibatalkan": true}

// calcTotal menghitung total sewa: harga/hari x durasi, ditambah driver bila unit lepas kunci.
func calcTotal(car Car, days int, withDriver bool) int {
	total := car.Price * days
	if withDriver && car.RentalType != "Dengan Sopir" {
		total += driverFeePerDay * days
	}
	return total
}

// audit mencatat siapa mengubah apa (tanpa data pribadi pelanggan).
func audit(r *http.Request, action, target string) {
	slog.Info("audit", "user", currentUser(r).Username, "action", action, "target", target)
}

// ---------- Mobil ----------

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

type carInput struct {
	Slug         string   `json:"slug"`
	Name         string   `json:"name"`
	Category     string   `json:"category"`
	Price        int      `json:"price"`
	Seats        int      `json:"seats"`
	Transmission string   `json:"transmission"`
	Fuel         string   `json:"fuel"`
	Image        string   `json:"image"`
	Available    *bool    `json:"available"`
	RentalType   string   `json:"rental_type"`
	Features     []string `json:"features"`
	Badge        string   `json:"badge"`
}

func hasControlChars(s string) bool {
	for _, r := range s {
		if unicode.IsControl(r) {
			return true
		}
	}
	return false
}

func validateCarInput(in *carInput) error {
	in.Slug = strings.ToLower(strings.TrimSpace(in.Slug))
	in.Name = strings.TrimSpace(in.Name)
	in.Category = strings.TrimSpace(in.Category)
	in.Transmission = strings.TrimSpace(in.Transmission)
	in.Fuel = strings.TrimSpace(in.Fuel)
	in.Image = strings.TrimSpace(in.Image)
	in.RentalType = strings.TrimSpace(in.RentalType)
	in.Badge = strings.TrimSpace(in.Badge)

	for _, s := range []string{in.Slug, in.Name, in.Category, in.Transmission, in.Fuel, in.Image, in.Badge} {
		if hasControlChars(s) {
			return errors.New("isian mengandung karakter tidak valid")
		}
	}
	switch {
	case in.Name == "" || utf8.RuneCountInString(in.Name) > 80:
		return errors.New("nama mobil wajib diisi (maks 80 karakter)")
	case in.Category == "" || utf8.RuneCountInString(in.Category) > 40:
		return errors.New("kategori wajib diisi (maks 40 karakter)")
	case in.Price < 10000 || in.Price > 100000000:
		return errors.New("harga per hari harus antara Rp10.000 dan Rp100.000.000")
	case in.Seats < 1 || in.Seats > 60:
		return errors.New("jumlah kursi harus 1 sampai 60")
	case in.Transmission == "" || utf8.RuneCountInString(in.Transmission) > 30:
		return errors.New("transmisi wajib diisi (maks 30 karakter)")
	case in.Fuel == "" || utf8.RuneCountInString(in.Fuel) > 30:
		return errors.New("bahan bakar wajib diisi (maks 30 karakter)")
	case utf8.RuneCountInString(in.Badge) > 30:
		return errors.New("lencana maksimal 30 karakter")
	case in.RentalType != "Lepas Kunci" && in.RentalType != "Dengan Sopir":
		return errors.New(`rental_type harus "Lepas Kunci" atau "Dengan Sopir"`)
	}
	// Gambar: path lokal ("/foto.jpg") atau URL https.
	localImg := strings.HasPrefix(in.Image, "/") && !strings.HasPrefix(in.Image, "//") && !strings.Contains(in.Image, "..")
	if in.Image == "" || len(in.Image) > 300 || !(localImg || strings.HasPrefix(in.Image, "https://")) {
		return errors.New(`gambar harus berupa path seperti "/mobil.jpg" atau URL https`)
	}
	if len(in.Features) > 12 {
		return errors.New("fasilitas maksimal 12 item")
	}
	clean := make([]string, 0, len(in.Features))
	for _, f := range in.Features {
		f = strings.TrimSpace(f)
		if f == "" {
			continue
		}
		if utf8.RuneCountInString(f) > 60 || hasControlChars(f) {
			return errors.New("setiap fasilitas maksimal 60 karakter")
		}
		clean = append(clean, f)
	}
	in.Features = clean
	return nil
}

func (a *API) createCar(w http.ResponseWriter, r *http.Request) {
	var in carInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, 400, "data mobil tidak valid")
		return
	}
	if err := validateCarInput(&in); err != nil {
		writeError(w, 422, err.Error())
		return
	}
	if len(in.Slug) < 2 || len(in.Slug) > 60 || !slugPattern.MatchString(in.Slug) {
		writeError(w, 422, "slug hanya huruf kecil, angka, dan tanda hubung (mis. avanza-veloz)")
		return
	}
	available := true
	if in.Available != nil {
		available = *in.Available
	}

	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	maxID := 0
	for _, c := range a.store.cars {
		if c.Slug == in.Slug {
			writeError(w, 409, "slug sudah dipakai mobil lain")
			return
		}
		if c.ID > maxID {
			maxID = c.ID
		}
	}
	car := Car{ID: maxID + 1, Slug: in.Slug, Name: in.Name, Category: in.Category, Price: in.Price, Seats: in.Seats, Transmission: in.Transmission, Fuel: in.Fuel, Image: in.Image, Available: available, RentalType: in.RentalType, Features: in.Features, Badge: in.Badge}
	a.store.cars = append(a.store.cars, car)
	if err := a.store.saveCarsLocked(); err != nil {
		a.store.cars = a.store.cars[:len(a.store.cars)-1]
		writeError(w, 500, "gagal menyimpan data mobil")
		return
	}
	audit(r, "car.create", car.Slug)
	writeJSON(w, 201, car)
}

func (a *API) updateCar(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	var in carInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, 400, "data mobil tidak valid")
		return
	}
	if err := validateCarInput(&in); err != nil {
		writeError(w, 422, err.Error())
		return
	}
	if in.Slug != "" && in.Slug != slug {
		writeError(w, 422, "slug tidak dapat diubah (dipakai oleh data booking dan URL)")
		return
	}

	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	for i := range a.store.cars {
		if a.store.cars[i].Slug != slug {
			continue
		}
		old := a.store.cars[i]
		updated := Car{ID: old.ID, Slug: old.Slug, Name: in.Name, Category: in.Category, Price: in.Price, Seats: in.Seats, Transmission: in.Transmission, Fuel: in.Fuel, Image: in.Image, Available: old.Available, RentalType: in.RentalType, Features: in.Features, Badge: in.Badge}
		if in.Available != nil {
			updated.Available = *in.Available
		}
		a.store.cars[i] = updated
		if err := a.store.saveCarsLocked(); err != nil {
			a.store.cars[i] = old
			writeError(w, 500, "gagal menyimpan data mobil")
			return
		}
		audit(r, "car.update", slug)
		writeJSON(w, 200, updated)
		return
	}
	writeError(w, 404, "kendaraan tidak ditemukan")
}

func (a *API) setAvailability(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Available *bool `json:"available"`
	}
	if err := decodeJSON(r, &in); err != nil || in.Available == nil {
		writeError(w, 400, `kirim {"available": true|false}`)
		return
	}
	slug := r.PathValue("slug")
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	for i := range a.store.cars {
		if a.store.cars[i].Slug != slug {
			continue
		}
		prev := a.store.cars[i].Available
		a.store.cars[i].Available = *in.Available
		if err := a.store.saveCarsLocked(); err != nil {
			a.store.cars[i].Available = prev
			writeError(w, 500, "gagal menyimpan perubahan")
			return
		}
		audit(r, "car.availability", slug)
		writeJSON(w, 200, a.store.cars[i])
		return
	}
	writeError(w, 404, "kendaraan tidak ditemukan")
}

func (a *API) deleteCar(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	for _, b := range a.store.bookings {
		if b.CarSlug == slug {
			writeError(w, 409, "mobil sudah punya riwayat booking dan tidak bisa dihapus; nonaktifkan saja (available=false)")
			return
		}
	}
	for i := range a.store.cars {
		if a.store.cars[i].Slug != slug {
			continue
		}
		removed := a.store.cars[i]
		a.store.cars = append(a.store.cars[:i:i], a.store.cars[i+1:]...)
		if err := a.store.saveCarsLocked(); err != nil {
			rolled := append([]Car{}, a.store.cars[:i]...)
			rolled = append(rolled, removed)
			a.store.cars = append(rolled, a.store.cars[i:]...)
			writeError(w, 500, "gagal menyimpan perubahan")
			return
		}
		audit(r, "car.delete", slug)
		w.WriteHeader(http.StatusNoContent)
		return
	}
	writeError(w, 404, "kendaraan tidak ditemukan")
}

// ---------- Booking ----------

func (a *API) getBooking(w http.ResponseWriter, r *http.Request) {
	a.store.mu.RLock()
	defer a.store.mu.RUnlock()
	for _, b := range a.store.bookings {
		if b.ID == r.PathValue("id") {
			writeJSON(w, 200, b)
			return
		}
	}
	writeError(w, 404, "pesanan tidak ditemukan")
}

func (a *API) updateBooking(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CustomerName   string `json:"customer_name"`
		Phone          string `json:"phone"`
		Email          string `json:"email"`
		CarSlug        string `json:"car_slug"`
		PickupLocation string `json:"pickup_location"`
		StartDate      string `json:"start_date"`
		Duration       int    `json:"duration"`
		WithDriver     bool   `json:"with_driver"`
		Notes          string `json:"notes"`
		Status         string `json:"status"`
		Total          *int   `json:"total"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, 400, "data booking tidak valid")
		return
	}
	user := currentUser(r)
	if in.Total != nil && user.Role != "admin" {
		writeError(w, 403, "hanya admin yang boleh mengubah total secara manual")
		return
	}

	edited := Booking{CustomerName: strings.TrimSpace(in.CustomerName), Phone: strings.TrimSpace(in.Phone), Email: strings.TrimSpace(in.Email), CarSlug: in.CarSlug, PickupLocation: strings.TrimSpace(in.PickupLocation), StartDate: in.StartDate, Duration: in.Duration, WithDriver: in.WithDriver, Notes: strings.TrimSpace(in.Notes)}
	if err := validateBooking(edited, true); err != nil {
		writeError(w, 422, err.Error())
		return
	}
	if in.Status != "" && !bookingStatuses[in.Status] {
		writeError(w, 422, "status tidak valid")
		return
	}
	if in.Total != nil && (*in.Total < 0 || *in.Total > 1000000000) {
		writeError(w, 422, "total tidak valid")
		return
	}
	car, ok := a.store.carBySlug(edited.CarSlug)
	if !ok {
		writeError(w, 422, "kendaraan tidak ditemukan")
		return
	}

	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	for i := range a.store.bookings {
		if a.store.bookings[i].ID != r.PathValue("id") {
			continue
		}
		old := a.store.bookings[i]
		next := old
		next.CustomerName, next.Phone, next.Email = edited.CustomerName, edited.Phone, edited.Email
		next.CarSlug, next.PickupLocation, next.StartDate = edited.CarSlug, edited.PickupLocation, edited.StartDate
		next.Duration, next.WithDriver, next.Notes = edited.Duration, edited.WithDriver, edited.Notes
		if in.Status != "" {
			next.Status = in.Status
		}
		// Total dihitung ulang hanya bila mobil/durasi/driver berubah, supaya harga historis tetap.
		if next.CarSlug != old.CarSlug || next.Duration != old.Duration || next.WithDriver != old.WithDriver {
			next.Total = calcTotal(car, next.Duration, next.WithDriver)
		}
		if in.Total != nil {
			next.Total = *in.Total
		}
		a.store.bookings[i] = next
		if err := a.store.saveLocked(); err != nil {
			a.store.bookings[i] = old
			writeError(w, 500, "gagal menyimpan perubahan")
			return
		}
		audit(r, "booking.update", next.ID)
		writeJSON(w, 200, next)
		return
	}
	writeError(w, 404, "pesanan tidak ditemukan")
}

func (a *API) deleteBooking(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	for i := range a.store.bookings {
		if a.store.bookings[i].ID != id {
			continue
		}
		removed := a.store.bookings[i]
		rest := append([]Booking{}, a.store.bookings[:i]...)
		rest = append(rest, a.store.bookings[i+1:]...)
		prev := a.store.bookings
		a.store.bookings = rest
		if err := a.store.saveLocked(); err != nil {
			a.store.bookings = prev
			writeError(w, 500, "gagal menghapus pesanan")
			return
		}
		audit(r, "booking.delete", removed.ID)
		w.WriteHeader(http.StatusNoContent)
		return
	}
	writeError(w, 404, "pesanan tidak ditemukan")
}

// ---------- Pelanggan (turunan dari booking, hanya baca) ----------

type Customer struct {
	Name        string `json:"name"`
	Phone       string `json:"phone"`
	Email       string `json:"email,omitempty"`
	Bookings    int    `json:"bookings"`
	TotalSpent  int    `json:"total_spent"`
	LastBooking string `json:"last_booking"`
}

func digitsOnly(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func (a *API) listCustomers(w http.ResponseWriter, r *http.Request) {
	query := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
	a.store.mu.RLock()
	defer a.store.mu.RUnlock()

	byPhone := map[string]*Customer{}
	var order []string
	for _, b := range a.store.bookings { // bookings tersimpan terbaru dulu
		key := digitsOnly(b.Phone)
		c, ok := byPhone[key]
		if !ok {
			c = &Customer{Name: b.CustomerName, Phone: b.Phone, Email: b.Email}
			byPhone[key] = c
			order = append(order, key)
		}
		c.Bookings++
		if b.Status != "Dibatalkan" {
			c.TotalSpent += b.Total
		}
		if b.StartDate > c.LastBooking {
			c.LastBooking = b.StartDate
		}
		if c.Email == "" {
			c.Email = b.Email
		}
	}
	result := make([]Customer, 0, len(order))
	for _, key := range order {
		c := *byPhone[key]
		if query == "" || strings.Contains(strings.ToLower(c.Name), query) || strings.Contains(digitsOnly(c.Phone), digitsOnly(query)) && digitsOnly(query) != "" {
			result = append(result, c)
		}
	}
	sort.SliceStable(result, func(i, j int) bool { return result[i].LastBooking > result[j].LastBooking })
	writeJSON(w, 200, map[string]any{"data": result, "total": len(result)})
}
