import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pertanyaan Umum",
  description: "Syarat sewa, layanan pengemudi, antar-jemput, dan pertanyaan lain seputar rental mobil PRESISI Rencar.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
