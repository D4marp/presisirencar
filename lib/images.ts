import { apiBase } from "@/lib/api";

// Foto mobil bisa berupa file di folder public ("/fleet-mpv.jpg"), foto yang diunggah lewat
// dashboard ("/api/uploads/xxx.jpg", disajikan oleh backend), atau URL https eksternal.
// Dua yang terakhir dimuat apa adanya (tanpa pengoptimal gambar Next.js).
export function carImage(src: string): { src: string; unoptimized: boolean } {
  if (src.startsWith("/api/uploads/")) return { src: apiBase().replace(/\/api$/, "") + src, unoptimized: true };
  if (src.startsWith("https://")) return { src, unoptimized: true };
  return { src, unoptimized: false };
}
