import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function TentangPage() {
  return <><SiteHeader/><PageHero eyebrow="Tentang NaKay Trans" title="Kepercayaan dibangun di setiap kilometer." description="Rental mobil lokal dari Semarang dengan standar layanan yang sederhana: jujur, terawat, dan selalu siap membantu."/>
    <main className="inner-main about-page"><div className="container">
      <section className="about-story"><div className="about-photo"><Image src="/hero-presisi.jpg" alt="Armada NaKay Trans" fill sizes="50vw"/><div><strong>30+</strong><span>armada siap jalan</span></div></div><div className="about-copy"><div className="eyebrow"><span/>Cerita kami</div><h2>Rental yang terasa lebih personal.</h2><p>NaKay Trans hadir untuk membuat proses menyewa kendaraan lebih jelas dan menyenangkan. Tidak ada biaya yang disembunyikan, tidak ada proses yang dibuat rumit.</p><p>Berbasis di Banyumanik, kami melayani perjalanan dari Semarang dengan armada yang diperiksa sebelum setiap keberangkatan dan dukungan yang mudah dihubungi.</p><ul><li><Check/>Harga disampaikan sejak awal</li><li><Check/>Kendaraan sesuai pesanan</li><li><Check/>Tim lokal yang responsif</li></ul><Link href="/armada" className="btn btn-navy">Lihat armada <ArrowRight size={16}/></Link></div></section>
      <section className="values-section"><div className="section-intro"><div><div className="eyebrow"><span/>Nilai kami</div><h2>Aman. Nyaman.<br/>Terpercaya.</h2></div><p>Tiga prinsip yang menjadi ukuran setiap keputusan layanan kami.</p></div><div className="values-grid"><article><ShieldCheck/><span>01</span><h3>Aman</h3><p>Pemeriksaan kendaraan dan dokumen dilakukan rutin sebelum unit berjalan.</p></article><article><Sparkles/><span>02</span><h3>Nyaman</h3><p>Kabin bersih, komunikasi jelas, dan proses booking tanpa kerumitan.</p></article><article><HeartHandshake/><span>03</span><h3>Terpercaya</h3><p>Unit, harga, dan layanan yang diterima sesuai dengan yang dijanjikan.</p></article></div></section>
    </div></main><SiteFooter/></>;
}
