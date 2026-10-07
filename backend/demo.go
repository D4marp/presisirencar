package main

import (
	"fmt"
	"time"
)

// seedBookings membuat pesanan contoh (tanggal relatif terhadap hari ini)
// agar dashboard terlihat hidup saat demo ke klien.
func seedBookings(cars []Car) []Booking {
	type row struct {
		name, phone, slug, place, status string
		offset, days                     int
		driver                           bool
		notes                            string
	}
	rows := []row{
		{"Aditya Pratama", "081234560001", "innova-reborn", "Bandara Ahmad Yani", "Dikonfirmasi", 1, 3, true, "Penjemputan jam 08.00"},
		{"Nadia Putri", "081234560002", "avanza-xenia", "Hotel Tentrem Semarang", "Menunggu", 2, 2, false, ""},
		{"Budi Santoso", "081234560003", "fortuner-pajero", "Jl. Pandanaran, Semarang", "Berjalan", -1, 3, true, "Perjalanan ke Yogyakarta"},
		{"PT Maju Sejahtera", "081234560004", "hiace-commuter", "Kantor, Jl. Pemuda", "Selesai", -5, 2, false, "Gathering karyawan"},
		{"Kevin Wijaya", "081234560005", "brio-satya", "Stasiun Tawang", "Dikonfirmasi", 3, 2, false, ""},
		{"Rina Kusuma", "081234560006", "xpander", "Banyumanik, Semarang", "Menunggu", 4, 4, false, "Liburan keluarga"},
		{"Fajar Nugroho", "081234560007", "alphard", "Hotel Padma", "Dikonfirmasi", 5, 1, false, "Tamu perusahaan"},
		{"Salsa Maharani", "081234560008", "air-ev", "Simpang Lima", "Selesai", -7, 2, false, ""},
		{"Dimas Hartono", "081234560009", "innova-zenix", "Bandara Ahmad Yani", "Berjalan", 0, 2, true, ""},
		{"CV Berkah Jaya", "081234560010", "avanza-xenia", "Gudang, Jl. Kaligawe", "Dibatalkan", -3, 1, false, "Jadwal berubah"},
		{"Lestari Wulandari", "081234560011", "mobilio", "Ungaran", "Selesai", -10, 3, false, ""},
		{"Hendra Gunawan", "081234560012", "agya", "Tembalang", "Menunggu", 6, 2, false, ""},
	}
	bySlug := map[string]Car{}
	for _, c := range cars {
		bySlug[c.Slug] = c
	}
	now := time.Now()
	out := make([]Booking, 0, len(rows))
	for i, r := range rows {
		car := bySlug[r.slug]
		total := car.Price * r.days
		if r.driver && car.RentalType != "Dengan Sopir" {
			total += 250000 * r.days
		}
		start := now.AddDate(0, 0, r.offset)
		out = append(out, Booking{
			ID:             fmt.Sprintf("PR-%04d", 1012-i),
			CustomerName:   r.name,
			Phone:          r.phone,
			CarSlug:        r.slug,
			PickupLocation: r.place,
			StartDate:      start.Format("2006-01-02"),
			Duration:       r.days,
			WithDriver:     r.driver || car.RentalType == "Dengan Sopir",
			Notes:          r.notes,
			Status:         r.status,
			Total:          total,
			CreatedAt:      start.AddDate(0, 0, -2),
		})
	}
	return out
}
