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
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
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
	Badge        string   `json:"badge,omitempty"`
}

// Store menyimpan daftar mobil (file JSON) dan foto unggahan dalam satu folder data.
type Store struct {
	mu       sync.RWMutex
	cars     []Car
	dir      string
	carsPath string
}

func newStore(dir string) (*Store, error) {
	s := &Store{dir: dir, carsPath: env("CARS_FILE", filepath.Join(dir, "cars.json"))}
	if err := s.loadCars(); err != nil {
		return nil, err
	}
	return s, nil
}

func seedCars() []Car {
	return []Car{
		{1, "agya", "Toyota Agya", "City Car", 350000, 5, "MT / AT", "Bensin", "/fleet-suv.jpg", true, "Lepas Kunci", []string{"Irit BBM", "Audio Bluetooth", "Compact", "USB charger"}, "Hemat"},
		{2, "brio-satya", "Honda Brio", "City Car", 400000, 5, "Automatic", "Bensin", "/fleet-suv.jpg", true, "Lepas Kunci", []string{"Irit BBM", "Audio Bluetooth", "Kamera parkir", "Compact"}, "Paling diminati"},
		{3, "avanza-xenia", "Avanza / Xenia", "Family MPV", 450000, 7, "Automatic", "Bensin", "/fleet-mpv.jpg", true, "Lepas Kunci", []string{"AC dingin", "Audio Bluetooth", "Bagasi luas", "USB charger"}, "Paling diminati"},
		{4, "mobilio", "Honda Mobilio", "Family MPV", 450000, 7, "Automatic", "Bensin", "/fleet-mpv.jpg", true, "Lepas Kunci", []string{"AC double blower", "Kabin lega", "Audio Bluetooth", "Bagasi fleksibel"}, ""},
		{5, "xpander", "Mitsubishi Xpander", "Family MPV", 550000, 7, "Automatic", "Bensin", "/fleet-mpv.jpg", true, "Lepas Kunci", []string{"AC double blower", "Kabin lega", "Kamera parkir", "USB charger"}, "Favorit keluarga"},
		{6, "innova-reborn", "Innova Reborn", "Business MPV", 750000, 7, "Automatic", "Diesel", "/hero-presisi.jpg", true, "Lepas Kunci", []string{"Captain seat", "AC double blower", "Audio Bluetooth", "Kabin premium"}, "Best value"},
		{7, "innova-zenix", "Innova Zenix", "Business MPV", 950000, 7, "Automatic", "Hybrid", "/hero-presisi.jpg", true, "Lepas Kunci", []string{"Hybrid", "Captain seat", "Toyota Safety Sense", "Kabin premium"}, "Hybrid"},
		{8, "fortuner-pajero", "Fortuner / Pajero", "Premium SUV", 1250000, 7, "Automatic", "Diesel", "/fleet-suv.jpg", true, "Lepas Kunci", []string{"Leather seat", "Cruise control", "Kamera parkir", "Kabin premium"}, "Premium"},
		{9, "air-ev", "Wuling Air EV", "Mobil Listrik", 500000, 4, "Automatic", "Listrik", "/fleet-suv.jpg", true, "Lepas Kunci", []string{"Kendaraan listrik", "Voice command", "Compact", "Biaya energi hemat"}, "Electric"},
		{10, "ioniq-5", "Hyundai Ioniq 5", "Mobil Listrik", 1400000, 5, "Automatic", "Listrik", "/fleet-suv.jpg", true, "Lepas Kunci", []string{"Full electric", "Fast charging", "ADAS", "Kabin futuristik"}, ""},
		{11, "hiace-commuter", "Hiace Commuter", "Minibus", 1250000, 16, "Manual", "Diesel", "/hero-presisi.jpg", true, "Dengan Sopir", []string{"16 kursi", "AC setiap baris", "Bagasi luas", "Termasuk driver"}, "Rombongan"},
		{12, "hiace-premio", "Hiace Premio", "Minibus", 1450000, 14, "Manual", "Diesel", "/hero-presisi.jpg", false, "Dengan Sopir", []string{"14 kursi", "AC setiap baris", "Bagasi luas", "Termasuk driver"}, ""},
		{13, "alphard", "Toyota Alphard", "Executive", 2800000, 6, "Automatic", "Bensin", "/hero-presisi.jpg", true, "Dengan Sopir", []string{"Captain seat", "Power door", "Entertainment", "Kabin VIP"}, "Executive"},
	}
}

// writeFileAtomic menulis JSON ke file sementara lalu me-rename, agar tidak pernah setengah tertulis.
func writeFileAtomic(path string, value any) error {
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0600); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (s *Store) saveCarsLocked() error { return writeFileAtomic(s.carsPath, s.cars) }

