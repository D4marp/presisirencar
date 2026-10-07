package main

import (
	"crypto/rand"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
)

const maxUploadBytes = 4 << 20 // 4 MB

var uploadName = regexp.MustCompile(`^[a-f0-9]{32}\.(jpg|png|webp)$`)

// Tipe file ditentukan dari isi file (bukan nama/ekstensi dari klien). SVG sengaja tidak diizinkan.
var uploadTypes = map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

func (s *Store) uploadDir() string {
	return env("UPLOAD_DIR", filepath.Join(filepath.Dir(s.path), "uploads"))
}

// upload menerima satu foto (multipart field "file") dan mengembalikan path publiknya.
func (a *API) upload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes+(64<<10))
	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		writeError(w, 413, "file terlalu besar (maksimal 4 MB) atau format tidak valid")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, 400, `kirim file pada field "file"`)
		return
	}
	defer file.Close()

	head := make([]byte, 512)
	n, _ := io.ReadFull(file, head)
	ext, ok := uploadTypes[http.DetectContentType(head[:n])]
	if !ok {
		writeError(w, 415, "hanya JPG, PNG, atau WebP yang diizinkan")
		return
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		writeError(w, 500, "gagal membaca file")
		return
	}

	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		writeError(w, 500, "gagal membuat nama file")
		return
	}
	name := hex.EncodeToString(raw) + ext
	dir := a.store.uploadDir()
	if err := os.MkdirAll(dir, 0700); err != nil {
		writeError(w, 500, "gagal menyimpan file")
		return
	}
	out, err := os.OpenFile(filepath.Join(dir, name), os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		writeError(w, 500, "gagal menyimpan file")
		return
	}
	defer out.Close()
	if _, err := io.Copy(out, io.LimitReader(file, maxUploadBytes)); err != nil {
		os.Remove(out.Name())
		writeError(w, 500, "gagal menyimpan file")
		return
	}
	audit(r, "upload.create", name)
	writeJSON(w, 201, map[string]string{"path": "/api/uploads/" + name})
}

func (a *API) serveUpload(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if !uploadName.MatchString(name) {
		writeError(w, 404, "file tidak ditemukan")
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeFile(w, r, filepath.Join(a.store.uploadDir(), name))
}
