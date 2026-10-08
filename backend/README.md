# PRESISI Rent Car — Backend API (Go)

API ringan tanpa framework dan tanpa dependensi eksternal (hanya library standar Go).

## Endpoint

Pemesanan dilakukan pelanggan lewat WhatsApp, jadi server **tidak menyimpan data pelanggan atau pesanan**. API hanya mengelola daftar mobil.

| Endpoint | Akses | Fungsi |
| --- | --- | --- |
| `GET /api/health` | publik | status server |
| `POST /api/auth/login`, `GET /api/auth/me` | publik / login | masuk, cek sesi |
| `POST /api/auth/register` | publik, **wajib kode undangan** | daftar akun dengan kode sekali pakai (24 jam). Tanpa kode valid tidak ada akun yang terbentuk |
| `GET/POST /api/invites`, `DELETE /api/invites/{id}` | admin | lihat, buat, dan cabut undangan (peran `staff` atau `admin`) |
| `GET /api/users`, `DELETE /api/users/{username}` | admin | daftar dan hapus akun (akun utama dari konfigurasi dan akun sendiri tidak bisa dihapus) |
| `GET /api/cars`, `GET /api/cars/{slug}` | publik | daftar & detail mobil |
| `GET /api/uploads/{file}` | publik | menyajikan foto mobil yang diunggah |
| `POST /api/cars` | admin | tambah mobil |
| `PUT /api/cars/{slug}` | admin | ubah mobil (slug tidak bisa diubah) |
| `PATCH /api/cars/{slug}/availability` | staf & admin | aktif/nonaktifkan unit |
| `DELETE /api/cars/{slug}` | admin | hapus mobil |
| `POST /api/uploads` | admin | unggah foto (multipart `file`; JPG/PNG/WebP, maks 4 MB) |

Setiap perubahan data dicatat di log sebagai `audit` (pengguna, aksi, target).

## Penyimpanan

Satu folder (`DATA_DIR`, default `data/`): `cars.json` (dibuat dari data awal saat start pertama), `uploads/` (foto), `users.json` (akun hasil pendaftaran undangan; password disimpan sebagai hash PBKDF2-SHA256 600.000 iterasi dengan salt acak per akun), dan `invites.json` (hash kode undangan, bukan kodenya). Bisa dipindah dengan `CARS_FILE` dan `UPLOAD_DIR`. `DATA_FILE` dari konfigurasi lama masih dikenali (dipakai folder-nya).

## Menjalankan lokal

```bash
go test ./...
go run .          # http://localhost:8080 (akun demo aktif: admin / Presisi#2026)
```

## Deploy dengan Docker (disarankan)

Teruji: build image, login dengan akun dari `.env`, akun demo ditolak, CRUD mobil dan unggah foto, data tetap ada setelah restart kontainer, berjalan non-root dengan filesystem read-only.

```bash
git clone https://github.com/D4marp/presisi-rent-car--backend.git && cd presisi-rent-car--backend
cp .env.docker.example .env && chmod 600 .env
nano .env                       # AUTH_SECRET (openssl rand -hex 32), ADMIN_PASSWORD, CORS_ORIGIN
docker compose up -d --build
docker compose ps               # status harus "healthy"
curl -s http://127.0.0.1:8081/api/health
```

- API hanya dipublikasikan ke `127.0.0.1:8081` (ubah dengan `API_HOST_PORT` di `.env` bila bentrok). **Jangan** mengubah port mapping menjadi `8081:8080`: Docker melewati firewall ufw untuk port yang dipublikasikan, sehingga API akan terbuka ke internet.
- Data (daftar mobil dan foto) ada di volume Docker `presisi-rent-car_presisi-data` dan bertahan saat kontainer dibuat ulang.
- HTTPS dengan **Caddy**: tambahkan blok `deploy/Caddyfile.docker` ke Caddyfile server (jangan menimpa konfigurasi yang sudah ada), lalu `caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`.
- HTTPS dengan **nginx** (bila server sudah memakai nginx): salin `deploy/nginx-api.conf` ke `/etc/nginx/sites-available/presisi-api`, ganti `API_DOMAIN_ANDA`, aktifkan lewat `sites-enabled`, `nginx -t && systemctl reload nginx`, lalu `certbot --nginx -d DOMAIN_API`.
- Update versi baru: `git pull && docker compose up -d --build`.
- Backup volume:
  `docker run --rm -v presisi-rent-car_presisi-data:/data -v /var/backups/presisi:/backup alpine tar -czf /backup/presisi-$(date +%F).tar.gz -C /data .`
- Log: `docker compose logs -f api`.

## Alternatif: tanpa Docker (systemd) — hardening maksimal

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

Backup berupa arsip `.tar.gz` seluruh `/var/lib/presisi` (daftar mobil dan foto). Salin `/var/backups/presisi` ke luar VPS secara berkala (rsync/rclone).

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
- [ ] Login ke dashboard, tambah satu mobil uji (dengan foto), pastikan tampil di website, lalu hapus; backup menghasilkan file.

## Batasan

Penyimpanan berupa file JSON dan folder foto (cukup untuk katalog puluhan mobil di satu server). Satu akun utama dari environment; akun lain dibuat lewat undangan di dashboard (menu Pengguna, khusus admin). Token login berlaku 12 jam dan disimpan di `localStorage` frontend.
