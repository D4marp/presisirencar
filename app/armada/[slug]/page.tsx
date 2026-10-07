import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Fuel, Gauge, ShieldCheck, Users } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cars, rupiah } from "@/data/cars";

export function generateStaticParams() { return cars.map(car => ({ slug: car.slug })); }

export default async function CarDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const car = cars.find(item => item.slug === slug);
  if (!car) notFound();
  return <><SiteHeader /><main className="car-detail-page"><div className="container">
    <Link href="/armada" className="back-link"><ArrowLeft size={16}/> Kembali ke armada</Link>
    <div className="detail-grid"><div className="detail-photo"><Image src={car.image} alt={car.name} fill priority sizes="60vw"/><span>{car.category}</span></div>
      <aside className="detail-card"><div className={`availability ${car.available ? "ready" : "booked"}`}><i/>{car.available ? "Tersedia untuk dipesan" : "Sedang terjadwal"}</div><h1>{car.name}</h1><p>{car.rentalType} · Nyaman, bersih, dan siap mendampingi perjalanan Anda dari Semarang.</p><div className="detail-price"><small>Mulai dari</small><strong>Rp{rupiah(car.price)} <span>/ hari</span></strong></div><div className="detail-specs"><div><Users/><span>Kapasitas<strong>{car.seats} kursi</strong></span></div><div><Gauge/><span>Transmisi<strong>{car.transmission}</strong></span></div><div><Fuel/><span>Bahan bakar<strong>{car.fuel}</strong></span></div></div><Link className="btn btn-gold btn-lg detail-book" href={`/booking?car=${car.slug}`}>Booking kendaraan <ArrowRight size={17}/></Link><a className="detail-call" href="tel:+6281362218168">Konsultasi: 0813-6221-8168</a></aside>
    </div>
    <div className="detail-lower"><section><div className="eyebrow"><span/>Fasilitas kendaraan</div><h2>Semua yang dibutuhkan untuk perjalanan nyaman.</h2><div className="feature-grid">{car.features.map(feature => <div key={feature}><Check/>{feature}</div>)}</div></section><aside><ShieldCheck/><div><strong>Jaminan PRESISI</strong><p>Unit diperiksa, dibersihkan, dan disanitasi sebelum serah terima.</p></div></aside></div>
  </div></main><SiteFooter /></>;
}
