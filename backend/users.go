package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	inviteTTL        = 24 * time.Hour
	inviteAlphabet   = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // 32 karakter, tanpa 0/O/1/I agar mudah dibaca
	inviteCodeLength = 16                                 // 16 x 5 bit = 80 bit acak
)

var usernamePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._@-]{2,39}$`)

// invite adalah undangan sekali pakai untuk mendaftar. Kode aslinya tidak disimpan, hanya hash-nya.
type invite struct {
	ID        string    `json:"id"`
	CodeHash  string    `json:"code_hash"`
	Role      string    `json:"role"`
	CreatedBy string    `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

func newInviteCode() string {
	raw := make([]byte, inviteCodeLength)
	_, _ = rand.Read(raw)
	var b strings.Builder
	for i, x := range raw {
		if i > 0 && i%4 == 0 {
			b.WriteByte('-')
		}
		b.WriteByte(inviteAlphabet[int(x)&31]) // 256 habis dibagi 32, jadi tanpa bias
	}
	return b.String()
}

// normalizeInvite menyeragamkan masukan pengguna (huruf besar, tanpa tanda hubung/spasi); "" bila tidak valid.
func normalizeInvite(code string) string {
	code = strings.ToUpper(strings.NewReplacer("-", "", " ", "").Replace(code))
	if len(code) != inviteCodeLength {
		return ""
	}
	for _, c := range code {
		if !strings.ContainsRune(inviteAlphabet, c) {
			return ""
		}
	}
	return code
}

func hashInvite(normalized string) string {
	sum := sha256.Sum256([]byte(normalized))
	return hex.EncodeToString(sum[:])
}

func (a *Auth) purgeInvitesLocked() {
	kept := a.invites[:0]
	for _, inv := range a.invites {
		if time.Now().Before(inv.ExpiresAt) {
			kept = append(kept, inv)
		}
	}
	a.invites = kept
}

func auditAs(user, action, target string) {
	slog.Info("audit", "user", user, "action", action, "target", target)
}

// ---------- Admin: undangan ----------

func (a *Auth) createInvite(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Role string `json:"role"`
	}
	if err := decodeJSON(r, &in); err != nil || (in.Role != "staff" && in.Role != "admin") {
		writeError(w, 422, `role harus "staff" atau "admin"`)
		return
	}
	code := newInviteCode()
	inv := invite{ID: randomHex(4), CodeHash: hashInvite(normalizeInvite(code)), Role: in.Role, CreatedBy: currentUser(r).Username, CreatedAt: time.Now(), ExpiresAt: time.Now().Add(inviteTTL)}

	a.mu.Lock()
	defer a.mu.Unlock()
	a.purgeInvitesLocked()
	if len(a.invites) >= 50 {
		writeError(w, 429, "terlalu banyak undangan aktif; cabut yang tidak dipakai dulu")
		return
	}
	a.invites = append(a.invites, inv)
	if err := a.saveInvitesLocked(); err != nil {
		a.invites = a.invites[:len(a.invites)-1]
		writeError(w, 500, "gagal menyimpan undangan")
		return
	}
	audit(r, "invite.create", inv.ID+":"+inv.Role)
	// Kode ditampilkan sekali ini saja.
	writeJSON(w, 201, map[string]any{"id": inv.ID, "code": code, "role": inv.Role, "expires_at": inv.ExpiresAt})
}

func (a *Auth) listInvites(w http.ResponseWriter, _ *http.Request) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.purgeInvitesLocked()
	out := make([]map[string]any, 0, len(a.invites))
	for _, inv := range a.invites {
		out = append(out, map[string]any{"id": inv.ID, "role": inv.Role, "created_by": inv.CreatedBy, "expires_at": inv.ExpiresAt})
	}
	writeJSON(w, 200, map[string]any{"data": out, "total": len(out)})
}

func (a *Auth) revokeInvite(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	a.mu.Lock()
	defer a.mu.Unlock()
	for i, inv := range a.invites {
		if inv.ID != id {
			continue
		}
		prev := append([]invite{}, a.invites...)
		a.invites = append(append([]invite{}, a.invites[:i]...), a.invites[i+1:]...)
		if err := a.saveInvitesLocked(); err != nil {
			a.invites = prev
			writeError(w, 500, "gagal menyimpan perubahan")
			return
		}
		audit(r, "invite.revoke", id)
		w.WriteHeader(http.StatusNoContent)
		return
	}
	writeError(w, 404, "undangan tidak ditemukan")
}

// ---------- Admin: pengguna ----------

