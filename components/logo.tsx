import Link from "next/link";
import Image from "next/image";

export function Logo({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <Link href="/" className={`logo-lockup${inverse ? " inverse" : ""}`} aria-label="PRESISI Rent Car — Beranda">
      <Image
        src="/logo.jpeg"
        alt="PRESISI Rent Car, Aman, Nyaman, Terpercaya"
        width={80}
        height={80}
        className={`logo-image${compact ? " compact" : ""}`}
      />
    </Link>
  );
}
