# PRESISI Rent Car

Website rental mobil menggunakan Next.js, Tailwind CSS, dan backend Go ringan tanpa framework. Pemesanan lewat WhatsApp; dashboard admin hanya untuk mengelola mobil (tambah, ubah, hapus, foto, ketersediaan).

## Menjalankan aplikasi

Terminal pertama:

```bash
npm run dev:api
```

Terminal kedua:

```bash
npm run dev
```

Website tersedia di `http://localhost:3000`, dashboard di `/dashboard` (login di `/login`), dan API di `http://localhost:8080/api`.

> Panduan produksi: lihat [DEPLOY.md](DEPLOY.md).

## Akun demo (prototype, hanya mode development)

| Peran | Username | Password |
| --- | --- | --- |
| Administrator | `admin` | `Presisi#2026` |
| Staf operasional | `staff` | `Staff#2026` |

Login di `/login`. Hanya admin yang bisa tambah/ubah/hapus mobil dan unggah foto; staf hanya mengaktifkan/menonaktifkan unit. Token login berlaku 12 jam.

> Hanya untuk prototype: akun ada di kode (`backend/auth.go`), token disimpan di `localStorage`, dan data di file JSON. Sebelum produksi: ganti ke database, password hash bcrypt/argon2, token cookie `HttpOnly`, dan atur `AUTH_SECRET`.

## API

Lihat tabel endpoint di [backend/README.md](backend/README.md). Backend tidak menyimpan data pelanggan atau pesanan.

Data mobil disimpan di `backend/data/cars.json` dan foto di `backend/data/uploads/`.
