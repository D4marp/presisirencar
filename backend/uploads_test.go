package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"strings"
	"testing"
)

func upload(t *testing.T, url, token string, content []byte) (int, map[string]string) {
	t.Helper()
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	h := textproto.MIMEHeader{}
	h.Set("Content-Disposition", `form-data; name="file"; filename="foto.jpg"`)
	part, _ := mw.CreatePart(h)
	part.Write(content)
	mw.Close()
	req, _ := http.NewRequest("POST", url+"/api/uploads", &body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var out map[string]string
	_ = json.NewDecoder(res.Body).Decode(&out)
	return res.StatusCode, out
}

func TestUploads(t *testing.T) {
	t.Setenv("UPLOAD_DIR", t.TempDir())
	server, _ := testServer(t, false)
	admin, staff := tokens(t, server.URL)
	png, _ := base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")

	if code, _ := upload(t, server.URL, "", png); code != 401 {
		t.Fatalf("tanpa login = %d", code)
	}
	if code, _ := upload(t, server.URL, staff, png); code != 403 {
		t.Fatalf("staf = %d", code)
	}
	// SVG / HTML / teks yang menyamar sebagai foto ditolak (dicek dari isi file)
	for name, content := range map[string][]byte{
		"svg":  []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`),
		"html": []byte(`<html><script>alert(1)</script></html>`),
		"teks": []byte(strings.Repeat("hello ", 50)),
	} {
		if code, _ := upload(t, server.URL, admin, content); code != 415 {
			t.Errorf("%s: status %d, harusnya 415", name, code)
		}
	}
	// terlalu besar
	big := append([]byte{}, png...)
	big = append(big, bytes.Repeat([]byte{0}, 5<<20)...)
	if code, _ := upload(t, server.URL, admin, big); code != 413 {
		t.Fatalf("file besar = %d", code)
	}

	code, out := upload(t, server.URL, admin, png)
	if code != 201 || !strings.HasPrefix(out["path"], "/api/uploads/") || !strings.HasSuffix(out["path"], ".png") {
		t.Fatalf("upload = %d %v", code, out)
	}
	// dapat diambil publik dengan header aman
	res, err := http.Get(server.URL + out["path"])
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(res.Body)
	if res.StatusCode != 200 || !bytes.Equal(data, png) || res.Header.Get("X-Content-Type-Options") != "nosniff" || !strings.Contains(res.Header.Get("Cache-Control"), "immutable") {
		t.Fatalf("serve = %d, header=%v", res.StatusCode, res.Header)
	}
	// nama tidak valid / mencoba keluar folder
	for _, p := range []string{"/api/uploads/..%2Fmeta.json", "/api/uploads/x.png", "/api/uploads/00000000000000000000000000000000.svg"} {
		r, err := http.Get(server.URL + p)
		if err != nil {
			t.Fatal(err)
		}
		r.Body.Close()
		if r.StatusCode != 404 {
			t.Errorf("%s = %d, harusnya 404", p, r.StatusCode)
		}
	}
	// path hasil upload bisa dipakai sebagai gambar mobil
	car := strings.Replace(newCar, `"/fleet-mpv.jpg"`, `"`+out["path"]+`"`, 1)
	if code, _ := call(t, "POST", server.URL+"/api/cars", admin, car); code != 201 {
		t.Fatalf("mobil dengan foto upload = %d", code)
	}
}
