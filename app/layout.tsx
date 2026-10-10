import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./visual-refresh.css";
import "./modern.css";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { BRAND_NAME, BRAND_TAGLINE, MAPS_URL } from "@/data/business";
import { SITE_URL } from "@/lib/site";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

const siteUrl = SITE_URL;
const description =
  `${BRAND_NAME}: transportasi, rental mobil, dan tour & travel di Semarang. Armada terawat dengan atau tanpa pengemudi.`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${BRAND_NAME} — Rental Mobil & Travel Semarang`, template: `%s | ${BRAND_NAME}` },
  description,
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — Rental Mobil & Travel Semarang`,
    description,
    images: [{ url: "/hero-presisi.jpg", width: 1600, height: 900, alt: `Armada ${BRAND_NAME} di Semarang` }],
  },
  twitter: { card: "summary_large_image" },
};

const businessSchema = {
  "@context": "https://schema.org",
  "@type": "AutoRental",
  name: BRAND_NAME,
  slogan: BRAND_TAGLINE,
  description,
  url: siteUrl,
  telephone: "+6281362218168",
  logo: `${siteUrl}/logo-nakay.webp`,
  image: `${siteUrl}/logo-nakay.webp`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Jl. Sukun I No.46, Srondol Wetan, Banyumanik",
    addressLocality: "Semarang",
    addressRegion: "Jawa Tengah",
    postalCode: "50264",
    addressCountry: "ID",
  },
  hasMap: MAPS_URL,
  openingHours: "Mo-Su 00:00-23:59",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>
        {children}
        <FloatingWhatsApp />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }} />
      </body>
    </html>
  );
}
