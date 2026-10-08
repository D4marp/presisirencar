# Deploy produksi — PRESISI Rent Car

Dua bagian: **frontend Next.js** dan **backend Go**. Backend wajib diberi variabel environment aman; tanpa itu ia menolak start (disengaja).

## 1. Backend (Go API)

Environment wajib (`APP_ENV=production`):

| Variabel | Keterangan |
| --- | --- |
| `APP_ENV` | `production`. Menonaktifkan akun demo. |
| `AUTH_SECRET` | Minimal 32 karakter acak. Buat: `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | Minimal 12 karakter, acak (nilai lemah ditolak server). Password login admin. |
| `ADMIN_USERNAME` | Opsional, default `admin`. |
| `ADMIN_NAME` | Opsional, nama tampil di dashboard. |
| `CORS_ORIGIN` | Domain frontend, mis. `https://presisirencar.com` (pisahkan koma bila lebih dari satu). |
| `DATA_DIR` | Folder data (daftar mobil + foto), mis. `/var/lib/presisi`. **Harus di disk persisten (volume).** |
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
- [ ] Volume untuk `DATA_DIR` terpasang; lakukan backup berkala (data = file JSON).
- [ ] HTTPS aktif di frontend dan API.
- [ ] Login ke `/dashboard`, tambah mobil uji dengan foto, cek tampil di website, lalu hapus.

## 4. Batasan yang diketahui (prototype → produksi)

- Penyimpanan berupa **file JSON dan folder foto**, cukup untuk katalog puluhan mobil di satu server.
- Akun utama berasal dari environment. Admin menambah akun lain lewat **undangan** di dashboard (menu Pengguna): kode sekali pakai berlaku 24 jam, dan pendaftaran hanya di `/daftar` (tidak ditautkan dari mana pun, tidak diindeks). Tidak ada pendaftaran terbuka.
- Token login disimpan di `localStorage` (berlaku 12 jam). Untuk keamanan lebih tinggi gunakan cookie `HttpOnly`.
- Harga dan status mobil diubah lewat dashboard (tanpa deploy). `data/cars.ts` di frontend hanya data cadangan saat API tidak terjangkau.
- Pemesanan lewat WhatsApp; website tidak menyimpan data pelanggan.
