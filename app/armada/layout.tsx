import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Armada Rental Mobil Semarang",
  description: "Pilihan armada terawat: city car, MPV keluarga, SUV, minibus, dan mobil premium, lepas kunci atau dengan pengemudi.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
