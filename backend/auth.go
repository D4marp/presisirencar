package main

import (
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

func seedUsers() []User {
	return []User{
		newUser("admin", "Steven Presisi", "admin", "Presisi#2026"),
		newUser("staff", "Dewi Operasional", "staff", "Staff#2026"),
	}
}

type Auth struct {
	users  []User
	secret []byte

	mu       sync.Mutex
	failures map[string][]time.Time
}

func newAuth(secret string) *Auth {
	key := []byte(secret)
	if len(key) == 0 {
		key = make([]byte, 32)
		_, _ = rand.Read(key)
		slog.Warn("AUTH_SECRET belum diatur; sesi login akan hilang saat server restart")
	}
	return &Auth{users: seedUsers(), secret: key, failures: map[string][]time.Time{}}
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

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// Maksimal 5 percobaan gagal per IP dalam 5 menit.
func (a *Auth) blocked(ip string) bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	recent := a.failures[ip][:0]
	for _, t := range a.failures[ip] {
		if time.Since(t) < 5*time.Minute {
			recent = append(recent, t)
		}
	}
	a.failures[ip] = recent
	return len(recent) >= 5
}

func (a *Auth) recordFailure(ip string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.failures[ip] = append(a.failures[ip], time.Now())
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
	if a.blocked(ip) {
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
	a.recordFailure(ip)
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

// require membungkus handler agar hanya dapat diakses pengguna yang login.
func (a *Auth) require(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, ok := a.userFrom(r); !ok {
			writeError(w, 401, "login diperlukan")
			return
		}
		next(w, r)
	}
}
