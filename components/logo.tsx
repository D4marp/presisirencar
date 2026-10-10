import Link from "next/link";
import Image from "next/image";
import { BRAND_NAME, BRAND_TAGLINE } from "@/data/business";

// "full": logo lengkap dengan armada dan ikon kota (untuk ukuran besar).
// "wordmark": hanya tulisan nama (terbaca di navbar/sidebar yang rendah).
export function Logo({ variant = "full", inverse = false, priority = false }: { variant?: "full" | "wordmark"; inverse?: boolean; priority?: boolean }) {
  const wordmark = variant === "wordmark";
  return (
    <Link href="/" className={`logo-lockup${inverse ? " inverse" : ""}`} aria-label={`${BRAND_NAME} — Beranda`}>
      <Image
        src={wordmark ? "/logo-nakay-wordmark.webp" : "/logo-nakay.webp"}
        alt={`${BRAND_NAME}, ${BRAND_TAGLINE}, Semarang`}
        width={wordmark ? 1200 : 1200}
        height={wordmark ? 254 : 801}
        sizes={wordmark ? "(max-width: 768px) 170px, 230px" : "(max-width: 768px) 160px, 260px"}
        className={`logo-image ${wordmark ? "wordmark" : "full"}`}
        priority={priority}
      />
    </Link>
  );
}
