package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
	"unicode/utf8"
)

type Car struct {
	ID           int      `json:"id"`
	Slug         string   `json:"slug"`
	Name         string   `json:"name"`
	Category     string   `json:"category"`
	Price        int      `json:"price"`
	Seats        int      `json:"seats"`
	Transmission string   `json:"transmission"`
	Fuel         string   `json:"fuel"`
	Image        string   `json:"image"`
	Available    bool     `json:"available"`
	RentalType   string   `json:"rental_type"`
	Features     []string `json:"features"`
}

type Booking struct {
	ID             string    `json:"id"`
	CustomerName   string    `json:"customer_name"`
	Phone          string    `json:"phone"`
	Email          string    `json:"email,omitempty"`
	CarSlug        string    `json:"car_slug"`
	PickupLocation string    `json:"pickup_location"`
	StartDate      string    `json:"start_date"`
	Duration       int       `json:"duration"`
	WithDriver     bool      `json:"with_driver"`
	Notes          string    `json:"notes,omitempty"`
	Status         string    `json:"status"`
	Total          int       `json:"total"`
	CreatedAt      time.Time `json:"created_at"`
}

type Store struct {
	mu       sync.RWMutex
	cars     []Car
	bookings []Booking
	path     string
}

func newStore(path string) (*Store, error) {
	s := &Store{path: path, cars: seedCars()}
	data, err := os.ReadFile(path)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	if len(data) > 0 {
		if err := json.Unmarshal(data, &s.bookings); err != nil {
			return nil, fmt.Errorf("membaca data booking: %w", err)
		}
	}
	if len(s.bookings) == 0 && env("SEED_DEMO", "1") == "1" {
		s.bookings = seedBookings(s.cars)
		if err := s.saveLocked(); err != nil {
			return nil, err
		}
	}
	return s, nil
}

func seedCars() []Car {
	return []Car{
		{1, "agya", "Toyota Agya", "City Car", 350000, 5, "MT / AT", "Bensin", "/fleet-suv.jpg", true, "Lepas Kunci", []string{"Irit BBM", "Audio Bluetooth", "Compact", "USB charger"}},
		{2, "brio-satya", "Honda Brio", "City Car", 400000, 5, "Automatic", "Bensin", "/fleet-suv.jpg", true, "Lepas Kunci", []string{"Irit BBM", "Audio Bluetooth", "Kamera parkir", "Compact"}},
		{3, "avanza-xenia", "Avanza / Xenia", "Family MPV", 450000, 7, "Automatic", "Bensin", "/fleet-mpv.jpg", true, "Lepas Kunci", []string{"AC dingin", "Audio Bluetooth", "Bagasi luas", "USB charger"}},
		{4, "mobilio", "Honda Mobilio", "Family MPV", 450000, 7, "Automatic", "Bensin", "/fleet-mpv.jpg", true, "Lepas Kunci", []string{"AC double blower", "Kabin lega", "Audio Bluetooth", "Bagasi fleksibel"}},
		{5, "xpander", "Mitsubishi Xpander", "Family MPV", 550000, 7, "Automatic", "Bensin", "/fleet-mpv.jpg", true, "Lepas Kunci", []string{"AC double blower", "Kabin lega", "Kamera parkir", "USB charger"}},
		{6, "innova-reborn", "Innova Reborn", "Business MPV", 750000, 7, "Automatic", "Diesel", "/hero-presisi.jpg", true, "Lepas Kunci", []string{"Captain seat", "AC double blower", "Audio Bluetooth", "Kabin premium"}},
		{7, "innova-zenix", "Innova Zenix", "Business MPV", 950000, 7, "Automatic", "Hybrid", "/hero-presisi.jpg", true, "Lepas Kunci", []string{"Hybrid", "Captain seat", "Toyota Safety Sense", "Kabin premium"}},
		{8, "fortuner-pajero", "Fortuner / Pajero", "Premium SUV", 1250000, 7, "Automatic", "Diesel", "/fleet-suv.jpg", true, "Lepas Kunci", []string{"Leather seat", "Cruise control", "Kamera parkir", "Kabin premium"}},
		{9, "air-ev", "Wuling Air EV", "Mobil Listrik", 500000, 4, "Automatic", "Listrik", "/fleet-suv.jpg", true, "Lepas Kunci", []string{"Kendaraan listrik", "Voice command", "Compact", "Biaya energi hemat"}},
		{10, "ioniq-5", "Hyundai Ioniq 5", "Mobil Listrik", 1400000, 5, "Automatic", "Listrik", "/fleet-suv.jpg", true, "Lepas Kunci", []string{"Full electric", "Fast charging", "ADAS", "Kabin futuristik"}},
		{11, "hiace-commuter", "Hiace Commuter", "Minibus", 1250000, 16, "Manual", "Diesel", "/hero-presisi.jpg", true, "Dengan Sopir", []string{"16 kursi", "AC setiap baris", "Bagasi luas", "Termasuk driver"}},
		{12, "hiace-premio", "Hiace Premio", "Minibus", 1450000, 14, "Manual", "Diesel", "/hero-presisi.jpg", false, "Dengan Sopir", []string{"14 kursi", "AC setiap baris", "Bagasi luas", "Termasuk driver"}},
		{13, "alphard", "Toyota Alphard", "Executive", 2800000, 6, "Automatic", "Bensin", "/hero-presisi.jpg", true, "Dengan Sopir", []string{"Captain seat", "Power door", "Entertainment", "Kabin VIP"}},
	}
}

