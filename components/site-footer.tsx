import Link from "next/link";
import { Phone } from "lucide-react";
import { BRAND_NAME, BRAND_TAGLINE, HERO_VIDEO, HERO_VIDEO_CREDIT } from "@/data/business";
import { Logo } from "./logo";
import { MAPS_URL } from "@/data/business";

export function SiteFooter() {
  return <footer>
    <div className="container footer-main">
      <div className="footer-brand"><Logo inverse /><p>{BRAND_TAGLINE}. Perjalanan nyaman dari Semarang.</p><div className="socials"><a href="tel:+6281362218168" aria-label="Telepon"><Phone size={18} /></a></div></div>
      <div><h4>Jelajahi</h4><Link href="/armada">Armada</Link><Link href="/layanan">Layanan</Link><Link href="/tentang">Tentang kami</Link><Link href="/faq">FAQ</Link></div>
      <div><h4>Kontak</h4><a href="tel:+6281362218168">0813-6221-8168</a><a href={MAPS_URL} target="_blank" rel="noreferrer">Jl. Sukun I No.46<br />Srondol Wetan, Banyumanik<br />Semarang 50264</a></div>
      <div><h4>Akses</h4><p>Senin — Minggu<br /><strong>24 jam</strong></p><Link href="/login">Masuk staf</Link></div>
    </div>
    <div className="container footer-bottom"><span>© 2026 {BRAND_NAME}</span>{HERO_VIDEO && HERO_VIDEO_CREDIT && <a href={HERO_VIDEO_CREDIT.href} target="_blank" rel="noreferrer" style={{ opacity: .7 }}>{HERO_VIDEO_CREDIT.text}</a>}<span>{BRAND_TAGLINE}</span></div>
  </footer>;
}