// loadCars membaca daftar mobil dari file; bila belum ada, diisi dari data awal (seed) lalu disimpan.
func (s *Store) loadCars() error {
	data, err := os.ReadFile(s.carsPath)
	switch {
	case err == nil && len(data) > 0:
		if err := json.Unmarshal(data, &s.cars); err != nil {
			return fmt.Errorf("membaca data mobil: %w", err)
		}
		return nil
	case err != nil && !errors.Is(err, os.ErrNotExist):
		return err
	}
	s.cars = seedCars()
	return s.saveCarsLocked()
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

type API struct {
	store *Store
	auth  *Auth
}

func newAPI(store *Store, auth *Auth) *API { return &API{store: store, auth: auth} }

func (a *API) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, 200, map[string]string{"status": "ok", "service": "presisi-rencar-api"})
	})
	mux.HandleFunc("POST /api/auth/login", a.auth.login)
	mux.HandleFunc("GET /api/auth/me", a.auth.me)
	mux.HandleFunc("POST /api/auth/register", a.auth.register) // wajib kode undangan

	// Kelola pengguna & undangan (admin)
	mux.HandleFunc("GET /api/users", a.auth.requireRole("admin", a.auth.listUsers))
	mux.HandleFunc("DELETE /api/users/{username}", a.auth.requireRole("admin", a.auth.deleteUser))
	mux.HandleFunc("GET /api/invites", a.auth.requireRole("admin", a.auth.listInvites))
	mux.HandleFunc("POST /api/invites", a.auth.requireRole("admin", a.auth.createInvite))
	mux.HandleFunc("DELETE /api/invites/{id}", a.auth.requireRole("admin", a.auth.revokeInvite))

	// Publik
	mux.HandleFunc("GET /api/cars", a.listCars)
	mux.HandleFunc("GET /api/cars/{slug}", a.getCar)
	mux.HandleFunc("GET /api/uploads/{name}", a.serveUpload)

	// Dashboard
	mux.HandleFunc("POST /api/cars", a.auth.requireRole("admin", a.createCar))
	mux.HandleFunc("PUT /api/cars/{slug}", a.auth.requireRole("admin", a.updateCar))
	mux.HandleFunc("PATCH /api/cars/{slug}/availability", a.auth.require(a.setAvailability))
	mux.HandleFunc("DELETE /api/cars/{slug}", a.auth.requireRole("admin", a.deleteCar))
	mux.HandleFunc("POST /api/uploads", a.auth.requireRole("admin", a.upload))
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
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
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

// weakSecret menolak secret yang pendek atau masih berupa nilai contoh dari repo/dokumentasi.
func weakSecret(s string) bool {
	if len(s) < 32 {
		return true
	}
	lower := strings.ToLower(s)
	for _, bad := range []string{"ganti", "change-me", "changeme", "contoh", "example", "secret", "password", "presisi"} {
		if strings.Contains(lower, bad) {
			return true
		}
	}
	return false
}

// weakPassword menolak password admin yang pendek, mudah ditebak, atau nilai contoh.
func weakPassword(p, username string) bool {
	if len(p) < 12 {
		return true
	}
	lower := strings.ToLower(p)
	if lower == strings.ToLower(username) {
		return true
	}
	for _, bad := range []string{"ganti", "contoh", "example", "presisi", "rentcar", "rencar", "admin", "password", "12345", "qwerty", "semarang"} {
		if strings.Contains(lower, bad) {
			return true
		}
	}
	return false
}

// dataDir: DATA_DIR, atau (kompatibel dengan konfigurasi lama) folder dari DATA_FILE.
func dataDir() string {
	if dir := os.Getenv("DATA_DIR"); dir != "" {
		return dir
	}
	if file := os.Getenv("DATA_FILE"); file != "" {
		return filepath.Dir(file)
	}
	return "data"
}

func main() {
	prod := env("APP_ENV", "development") == "production"
	users := demoUsers()
	if prod {
		secret, pass := os.Getenv("AUTH_SECRET"), os.Getenv("ADMIN_PASSWORD")
		if weakSecret(secret) {
			slog.Error("mode production: AUTH_SECRET wajib acak, minimal 32 karakter, dan bukan nilai contoh (buat dengan: openssl rand -hex 32)")
			os.Exit(1)
		}
		if weakPassword(pass, env("ADMIN_USERNAME", "admin")) {
			slog.Error("mode production: ADMIN_PASSWORD terlalu lemah (minimal 12 karakter, bukan nama brand/kata umum/nilai contoh)")
			os.Exit(1)
		}
		users = adminUsers()
	}
	store, err := newStore(dataDir())
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
	// Batas waktu 30 detik cukup untuk unggah foto 4 MB di koneksi lambat.
	server := &http.Server{Addr: env("LISTEN_ADDR", ":"+port), Handler: newAPI(store, newAuth(os.Getenv("AUTH_SECRET"), users, dataDir())).routes(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second}

	go func() {
		slog.Info("PRESISI Rent Car API berjalan", "url", "http://localhost:"+port)
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
