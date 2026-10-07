import type { Metadata } from "next";
import "./globals.css";
import "./visual-refresh.css";
import "./modern.css";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";

export const metadata: Metadata = {
  title: "PRESISI Rencar — Rental Mobil Semarang",
  description:
    "Rental mobil aman, nyaman, dan terpercaya di Semarang. Pilihan armada terawat dengan atau tanpa pengemudi.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}<FloatingWhatsApp /></body>
    </html>
  );
}
