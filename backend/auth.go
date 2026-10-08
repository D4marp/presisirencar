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
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// hashRounds: jumlah iterasi PBKDF2-HMAC-SHA256 (rekomendasi OWASP untuk SHA-256: 600.000).
// Variabel (bukan konstanta) agar tes dapat menurunkannya supaya cepat.
var hashRounds = 600000

// pbkdf2SHA256 mengimplementasikan PBKDF2 (RFC 8018) dengan HMAC-SHA256 memakai library standar,
// diverifikasi terhadap vektor uji baku di tes.
func pbkdf2SHA256(password, salt []byte, iter, keyLen int) []byte {
	prf := hmac.New(sha256.New, password)
	hLen := prf.Size()
	blocks := (keyLen + hLen - 1) / hLen
	dk := make([]byte, 0, blocks*hLen)
	u := make([]byte, hLen)
	for block := 1; block <= blocks; block++ {
		prf.Reset()
		prf.Write(salt)
		prf.Write([]byte{byte(block >> 24), byte(block >> 16), byte(block >> 8), byte(block)})
		dk = prf.Sum(dk)
		t := dk[len(dk)-hLen:]
		copy(u, t)
		for n := 2; n <= iter; n++ {
			prf.Reset()
			prf.Write(u)
			u = prf.Sum(u[:0])
			for x := range u {
				t[x] ^= u[x]
			}
		}
	}
	return dk[:keyLen]
}

func hashPassword(password, salt string) string {
	return hex.EncodeToString(pbkdf2SHA256([]byte(password), []byte(salt), hashRounds, 32))
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// User adalah akun yang dapat masuk ke dashboard. salt/hash tidak pernah dikirim ke klien.
type User struct {
	Username string `json:"username"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	salt     string
	hash     string
	root     bool // akun dari environment: tidak bisa dihapus lewat dashboard
	created  time.Time
}

func newUser(username, name, role, password string) User {
	salt := randomHex(16)
	return User{Username: username, Name: name, Role: role, salt: salt, hash: hashPassword(password, salt), created: time.Now()}
}

func newRootUser(username, name, role, password string) User {
	u := newUser(username, name, role, password)
	u.root = true
	return u
}

// Akun demo: hanya dipakai di mode development.
func demoUsers() []User {
	return []User{
		newRootUser("admin", "Steven Presisi", "admin", "Presisi#2026"),
		newRootUser("staff", "Dewi Operasional", "staff", "Staff#2026"),
	}
}

// adminUsers membuat akun produksi dari environment (tanpa akun demo).
func adminUsers() []User {
	username := strings.ToLower(env("ADMIN_USERNAME", "admin"))
	return []User{newRootUser(username, env("ADMIN_NAME", "Administrator"), "admin", os.Getenv("ADMIN_PASSWORD"))}
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

// storedUser adalah bentuk akun (non-root) yang disimpan di users.json.
type storedUser struct {
	Username  string    `json:"username"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	Salt      string    `json:"salt"`
	Hash      string    `json:"hash"`
	CreatedAt time.Time `json:"created_at"`
}

type Auth struct {
	secret  []byte
	logins  *limiter
	signups *limiter
	dir     string

	mu      sync.RWMutex
	users   []User
	invites []invite
}

// newAuth membuat pengelola login. root = akun dari environment/demo; akun tambahan (hasil
// pendaftaran dengan undangan) dan undangan dimuat dari folder data.
func newAuth(secret string, root []User, dir string) *Auth {
	key := []byte(secret)
	if len(key) == 0 {
		key = make([]byte, 32)
		_, _ = rand.Read(key)
		slog.Warn("AUTH_SECRET belum diatur; sesi login akan hilang saat server restart")
	}
	a := &Auth{secret: key, logins: newLimiter(5, 5*time.Minute), signups: newLimiter(10, 15*time.Minute), dir: dir, users: append([]User{}, root...)}
	if dir != "" {
		a.loadStored()
	}
	return a
}

func (a *Auth) usersPath() string   { return filepath.Join(a.dir, "users.json") }
func (a *Auth) invitesPath() string { return filepath.Join(a.dir, "invites.json") }

func (a *Auth) loadStored() {
	if data, err := os.ReadFile(a.usersPath()); err == nil {
		var list []storedUser
		if json.Unmarshal(data, &list) == nil {
			for _, s := range list {
				if _, exists := a.findLocked(s.Username); exists {
					continue // akun root dengan nama sama menang
				}
				a.users = append(a.users, User{Username: s.Username, Name: s.Name, Role: s.Role, salt: s.Salt, hash: s.Hash, created: s.CreatedAt})
			}
		} else {
			slog.Error("users.json rusak, akun tambahan tidak dimuat")
		}
	}
	if data, err := os.ReadFile(a.invitesPath()); err == nil {
		_ = json.Unmarshal(data, &a.invites)
	}
	a.purgeInvitesLocked()
}

func (a *Auth) saveUsersLocked() error {
	list := []storedUser{}
	for _, u := range a.users {
		if !u.root {
			list = append(list, storedUser{Username: u.Username, Name: u.Name, Role: u.Role, Salt: u.salt, Hash: u.hash, CreatedAt: u.created})
		}
	}
	return writeFileAtomic(a.usersPath(), list)
}

func (a *Auth) saveInvitesLocked() error { return writeFileAtomic(a.invitesPath(), a.invites) }

func (a *Auth) findLocked(username string) (User, bool) {
	for _, u := range a.users {
		if u.Username == username {
			return u, true
		}
	}
	return User{}, false
}

func (a *Auth) findUser(username string) (User, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.findLocked(username)
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

// verify memeriksa tanda tangan, masa berlaku, dan bahwa akunnya masih ada
// (akun yang dihapus otomatis kehilangan semua token lamanya).
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
	if u, ok := a.findUser(claims.U); ok {
		return u, nil
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
	if len(in.Password) > 256 {
		writeError(w, 401, "username atau password salah")
		return
	}
	username := strings.ToLower(strings.TrimSpace(in.Username))
	u, found := a.findUser(username)
	salt, want := "tidak-ada", ""
	if found {
		salt, want = u.salt, u.hash
	}
	// Hash selalu dihitung (juga untuk username yang tidak ada) agar waktu respons tidak membocorkan username.
	candidate := hashPassword(in.Password, salt)
	if found && subtle.ConstantTimeCompare([]byte(candidate), []byte(want)) == 1 {
		writeJSON(w, 200, map[string]any{"token": a.issue(u, 12*time.Hour), "user": u})
		return
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
