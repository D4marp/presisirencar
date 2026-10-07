import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Clock3, MapPinned, Plane, Route, Users } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { waLink } from "@/lib/rental";

const services = [
  { icon: <Clock3/>, no: "01", title: "Sewa harian", text: "Kendaraan fleksibel untuk aktivitas harian, acara keluarga, atau kebutuhan mendadak di Semarang." },
  { icon: <BriefcaseBusiness/>, no: "02", title: "Perjalanan bisnis", text: "Armada representatif dengan pengemudi profesional untuk kunjungan kerja dan kebutuhan perusahaan." },
  { icon: <Plane/>, no: "03", title: "Antar jemput", text: "Layanan tepat waktu dari dan menuju Bandara Ahmad Yani, stasiun, hotel, atau titik pilihan Anda." },
  { icon: <Route/>, no: "04", title: "Perjalanan luar kota", text: "Paket perjalanan nyaman dari Semarang menuju Yogyakarta, Solo, Jepara, Kudus, dan kota lainnya." },
  { icon: <Users/>, no: "05", title: "Rombongan", text: "Hiace dan kendaraan berkapasitas besar untuk wisata, gathering, dan perjalanan keluarga besar." },
  { icon: <MapPinned/>, no: "06", title: "Sewa bulanan", text: "Solusi kendaraan jangka panjang untuk perusahaan dengan biaya terukur dan dukungan prioritas." },
];

export default function LayananPage() {
  return <><SiteHeader/><PageHero eyebrow="Layanan PRESISI" title="Fleksibel mengikuti perjalanan Anda." description="Pilihan layanan rental untuk kebutuhan personal, bisnis, dan perjalanan rombongan dari Semarang."/>
    <main className="inner-main services-page"><div className="container"><div className="section-intro"><div><div className="eyebrow"><span/>Satu standar layanan</div><h2>Setiap kebutuhan,<br/>ditangani dengan presisi.</h2></div><p>Anda hanya perlu memberi tahu rencana perjalanan. Tim kami membantu memilih kendaraan, skema sewa, dan titik penjemputan yang paling efisien.</p></div>
      <div className="services-grid">{services.map(service => <article key={service.no}><div className="service-no">{service.no}</div><span>{service.icon}</span><h3>{service.title}</h3><p>{service.text}</p><a href={waLink(`Halo PRESISI Rent Car, saya tertarik dengan layanan ${service.title}.`)} target="_blank" rel="noreferrer">Pesan via WhatsApp <ArrowRight size={15}/></a></article>)}</div>
      <section className="business-banner"><div><small>UNTUK KEBUTUHAN PERUSAHAAN</small><h2>Mobilitas bisnis tanpa menambah beban operasional.</h2><p>Kontrak bulanan, invoice terpusat, kendaraan pengganti, dan account support khusus.</p></div><Link className="btn btn-gold btn-lg" href="/kontak">Diskusikan kebutuhan <ArrowRight size={17}/></Link></section>
    </div></main><SiteFooter/></>;
}
