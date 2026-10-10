"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Fuel, Gauge, ShieldCheck, Users } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { rupiah } from "@/data/cars";
import { useCars } from "@/lib/cars-api";
import { carImage } from "@/lib/images";
import { waLink } from "@/lib/rental";

export function CarDetail({ slug }: { slug: string }) {
  const { cars, live } = useCars();
  const car = cars.find((item) => item.slug === slug);

  if (!car) {
    return (
      <>
        <SiteHeader />
        <main className="state-page">
          <div className="container">
            <div className="eyebrow"><span /> {live ? "Tidak ditemukan" : "Memuat"}</div>
            <h1>{live ? "Kendaraan tidak ditemukan." : "Memuat data kendaraan..."}</h1>
            {live && (
              <>
                <p>Unit ini mungkin sudah tidak tersedia di katalog kami.</p>
                <div className="state-actions"><Link className="btn btn-navy btn-lg" href="/armada">Lihat semua armada</Link></div>
              </>
            )}
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return <><SiteHeader /><main className="car-detail-page"><div className="container">
    <Link href="/armada" className="back-link"><ArrowLeft size={16}/> Kembali ke armada</Link>
    <div className="detail-grid"><div className="detail-photo"><Image {...carImage(car.image)} alt={car.name} fill priority sizes="60vw"/><span>{car.category}</span></div>
      <aside className="detail-card"><div className={`availability ${car.available ? "ready" : "booked"}`}><i/>{car.available ? "Tersedia untuk dipesan" : "Sedang terjadwal"}</div><h1>{car.name}</h1><p>{car.rentalType} · Nyaman, bersih, dan siap mendampingi perjalanan Anda dari Semarang.</p><div className="detail-price"><small>Mulai dari</small><strong>Rp{rupiah(car.price)} <span>/ hari</span></strong></div><div className="detail-specs"><div><Users/><span>Kapasitas<strong>{car.seats} kursi</strong></span></div><div><Gauge/><span>Transmisi<strong>{car.transmission}</strong></span></div><div><Fuel/><span>Bahan bakar<strong>{car.fuel}</strong></span></div></div><a className="btn btn-gold btn-lg detail-book" href={waLink(`Halo NaKay Trans, saya ingin sewa ${car.name}. Mohon info ketersediaan dan total biayanya.`)} target="_blank" rel="noreferrer">Pesan via WhatsApp <ArrowRight size={17}/></a><a className="detail-call" href="tel:+6281362218168">Konsultasi: 0813-6221-8168</a></aside>
    </div>
    <div className="detail-lower"><section><div className="eyebrow"><span/>Fasilitas kendaraan</div><h2>Semua yang dibutuhkan untuk perjalanan nyaman.</h2><div className="feature-grid">{car.features.map((feature) => <div key={feature}><Check/>{feature}</div>)}</div></section><aside><ShieldCheck/><div><strong>Jaminan NaKay Trans</strong><p>Unit diperiksa, dibersihkan, dan disanitasi sebelum serah terima.</p></div></aside></div>
  </div></main><SiteFooter /></>;
}
