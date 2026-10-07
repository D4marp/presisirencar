# Deploy produksi — PRESISI Rent Car

Dua bagian: **frontend Next.js** dan **backend Go**. Backend wajib diberi variabel environment aman; tanpa itu ia menolak start (disengaja).

## 1. Backend (Go API)

Environment wajib (`APP_ENV=production`):

| Variabel | Keterangan |
| --- | --- |
| `APP_ENV` | `production`. Menonaktifkan akun demo dan data contoh. |
| `AUTH_SECRET` | Minimal 32 karakter acak. Buat: `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | Minimal 10 karakter. Password login admin. |
| `ADMIN_USERNAME` | Opsional, default `admin`. |
| `ADMIN_NAME` | Opsional, nama tampil di dashboard. |
| `CORS_ORIGIN` | Domain frontend, mis. `https://presisirencar.com` (pisahkan koma bila lebih dari satu). |
| `DATA_FILE` | Lokasi file data, mis. `/data/bookings.json`. **Harus di disk persisten (volume).** |
| `TRUST_PROXY` | `1` jika di belakang proxy/PaaS (Railway, Fly, Nginx) agar rate limit memakai IP asli. |
| `PORT` | Default `8080`. |

Jalankan: `cd backend && go build -o api . && ./api` atau pakai `backend/Dockerfile` (belum diuji di mesin ini).

## 2. Frontend (Next.js)

Variabel ini dibaca saat **build**:

| Variabel | Contoh |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.presisirencar.com/api` |
| `NEXT_PUBLIC_SITE_URL` | `https://presisirencar.com` (untuk sitemap, robots, Open Graph) |

`npm ci && npm run build && npm start`. Di Vercel cukup isi dua variabel di atas.

## 2b. Mengisi data asli klien (`data/business.ts`)

Beranda sengaja **tidak** menampilkan klaim yang belum terbukti. Isi file ini dengan data asli:

| Isi | Efek di website |
| --- | --- |
| `googleSummary = { rating: 4.8, count: 87 }` | Menampilkan badge "4.8 ★ Google Review" di strip kepercayaan dan bagian ulasan. Isi hanya dengan angka dari Google Business Profile. |
| `reviews = [{ author, tag, rating, text }]` | Menampilkan kartu ulasan. Salin dari Google Maps dengan izin pemberi ulasan. Kosong = tampil tautan ke Google Maps. |
| `deliveryOptions[].fee` | Biaya antar per lokasi di estimator. `null` = tampil "Dikonfirmasi CS" dan tidak masuk total. `0` = "Gratis". |
| `DRIVER_FEE_PER_DAY` | Harus sama dengan backend (`backend/main.go`, 250000). |

## 3. Checklist sebelum go-live

- [ ] `AUTH_SECRET` dan `ADMIN_PASSWORD` produksi sudah diatur (bukan nilai contoh).
- [ ] Login dengan akun demo (`admin / Presisi#2026`) harus **gagal** di produksi.
- [ ] `CORS_ORIGIN` = domain frontend persis (dengan `https://`).
- [ ] Volume untuk `DATA_FILE` terpasang; lakukan backup berkala (data = file JSON).
- [ ] HTTPS aktif di frontend dan API.
- [ ] Coba satu booking dari website, lalu cek muncul di `/dashboard`.

## 4. Batasan yang diketahui (prototype → produksi)

- Penyimpanan berupa **file JSON**, cocok untuk satu server dan volume kecil. Bila trafik atau jumlah staf bertambah, pindah ke PostgreSQL.
- Hanya ada satu akun admin dari environment. Belum ada manajemen pengguna.
- Token login disimpan di `localStorage` (berlaku 12 jam). Untuk keamanan lebih tinggi gunakan cookie `HttpOnly`.
- Status armada (tersedia/tidak) dan harga ada di kode (`backend/main.go` dan `data/cars.ts`), bukan di dashboard. Mengubahnya butuh edit kode dan deploy ulang. Keduanya harus diubah bersamaan.
- Belum ada notifikasi otomatis (email/WhatsApp) saat booking masuk; staf mengecek dashboard.
