"use client";

import Link from "next/link";
import { ChevronDown, MessageCircle } from "lucide-react";
import { useState } from "react";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const groups = [
  { title: "Pemesanan & persyaratan", items: [["Apa syarat menyewa mobil?", "Untuk lepas kunci, siapkan KTP, SIM A aktif, dan dokumen pendukung. Persyaratan dapat berbeda sesuai jenis kendaraan dan durasi sewa."], ["Berapa lama proses verifikasi?", "Umumnya 15–30 menit setelah dokumen lengkap diterima oleh tim kami."], ["Apakah bisa booking mendadak?", "Bisa selama kendaraan masih tersedia. Untuk pilihan armada yang lebih lengkap, kami menyarankan booking minimal H-1."]] },
  { title: "Harga & pembayaran", items: [["Apa yang sudah termasuk harga sewa?", "Harga mencakup penggunaan kendaraan dan perawatan. BBM, tol, parkir, serta biaya pengemudi dicantumkan terpisah."], ["Bagaimana cara pembayarannya?", "Pembayaran dilakukan setelah ketersediaan unit dikonfirmasi. Tim kami akan memberikan rincian dan rekening resmi."], ["Apakah ada deposit?", "Beberapa tipe sewa lepas kunci memerlukan deposit yang akan dikembalikan setelah kendaraan selesai diperiksa."]] },
  { title: "Pengambilan & perjalanan", items: [["Apakah mobil bisa diantar?", "Ya, tersedia pengantaran ke alamat, hotel, Bandara Ahmad Yani, Stasiun Tawang, dan area Kota Semarang."], ["Bolehkah kendaraan dibawa ke luar kota?", "Boleh. Informasikan rute saat booking agar kami dapat menyiapkan kendaraan dan paket yang sesuai."], ["Apa yang harus dilakukan jika ada kendala?", "Hubungi hotline 24 jam kami. Tim akan membantu melalui telepon dan mengatur bantuan bila diperlukan."]] },
];

export default function FAQPage() {
  const [active, setActive] = useState("0-0");
  return <><SiteHeader/><PageHero eyebrow="Pusat bantuan" title="Jawaban sebelum Anda berangkat." description="Informasi penting tentang pemesanan, pembayaran, pengambilan kendaraan, dan perjalanan."/>
    <main className="inner-main faq-page"><div className="container faq-page-grid"><aside><small>KATEGORI</small>{groups.map((g, i) => <a href={`#faq-${i}`} key={g.title}>{g.title}</a>)}<div><MessageCircle/><h3>Masih ada pertanyaan?</h3><p>Kami siap membantu 24 jam.</p><a href="https://wa.me/6281362218168" target="_blank">Chat WhatsApp</a></div></aside><section>{groups.map((group, gi) => <div className="faq-group" id={`faq-${gi}`} key={group.title}><h2>{group.title}</h2>{group.items.map(([q, a], ii) => { const key = `${gi}-${ii}`; return <button className={active === key ? "active" : ""} onClick={() => setActive(active === key ? "" : key)} key={q}><span><strong>{q}</strong><ChevronDown/></span>{active === key && <p>{a}</p>}</button>; })}</div>)}</section></div>
      <div className="container faq-cta"><h2>Sudah siap memilih kendaraan?</h2><Link className="btn btn-gold" href="/armada">Jelajahi armada</Link></div>
    </main><SiteFooter/></>;
}
