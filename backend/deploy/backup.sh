#!/usr/bin/env bash
# Backup harian seluruh data (booking, mobil, penghitung nomor, foto unggahan).
# Pasang di cron root:
#   15 2 * * * /opt/presisi/deploy/backup.sh
# Salin juga ke luar VPS (rsync/rclone) agar aman bila server hilang.
set -euo pipefail

SRC=/var/lib/presisi
DEST=/var/backups/presisi
KEEP_DAYS=30

[ -d "$SRC" ] || exit 0
mkdir -p "$DEST"
chmod 700 "$DEST"
umask 077
tar -czf "$DEST/presisi-$(date +%F-%H%M).tar.gz" -C "$SRC" .
find "$DEST" -name 'presisi-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
