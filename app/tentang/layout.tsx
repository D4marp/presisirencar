import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description: "Rental mobil lokal dari Semarang dengan standar layanan aman, nyaman, dan terpercaya.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
