import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Layanan",
  description: "Layanan rental mobil lepas kunci dan dengan pengemudi, antar-jemput bandara, stasiun, dan hotel di Semarang.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
