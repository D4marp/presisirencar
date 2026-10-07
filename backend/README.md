# PRESISI Rent Car — Backend API (Go)

API ringan tanpa framework dan tanpa dependensi eksternal (hanya library standar Go).

## Endpoint

| Endpoint | Akses | Fungsi |
| --- | --- | --- |
| `GET /api/health` | publik | status server |
| `POST /api/auth/login`, `GET /api/auth/me` | publik / login | masuk, cek sesi |
| `GET /api/cars`, `GET /api/cars/{slug}` | publik | daftar & detail mobil |
| `POST /api/bookings` | publik (dibatasi 10/10 menit per IP) | pelanggan membuat booking |
| `GET /api/uploads/{file}` | publik | menyajikan foto mobil yang diunggah |
| `POST /api/cars` | admin | tambah mobil |
| `PUT /api/cars/{slug}` | admin | ubah mobil (slug tidak bisa diubah) |
| `PATCH /api/cars/{slug}/availability` | staf & admin | aktif/nonaktifkan unit |
| `DELETE /api/cars/{slug}` | admin | hapus mobil (ditolak bila punya riwayat booking, nonaktifkan saja) |
| `POST /api/uploads` | admin | unggah foto (multipart `file`; JPG/PNG/WebP, maks 4 MB) |
| `GET /api/bookings`, `GET /api/bookings/{id}` | staf & admin | daftar / detail booking |
| `PUT /api/bookings/{id}` | staf & admin | ubah booking (total dihitung ulang bila mobil/durasi/driver berubah; override `total` hanya admin) |
| `PATCH /api/bookings/{id}/status` | staf & admin | ubah status |
| `DELETE /api/bookings/{id}` | admin | hapus booking (nomor tidak dipakai ulang) |
| `GET /api/customers?q=` | staf & admin | daftar pelanggan (turunan dari booking, baca saja) |
| `GET /api/dashboard` | staf & admin | ringkasan angka |

Semua perubahan data dicatat di log sebagai `audit` (pengguna, aksi, target; tanpa data pribadi).

## Penyimpanan

Semua file berada di folder yang sama dengan `DATA_FILE`:
`bookings.json`, `cars.json` (dibuat dari data awal saat start pertama), `meta.json` (penghitung nomor pesanan), dan `uploads/` (foto). Bisa dipindah dengan `CARS_FILE`, `META_FILE`, `UPLOAD_DIR`.

## Menjalankan lokal

```bash
go test ./...
go run .          # http://localhost:8080 (akun demo aktif: admin / Presisi#2026)
```

## Deploy ke VPS (Ubuntu/Debian) — hardening maksimal

Asumsi: domain API `api.contoh.com` sudah mengarah ke IP VPS, dan Go 1.23+ terpasang di mesin build (atau build di laptop lalu `scp` binary).

### 1. Server dasar

```bash
apt update && apt -y upgrade
adduser --disabled-password --gecos "" deploy && usermod -aG sudo deploy   # login SSH pakai key
# /etc/ssh/sshd_config: PermitRootLogin no, PasswordAuthentication no  → systemctl restart ssh

apt -y install ufw fail2ban unattended-upgrades caddy
ufw default deny incoming && ufw default allow outgoing
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp
ufw enable
systemctl enable --now fail2ban
```

Port 8080 **tidak dibuka** ke publik. API hanya mendengarkan `127.0.0.1`.

### 2. Pasang aplikasi

```bash
useradd --system --home /opt/presisi --shell /usr/sbin/nologin presisi
mkdir -p /opt/presisi /var/lib/presisi /etc/presisi
git clone https://github.com/D4marp/presisi-rent-car--backend.git /tmp/api-src
cd /tmp/api-src && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /opt/presisi/api .
cp -r deploy /opt/presisi/deploy && chmod +x /opt/presisi/deploy/backup.sh
chown -R root:root /opt/presisi && chmod 755 /opt/presisi/api
chown presisi:presisi /var/lib/presisi && chmod 700 /var/lib/presisi
```

### 3. Konfigurasi rahasia

```bash
cp deploy/api.env.example /etc/presisi/api.env
nano /etc/presisi/api.env          # isi AUTH_SECRET, ADMIN_PASSWORD, CORS_ORIGIN
chown root:root /etc/presisi/api.env && chmod 600 /etc/presisi/api.env
```

`AUTH_SECRET` (min 32 karakter): `openssl rand -hex 32`. Tanpa nilai aman, API menolak start (disengaja).

### 4. Service systemd (sudah terkunci)

```bash
cp deploy/presisi-api.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now presisi-api
systemctl status presisi-api
curl -s http://127.0.0.1:8080/api/health
```

Unit membatasi: tanpa hak istimewa, filesystem read-only kecuali `/var/lib/presisi`, syscall difilter, memori maks 512 MB.

### 5. HTTPS dengan Caddy

```bash
nano /etc/caddy/Caddyfile      # tempel isi deploy/Caddyfile, ganti domain
mkdir -p /var/log/caddy && chown caddy:caddy /var/log/caddy
systemctl reload caddy
curl -s https://api.contoh.com/api/health
```

### 6. Backup

```bash
(crontab -l 2>/dev/null; echo "15 2 * * * /opt/presisi/deploy/backup.sh") | crontab -
```

Backup berupa arsip `.tar.gz` seluruh `/var/lib/presisi` (booking, mobil, foto). Salin `/var/backups/presisi` ke luar VPS secara berkala (rsync/rclone).

### 7. Update versi baru

```bash
cd /tmp/api-src && git pull && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /opt/presisi/api.new .
mv /opt/presisi/api.new /opt/presisi/api && systemctl restart presisi-api
```

### 8. Hubungkan frontend

Di frontend set saat build: `NEXT_PUBLIC_API_URL=https://api.contoh.com/api`. `CORS_ORIGIN` di server harus sama persis dengan domain frontend.

## Checklist keamanan sebelum go-live

- [ ] Login dengan `admin / Presisi#2026` **gagal** di server production.
- [ ] `curl http://IP_VPS:8080` dari luar **tidak** tersambung (port tertutup).
- [ ] `curl -I https://api.contoh.com/api/health` menampilkan HSTS dan `nosniff`.
- [ ] `ufw status` hanya SSH, 80, 443.
- [ ] `/etc/presisi/api.env` berizin 600 dan tidak ada di git.
- [ ] Satu booking uji dari website masuk, terlihat di dashboard, lalu backup menghasilkan file.

## Batasan

Penyimpanan berupa file JSON dan folder foto (cocok satu server dan volume kecil; migrasi ke PostgreSQL bila tumbuh). Satu akun admin dari environment. Token login berlaku 12 jam dan disimpan di `localStorage` frontend.