func (s *Store) saveLocked() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(s.bookings, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, data, 0600); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

func (s *Store) carBySlug(slug string) (Car, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, car := range s.cars {
		if car.Slug == slug {
			return car, true
		}
	}
	return Car{}, false
}

func (s *Store) createBooking(input Booking) (Booking, error) {
	car, ok := s.carBySlug(input.CarSlug)
	if !ok {
		return Booking{}, errors.New("kendaraan tidak ditemukan")
	}
	if !car.Available {
		return Booking{}, errors.New("kendaraan sedang tidak tersedia")
	}
	input.CustomerName = strings.TrimSpace(input.CustomerName)
	input.Phone = strings.TrimSpace(input.Phone)
	input.Email = strings.TrimSpace(input.Email)
	input.PickupLocation = strings.TrimSpace(input.PickupLocation)
	input.Notes = strings.TrimSpace(input.Notes)
	if err := validateBooking(input); err != nil {
		return Booking{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	input.ID = fmt.Sprintf("PR-%04d", s.nextNumberLocked())
	input.Status = "Menunggu"
	input.Total = car.Price * input.Duration
	if input.WithDriver && car.RentalType != "Dengan Sopir" {
		input.Total += 250000 * input.Duration
	}
	input.CreatedAt = time.Now()
	s.bookings = append([]Booking{input}, s.bookings...)
	if err := s.saveLocked(); err != nil {
		s.bookings = s.bookings[1:]
		return Booking{}, err
	}
	return input, nil
}

var wib = func() *time.Location {
	if loc, err := time.LoadLocation("Asia/Jakarta"); err == nil {
		return loc
	}
	return time.FixedZone("WIB", 7*3600)
}()

var phonePattern = regexp.MustCompile(`^\+?[0-9][0-9 \-]{6,18}[0-9]$`)

func validateBooking(b Booking) error {
	switch {
	case b.CustomerName == "" || b.Phone == "" || b.StartDate == "" || b.PickupLocation == "":
		return errors.New("nama, telepon, lokasi, tanggal, dan durasi wajib diisi")
	case utf8.RuneCountInString(b.CustomerName) > 100 || utf8.RuneCountInString(b.PickupLocation) > 200 || utf8.RuneCountInString(b.Notes) > 500 || len(b.Email) > 120:
		return errors.New("isian terlalu panjang")
	case !phonePattern.MatchString(b.Phone):
		return errors.New("nomor telepon tidak valid")
	case b.Email != "" && !strings.Contains(b.Email, "@"):
		return errors.New("email tidak valid")
	case b.Duration < 1 || b.Duration > 30:
		return errors.New("durasi sewa harus 1 sampai 30 hari")
	}
	start, err := time.ParseInLocation("2006-01-02", b.StartDate, wib)
	if err != nil {
		return errors.New("format tanggal harus YYYY-MM-DD")
	}
	today := time.Now().In(wib).Truncate(24 * time.Hour)
	y, mo, d := time.Now().In(wib).Date()
	today = time.Date(y, mo, d, 0, 0, 0, 0, wib)
	if start.Before(today) {
		return errors.New("tanggal mulai tidak boleh sudah lewat")
	}
	return nil
}

// nextNumberLocked mengembalikan nomor pesanan berikutnya (maks + 1).
func (s *Store) nextNumberLocked() int {
	highest := 1000
	for _, b := range s.bookings {
		var n int
		if _, err := fmt.Sscanf(b.ID, "PR-%d", &n); err == nil && n > highest {
			highest = n
		}
	}
	return highest + 1
}

type API struct {
	store    *Store
	auth     *Auth
	bookings *limiter
}

func newAPI(store *Store, auth *Auth) *API {
	return &API{store: store, auth: auth, bookings: newLimiter(10, 10*time.Minute)}
}

func (a *API) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, 200, map[string]string{"status": "ok", "service": "presisi-rencar-api"})
	})
	mux.HandleFunc("GET /api/cars", a.listCars)
	mux.HandleFunc("GET /api/cars/{slug}", a.getCar)
	mux.HandleFunc("POST /api/auth/login", a.auth.login)
	mux.HandleFunc("GET /api/auth/me", a.auth.me)
	mux.HandleFunc("POST /api/bookings", a.createBooking)
	mux.HandleFunc("GET /api/bookings", a.auth.require(a.listBookings))
	mux.HandleFunc("PATCH /api/bookings/{id}/status", a.auth.require(a.updateStatus))
	mux.HandleFunc("GET /api/dashboard", a.auth.require(a.dashboard))
	return withMiddleware(mux)
}

