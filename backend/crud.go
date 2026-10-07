package main

import (
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

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
