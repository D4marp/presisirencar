package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// Akun demo untuk prototype. Ganti sebelum produksi (lihat README).
type User struct {
	Username string `json:"username"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	salt     string
	hash     string
}

const hashRounds = 20000

// hashPassword: HMAC-SHA256 berulang dengan salt. Cukup untuk prototype;
// untuk produksi gunakan bcrypt/argon2.
func hashPassword(password, salt string) string {
	sum := []byte(password)
	for i := 0; i < hashRounds; i++ {
		m := hmac.New(sha256.New, []byte(salt))
		m.Write(sum)
		sum = m.Sum(nil)
	}
	return hex.EncodeToString(sum)
}

func newUser(username, name, role, password string) User {
	salt := "presisi-" + username
	return User{Username: username, Name: name, Role: role, salt: salt, hash: hashPassword(password, salt)}
}

func demoUsers() []User {
	return []User{
		newUser("admin", "Steven Presisi", "admin", "Presisi#2026"),
		newUser("staff", "Dewi Operasional", "staff", "Staff#2026"),
	}
}

// limiter membatasi N kejadian per jendela waktu untuk setiap kunci (IP).
type limiter struct {
	mu     sync.Mutex
	max    int
	window time.Duration
	hits   map[string][]time.Time
}

func newLimiter(max int, window time.Duration) *limiter {
	return &limiter{max: max, window: window, hits: map[string][]time.Time{}}
}

func (l *limiter) prune(key string) []time.Time {
	recent := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if time.Since(t) < l.window {
			recent = append(recent, t)
		}
	}
	if len(recent) == 0 {
		delete(l.hits, key)
		return nil
	}
	l.hits[key] = recent
	return recent
}

func (l *limiter) blocked(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	return len(l.prune(key)) >= l.max
}

func (l *limiter) record(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.prune(key)
	l.hits[key] = append(l.hits[key], time.Now())
}

type Auth struct {
	users  []User
	secret []byte
	logins *limiter
}

func newAuth(secret string, users []User) *Auth {
	key := []byte(secret)
	if len(key) == 0 {
		key = make([]byte, 32)
		_, _ = rand.Read(key)
		slog.Warn("AUTH_SECRET belum diatur; sesi login akan hilang saat server restart")
	}
	return &Auth{users: users, secret: key, logins: newLimiter(5, 5*time.Minute)}
}

func (a *Auth) sign(payload string) string {
	m := hmac.New(sha256.New, a.secret)
	m.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(m.Sum(nil))
}

func (a *Auth) issue(u User, ttl time.Duration) string {
	body, _ := json.Marshal(map[string]any{"u": u.Username, "exp": time.Now().Add(ttl).Unix()})
	payload := base64.RawURLEncoding.EncodeToString(body)
	return payload + "." + a.sign(payload)
}

func (a *Auth) verify(token string) (User, error) {
	payload, sig, ok := strings.Cut(token, ".")
	if !ok || subtle.ConstantTimeCompare([]byte(sig), []byte(a.sign(payload))) != 1 {
		return User{}, errors.New("token tidak valid")
	}
	raw, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return User{}, errors.New("token tidak valid")
	}
	var claims struct {
		U   string `json:"u"`
		Exp int64  `json:"exp"`
	}
	if json.Unmarshal(raw, &claims) != nil || time.Now().Unix() > claims.Exp {
		return User{}, errors.New("sesi berakhir")
	}
	for _, u := range a.users {
		if u.Username == claims.U {
			return u, nil
		}
	}
	return User{}, errors.New("pengguna tidak ditemukan")
}

// TRUST_PROXY=1 jika berjalan di belakang reverse proxy (Railway, Fly, Nginx):
// pakai alamat terakhir di X-Forwarded-For, yaitu yang ditambahkan proxy tepercaya.
func clientIP(r *http.Request) string {
	if env("TRUST_PROXY", "0") == "1" {
		if parts := strings.Split(r.Header.Get("X-Forwarded-For"), ","); len(parts) > 0 {
			if ip := strings.TrimSpace(parts[len(parts)-1]); ip != "" {
				return ip
			}
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func (a *Auth) login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, 400, "permintaan tidak valid")
		return
	}
	ip := clientIP(r)
	if a.logins.blocked(ip) {
		writeError(w, 429, "terlalu banyak percobaan, coba lagi beberapa menit lagi")
		return
	}
	username := strings.ToLower(strings.TrimSpace(in.Username))
	for _, u := range a.users {
		// Hash dihitung untuk setiap akun agar waktu respons tidak membocorkan username.
		candidate := hashPassword(in.Password, u.salt)
		if u.Username == username && subtle.ConstantTimeCompare([]byte(candidate), []byte(u.hash)) == 1 {
			writeJSON(w, 200, map[string]any{"token": a.issue(u, 12*time.Hour), "user": u})
			return
		}
	}
	a.logins.record(ip)
	writeError(w, 401, "username atau password salah")
}

func (a *Auth) me(w http.ResponseWriter, r *http.Request) {
	u, ok := a.userFrom(r)
	if !ok {
		writeError(w, 401, "belum login")
		return
	}
	writeJSON(w, 200, u)
}

func (a *Auth) userFrom(r *http.Request) (User, bool) {
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if token == "" {
		return User{}, false
	}
	u, err := a.verify(token)
	return u, err == nil
}

type ctxKey struct{}

// currentUser mengambil pengguna yang sudah diverifikasi oleh require/requireRole.
func currentUser(r *http.Request) User {
	u, _ := r.Context().Value(ctxKey{}).(User)
	return u
}

// require membungkus handler agar hanya dapat diakses pengguna yang login.
func (a *Auth) require(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := a.userFrom(r)
		if !ok {
			writeError(w, 401, "login diperlukan")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, u)))
	}
}

// requireRole seperti require, tetapi hanya untuk peran tertentu (mis. "admin").
func (a *Auth) requireRole(role string, next http.HandlerFunc) http.HandlerFunc {
	return a.require(func(w http.ResponseWriter, r *http.Request) {
		if currentUser(r).Role != role {
			writeError(w, 403, "tidak punya akses untuk tindakan ini")
			return
		}
		next(w, r)
	})
}

// adminUsers membuat akun produksi dari environment (tanpa akun demo).
func adminUsers() []User {
	username := strings.ToLower(env("ADMIN_USERNAME", "admin"))
	return []User{newUser(username, env("ADMIN_NAME", "Administrator"), "admin", os.Getenv("ADMIN_PASSWORD"))}
}