func (a *API) listCars(w http.ResponseWriter, r *http.Request) {
	category := strings.ToLower(r.URL.Query().Get("category"))
	a.store.mu.RLock()
	defer a.store.mu.RUnlock()
	result := make([]Car, 0, len(a.store.cars))
	for _, car := range a.store.cars {
		if category == "" || strings.Contains(strings.ToLower(car.Category), category) {
			result = append(result, car)
		}
	}
	writeJSON(w, 200, map[string]any{"data": result, "total": len(result)})
}

func (a *API) getCar(w http.ResponseWriter, r *http.Request) {
	car, ok := a.store.carBySlug(r.PathValue("slug"))
	if !ok {
		writeError(w, 404, "kendaraan tidak ditemukan")
		return
	}
	writeJSON(w, 200, car)
}

func (a *API) listBookings(w http.ResponseWriter, _ *http.Request) {
	a.store.mu.RLock()
	defer a.store.mu.RUnlock()
	writeJSON(w, 200, map[string]any{"data": a.store.bookings, "total": len(a.store.bookings)})
}

func (a *API) createBooking(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if a.bookings.blocked(ip) {
		writeError(w, 429, "terlalu banyak permintaan booking, coba lagi nanti atau hubungi kami via WhatsApp")
		return
	}
	a.bookings.record(ip)
	// Hanya field yang boleh diisi pelanggan; id, status, dan total dihitung server.
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
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, 400, "data booking tidak valid")
		return
	}
	booking, err := a.store.createBooking(Booking{CustomerName: in.CustomerName, Phone: in.Phone, Email: in.Email, CarSlug: in.CarSlug, PickupLocation: in.PickupLocation, StartDate: in.StartDate, Duration: in.Duration, WithDriver: in.WithDriver, Notes: in.Notes})
	if err != nil {
		writeError(w, 422, err.Error())
		return
	}
	writeJSON(w, 201, booking)
}

