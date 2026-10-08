#!/usr/bin/env bash
# Uji alur admin pada API: login, buat mobil uji, ubah, nonaktifkan, hapus.
# Aman dijalankan di production: mobil uji selalu dihapus lagi di akhir. Password dibaca tanpa tampil.
#   bash scripts/smoke-admin.sh                       # API default: https://api.presisirencar.com/api
#   API=http://127.0.0.1:8081/api bash scripts/smoke-admin.sh
set -u
API="${API:-https://api.presisirencar.com/api}"
read -rp "Username admin [admin]: " U; U="${U:-admin}"
read -rsp "Password admin: " PW; echo
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
FAILED=0; TOKEN=""; SLUG="zz-uji-$(date +%s)"
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAILED=1; }
req() { curl -s -m 20 "$@"; }
cleanup() { [ -n "$TOKEN" ] && req -o /dev/null -X DELETE -H "Authorization: Bearer $TOKEN" "$API/cars/$SLUG"; }
trap cleanup EXIT

RES=$(req -w '\n%{http_code}' -X POST "$API/auth/login" -d "{\"username\":\"$(esc "$U")\",\"password\":\"$(esc "$PW")\"}")
unset PW
CODE=$(echo "$RES" | tail -1); BODY=$(echo "$RES" | sed '$d')
if [ "$CODE" != "200" ]; then fail "login (HTTP $CODE) - cek username/password"; exit 1; fi
TOKEN=$(echo "$BODY" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$TOKEN" ] && pass "login admin" || { fail "token tidak diterima"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

[ "$(req -o /dev/null -w '%{http_code}' -H "$AUTH" "$API/auth/me")" = "200" ] && pass "sesi valid (/auth/me)" || fail "/auth/me"

CAR="{\"slug\":\"$SLUG\",\"name\":\"UJI OTOMATIS (akan dihapus)\",\"category\":\"Uji\",\"price\":100000,\"seats\":4,\"transmission\":\"Manual\",\"fuel\":\"Bensin\",\"image\":\"/fleet-mpv.jpg\",\"rental_type\":\"Lepas Kunci\",\"features\":[\"Uji\"]}"
[ "$(req -o /dev/null -w '%{http_code}' -X POST -H "$AUTH" "$API/cars" -d "$CAR")" = "201" ] && pass "tambah mobil" || fail "tambah mobil"
req "$API/cars" | grep -q "\"$SLUG\"" && pass "mobil uji tampil di daftar publik" || fail "mobil uji tidak tampil di daftar publik"

UPD=$(echo "$CAR" | sed 's/"price":100000/"price":120000/')
req -X PUT -H "$AUTH" "$API/cars/$SLUG" -d "$UPD" | grep -q '"price":120000' && pass "ubah harga" || fail "ubah harga"
req -X PATCH -H "$AUTH" "$API/cars/$SLUG/availability" -d '{"available":false}' | grep -q '"available":false' && pass "nonaktifkan unit" || fail "nonaktifkan unit"

if [ "${SMOKE_UPLOAD:-0}" = "1" ]; then
  PNG=$(mktemp); (echo 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' | (base64 -d 2>/dev/null || base64 -D)) > "$PNG"
  P=$(req -X POST -H "$AUTH" -F "file=@$PNG" "$API/uploads" | sed -n 's/.*"path":"\([^"]*\)".*/\1/p'); rm -f "$PNG"
  [ -n "$P" ] && pass "unggah foto ($P) - catatan: file uji ini tertinggal di server" || fail "unggah foto"
fi

[ "$(req -o /dev/null -w '%{http_code}' -X DELETE -H "$AUTH" "$API/cars/$SLUG")" = "204" ] && pass "hapus mobil uji" || fail "hapus mobil uji"
[ "$(req -o /dev/null -w '%{http_code}' "$API/cars/$SLUG")" = "404" ] && pass "mobil uji sudah hilang" || fail "mobil uji masih ada"
TOKEN=""
echo; [ "$FAILED" = 0 ] && echo "SEMUA LULUS" || { echo "ADA YANG GAGAL"; exit 1; }
