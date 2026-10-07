// Data bisnis yang tampil di website. Isi dengan data ASLI klien.
// Nilai yang dibiarkan null / kosong tidak akan ditampilkan sebagai klaim.

export const WA_NUMBER = "6281362218168";
export const PHONE_DISPLAY = "0813-6221-8168";
export const PHONE_HREF = "tel:+6281362218168";
export const MAPS_URL = "https://www.google.com/maps/place/Presisi+Rent+Car/@-7.0642941,110.4161471,887m/data=!3m1!1e3!4m9!1m2!2m1!1spresisiren!3m5!1s0x2e7089e35ea8abf3:0x48c0f39d0f2161f9!8m2!3d-7.0642941!4d110.4161471!16s%2Fg%2F11zy526ld3!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MTAwNC4wIKXMDSoASAFQAw%3D%3D";
export const MAPS_EMBED_URL = "https://www.google.com/maps?q=-7.0642941%2C110.4161471&z=17&output=embed";
export const ADDRESS = "Jl. Sukun I No.46, Srondol Wetan, Banyumanik, Semarang 50264";

// Video latar hero (opsional). Taruh file di public/, mis. "/hero.mp4" (MP4 H.264, 1080p,
// tanpa suara, 5-10 detik loop, idealnya < 8 MB). null = pakai foto /hero-presisi.jpg.
export const HERO_VIDEO: string | null = null;

// Harus sama dengan biaya pengemudi di backend (backend/main.go).
export const DRIVER_FEE_PER_DAY = 250000;

// Biaya antar per lokasi (Rp). null = belum ditetapkan, ditampilkan sebagai
// "Dikonfirmasi CS" dan tidak dimasukkan ke total.
export const deliveryOptions: { id: string; label: string; fee: number | null }[] = [
  { id: "kantor", label: "Ambil di kantor (Banyumanik)", fee: 0 },
  { id: "bandara", label: "Bandara Ahmad Yani", fee: null },
  { id: "tawang", label: "Stasiun Semarang Tawang", fee: null },
  { id: "poncol", label: "Stasiun Semarang Poncol", fee: null },
  { id: "hotel", label: "Hotel / alamat di Semarang", fee: null },
];

// Ringkasan Google Review. Isi HANYA jika angkanya benar (lihat Google Business Profile).
// Contoh: { rating: 4.8, count: 87 }. Biarkan null sampai terverifikasi.
export const googleSummary: { rating: number; count: number } | null = null;

export type Review = { author: string; tag: string; rating: 1 | 2 | 3 | 4 | 5; text: string; when?: string };

// Salin ulasan ASLI dari Google Maps (dengan izin pemberi ulasan). Kosong = bagian ulasan
// menampilkan tautan ke Google Maps saja.
export const reviews: Review[] = [];