func (a *API) updateStatus(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Status string `json:"status"`
	}
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, 400, err.Error())
		return
	}
	allowed := map[string]bool{"Menunggu": true, "Dikonfirmasi": true, "Berjalan": true, "Selesai": true, "Dibatalkan": true}
	if !allowed[input.Status] {
		writeError(w, 422, "status tidak valid")
		return
	}
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	for i := range a.store.bookings {
		if a.store.bookings[i].ID == r.PathValue("id") {
			a.store.bookings[i].Status = input.Status
			if err := a.store.saveLocked(); err != nil {
				writeError(w, 500, "gagal menyimpan perubahan")
				return
			}
			writeJSON(w, 200, a.store.bookings[i])
			return
		}
	}
	writeError(w, 404, "pesanan tidak ditemukan")
}

func (a *API) dashboard(w http.ResponseWriter, _ *http.Request) {
	a.store.mu.RLock()
	defer a.store.mu.RUnlock()
	revenue, active := 0, 0
	byStatus := map[string]int{}
	customers := map[string]bool{}
	for _, booking := range a.store.bookings {
		byStatus[booking.Status]++
		customers[booking.Phone] = true
		if booking.Status != "Dibatalkan" {
			revenue += booking.Total
		}
		if booking.Status == "Dikonfirmasi" || booking.Status == "Berjalan" {
			active++
		}
	}
	available := 0
	for _, car := range a.store.cars {
		if car.Available {
			available++
		}
	}
	writeJSON(w, 200, map[string]any{"bookings": len(a.store.bookings), "revenue": revenue, "active_bookings": active, "fleet_total": len(a.store.cars), "fleet_available": available, "customers": len(customers), "by_status": byStatus})
}

func decodeJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	decoder := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	return decoder.Decode(dst)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func withMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if origin := r.Header.Get("Origin"); allowedOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Cache-Control", "no-store")
		start := time.Now()
		next.ServeHTTP(w, r)
		slog.Info("request", "method", r.Method, "path", r.URL.Path, "duration_ms", time.Since(start).Milliseconds())
	})
}

// CORS_ORIGIN dapat berisi beberapa origin dipisah koma.
func allowedOrigin(origin string) bool {
	if origin == "" {
		return false
	}
	list := env("CORS_ORIGIN", "http://localhost:3000,http://127.0.0.1:3000")
	for _, item := range strings.Split(list, ",") {
		if strings.TrimSpace(item) == origin {
			return true
		}
	}
	return false
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func main() {
	prod := env("APP_ENV", "development") == "production"
	users := demoUsers()
	if prod {
		secret, pass := os.Getenv("AUTH_SECRET"), os.Getenv("ADMIN_PASSWORD")
		if len(secret) < 32 || len(pass) < 10 {
			slog.Error("mode production: AUTH_SECRET (min 32 karakter) dan ADMIN_PASSWORD (min 10 karakter) wajib diatur")
			os.Exit(1)
		}
		users = adminUsers()
		if os.Getenv("SEED_DEMO") == "" {
			os.Setenv("SEED_DEMO", "0")
		}
	}
	store, err := newStore(env("DATA_FILE", "data/bookings.json"))
	if err != nil {
		slog.Error("gagal memulai penyimpanan", "error", err)
		os.Exit(1)
	}
	port := env("PORT", "8080")
	if _, err := strconv.Atoi(port); err != nil {
		slog.Error("PORT tidak valid")
		os.Exit(1)
	}
	// LISTEN_ADDR=127.0.0.1:8080 di VPS agar API hanya bisa dicapai lewat reverse proxy.
	server := &http.Server{Addr: env("LISTEN_ADDR", ":"+port), Handler: newAPI(store, newAuth(os.Getenv("AUTH_SECRET"), users)).routes(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second}

	go func() {
		slog.Info("PRESISI Rencar API berjalan", "url", "http://localhost:"+port)
		if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server berhenti", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}
