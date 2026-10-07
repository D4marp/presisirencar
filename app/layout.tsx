import type { Metadata } from "next";
import "./globals.css";
import "./visual-refresh.css";
import "./modern.css";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const description =
  "Rental mobil aman, nyaman, dan terpercaya di Semarang. Pilihan armada terawat dengan atau tanpa pengemudi.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "PRESISI Rent Car — Rental Mobil Semarang", template: "%s | PRESISI Rent Car" },
  description,
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "PRESISI Rent Car",
    title: "PRESISI Rent Car — Rental Mobil Semarang",
    description,
    images: [{ url: "/hero-presisi.jpg", width: 1600, height: 900, alt: "Armada PRESISI Rent Car di Semarang" }],
  },
  twitter: { card: "summary_large_image" },
};

const businessSchema = {
  "@context": "https://schema.org",
  "@type": "AutoRental",
  name: "PRESISI Rent Car",
  description,
  url: siteUrl,
  telephone: "+6281362218168",
  image: `${siteUrl}/logo.jpeg`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Jl. Sukun I No.46, Srondol Wetan, Banyumanik",
    addressLocality: "Semarang",
    addressRegion: "Jawa Tengah",
    postalCode: "50264",
    addressCountry: "ID",
  },
  hasMap: "https://maps.app.goo.gl/HAZA91Ak9pzMX3GA7",
  openingHours: "Mo-Su 00:00-23:59",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        {children}
        <FloatingWhatsApp />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }} />
      </body>
    </html>
  );
}
