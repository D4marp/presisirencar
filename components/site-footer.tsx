import Link from "next/link";
import { Instagram, Phone } from "lucide-react";
import { Logo } from "./logo";

export function SiteFooter() {
  return <footer>
    <div className="container footer-main">
      <div className="footer-brand"><Logo inverse /><p>Aman, nyaman, dan terpercaya untuk setiap perjalanan dari Semarang.</p><div className="socials"><a href="#" aria-label="Instagram"><Instagram size={18} /></a><a href="tel:+6281362218168" aria-label="Telepon"><Phone size={18} /></a></div></div>
      <div><h4>Jelajahi</h4><Link href="/armada">Armada</Link><Link href="/layanan">Layanan</Link><Link href="/tentang">Tentang kami</Link><Link href="/faq">FAQ</Link></div>
      <div><h4>Kontak</h4><a href="tel:+6281362218168">0813-6221-8168</a><a href="https://maps.app.goo.gl/HAZA91Ak9pzMX3GA7?g_st=aw" target="_blank">Jl. Sukun I No.46<br />Srondol Wetan, Banyumanik<br />Semarang 50264</a></div>
      <div><h4>Akses</h4><p>Senin — Minggu<br /><strong>24 jam</strong></p><Link href="/dashboard">Dashboard admin</Link></div>
    </div>
    <div className="container footer-bottom"><span>© 2026 PRESISI Rencar</span><span>Aman · Nyaman · Terpercaya</span></div>
  </footer>;
}
