// Data bisnis yang tampil di website. Isi dengan data ASLI klien.
// Nilai yang dibiarkan null / kosong tidak akan ditampilkan sebagai klaim.

export const WA_NUMBER = "6281362218168";
export const PHONE_DISPLAY = "0813-6221-8168";
export const PHONE_HREF = "tel:+6281362218168";
export const MAPS_URL = "https://maps.app.goo.gl/HAZA91Ak9pzMX3GA7?g_st=aw";
export const ADDRESS = "Jl. Sukun I No.46, Srondol Wetan, Banyumanik, Semarang 50264";

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