func (a *Auth) listUsers(w http.ResponseWriter, _ *http.Request) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	out := make([]map[string]any, 0, len(a.users))
	for _, u := range a.users {
		out = append(out, map[string]any{"username": u.Username, "name": u.Name, "role": u.Role, "root": u.root, "created_at": u.created})
	}
	writeJSON(w, 200, map[string]any{"data": out, "total": len(out)})
}

func (a *Auth) deleteUser(w http.ResponseWriter, r *http.Request) {
	username := strings.ToLower(r.PathValue("username"))
	me := currentUser(r)
	a.mu.Lock()
	defer a.mu.Unlock()
	for i, u := range a.users {
		if u.Username != username {
			continue
		}
		switch {
		case u.root:
			writeError(w, 403, "akun utama (dari konfigurasi server) tidak bisa dihapus lewat dashboard")
			return
		case u.Username == me.Username:
			writeError(w, 403, "Anda tidak bisa menghapus akun Anda sendiri")
			return
		}
		prev := append([]User{}, a.users...)
		a.users = append(append([]User{}, a.users[:i]...), a.users[i+1:]...)
		if err := a.saveUsersLocked(); err != nil {
			a.users = prev
			writeError(w, 500, "gagal menyimpan perubahan")
			return
		}
		audit(r, "user.delete", username)
		w.WriteHeader(http.StatusNoContent)
		return
	}
	writeError(w, 404, "pengguna tidak ditemukan")
}

// ---------- Publik: pendaftaran dengan kode undangan ----------

// register membuat akun baru HANYA bila membawa kode undangan yang valid, belum dipakai, dan belum
// kedaluwarsa. Tanpa kode, siapa pun tidak bisa membuat akun.
func (a *Auth) register(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if a.signups.blocked(ip) {
		writeError(w, 429, "terlalu banyak percobaan pendaftaran, coba lagi nanti")
		return
	}
	a.signups.record(ip) // setiap percobaan dihitung, benar maupun salah

	var in struct {
		Username   string `json:"username"`
		Name       string `json:"name"`
		Password   string `json:"password"`
		InviteCode string `json:"invite_code"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, 400, "permintaan tidak valid")
		return
	}
	const invalidInvite = "kode undangan tidak valid, sudah dipakai, atau kedaluwarsa"
	code := normalizeInvite(in.InviteCode)
	if code == "" {
		writeError(w, 422, invalidInvite)
		return
	}

	username := strings.ToLower(strings.TrimSpace(in.Username))
	name := strings.TrimSpace(in.Name)

	a.mu.Lock()
	defer a.mu.Unlock()
	a.purgeInvitesLocked()
	idx := -1
	want := hashInvite(code)
	for i, inv := range a.invites {
		if inv.CodeHash == want {
			idx = i
		}
	}
	if idx < 0 {
		writeError(w, 422, invalidInvite)
		return
	}

	// Validasi isian setelah undangan terbukti sah (agar orang luar tidak bisa menebak nama akun).
	switch {
	case !usernamePattern.MatchString(username):
		writeError(w, 422, "username 3-40 karakter: huruf kecil, angka, titik, garis bawah, strip, atau @")
		return
	case utf8.RuneCountInString(name) < 2 || utf8.RuneCountInString(name) > 60 || hasControlChars(name):
		writeError(w, 422, "nama lengkap 2-60 karakter")
		return
	case len(in.Password) > 128 || weakPassword(in.Password, username):
		writeError(w, 422, "password terlalu lemah: minimal 12 karakter, bukan nama brand, kata umum, atau urutan angka")
		return
	}
	if _, taken := a.findLocked(username); taken {
		writeError(w, 409, "username sudah dipakai")
		return
	}

	inv := a.invites[idx]
	user := newUser(username, name, inv.Role, in.Password)
	prevUsers, prevInvites := append([]User{}, a.users...), append([]invite{}, a.invites...)
	a.users = append(a.users, user)
	a.invites = append(append([]invite{}, a.invites[:idx]...), a.invites[idx+1:]...) // sekali pakai
	if err := a.saveUsersLocked(); err != nil {
		a.users, a.invites = prevUsers, prevInvites
		writeError(w, 500, "gagal membuat akun")
		return
	}
	if err := a.saveInvitesLocked(); err != nil {
		// Akun sudah tersimpan; undangan yang gagal terhapus tetap kedaluwarsa sendiri dan dicatat.
		slog.Error("gagal menghapus undangan terpakai", "id", inv.ID, "error", err)
	}
	auditAs(inv.CreatedBy, "user.register", username+":"+inv.Role)
	writeJSON(w, 201, map[string]any{"username": user.Username, "name": user.Name, "role": user.Role})
}
