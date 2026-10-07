import { DRIVER_FEE_PER_DAY, WA_NUMBER } from "@/data/business";
import type { Car } from "@/data/cars";

export type Mode = "Lepas Kunci" | "Dengan Driver";

export function waLink(message: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function localDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function endDate(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const end = new Date(y, m - 1, d + Math.max(days - 1, 0));
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
}

// Mobil "Dengan Sopir" sudah termasuk driver; mobil lepas kunci +driver bila dipilih.
export function dailyPrice(car: Car, mode: Mode) {
  const driverExtra = mode === "Dengan Driver" && car.rentalType === "Lepas Kunci" ? DRIVER_FEE_PER_DAY : 0;
  return car.price + driverExtra;
}

export const rp = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

export const typeGroups: { label: string; match: (category: string) => boolean }[] = [
  { label: "Semua tipe", match: () => true },
  { label: "City Car", match: (c) => c === "City Car" },
  { label: "MPV", match: (c) => c.includes("MPV") },
  { label: "SUV", match: (c) => c === "Premium SUV" },
  { label: "Mobil Listrik", match: (c) => c === "Mobil Listrik" },
  { label: "Minibus", match: (c) => c === "Minibus" },
  { label: "Executive", match: (c) => c === "Executive" },
];
