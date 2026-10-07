#!/usr/bin/env bash
# Backup harian data booking. Pasang di cron root:
#   15 2 * * * /opt/presisi/deploy/backup.sh
# Simpan salinan juga di luar VPS (rsync/rclone) agar aman bila server hilang.
set -euo pipefail

SRC=/var/lib/presisi/bookings.json
DEST=/var/backups/presisi
KEEP_DAYS=30

mkdir -p "$DEST"
chmod 700 "$DEST"
[ -f "$SRC" ] || exit 0
cp "$SRC" "$DEST/bookings-$(date +%F-%H%M).json"
chmod 600 "$DEST"/bookings-*.json
find "$DEST" -name 'bookings-*.json' -mtime +"$KEEP_DAYS" -delete
