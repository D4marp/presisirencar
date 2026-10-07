# PRESISI Rencar

Website rental mobil dan dashboard operasional menggunakan Next.js, Tailwind CSS, dan backend Go ringan tanpa framework.

## Menjalankan aplikasi

Terminal pertama:

```bash
npm run dev:api
```

Terminal kedua:

```bash
npm run dev
```

Website tersedia di `http://localhost:3000`, dashboard di `/dashboard`, dan API di `http://localhost:8080/api`.

## Akun demo (prototype)

| Peran | Username | Password |
| --- | --- | --- |
| Administrator | `admin` | `Presisi#2026` |
| Staf operasional | `staff` | `Staff#2026` |

Login di `/login`. Dashboard `/dashboard`, `GET /api/bookings`, `PATCH /api/bookings/{id}/status`, dan `GET /api/dashboard` hanya bisa diakses setelah login (token `Authorization: Bearer ...`, berlaku 12 jam). Membuat booking (`POST /api/bookings`) tetap publik untuk pelanggan.

Pada start pertama tanpa data, backend mengisi 12 pesanan contoh. Hapus `backend/data/bookings.json` lalu restart untuk mengembalikan data contoh. Set `SEED_DEMO=0` untuk menonaktifkan.

> Hanya untuk prototype: akun ada di kode (`backend/auth.go`), token disimpan di `localStorage`, dan data di file JSON. Sebelum produksi: ganti ke database, password hash bcrypt/argon2, token cookie `HttpOnly`, dan atur `AUTH_SECRET`.

## API

- `GET /api/health`
- `GET /api/cars`
- `GET /api/cars/{slug}`
- `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/bookings` (login)
- `POST /api/bookings`
- `PATCH /api/bookings/{id}/status` (login)
- `GET /api/dashboard` (login)

Data booking disimpan secara lokal di `backend/data/bookings.json`.
