"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Fuel, Gauge, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { rupiah } from "@/data/cars";
import { useCars } from "@/lib/cars-api";
import { carImage } from "@/lib/images";

export default function ArmadaPage() {
  const { cars } = useCars();
  const [filter, setFilter] = useState("Semua");
  const [mode, setMode] = useState("Semua layanan");
  const [query, setQuery] = useState("");
  const categories = ["Semua", ...Array.from(new Set(cars.map(c => c.category)))];
  const results = useMemo(() => cars.filter(car => {
    const matchQuery = `${car.name} ${car.category}`.toLowerCase().includes(query.toLowerCase());
    const matchCategory = filter === "Semua" || car.category === filter;
    const matchMode = mode === "Semua layanan" || car.rentalType === mode;
    return matchQuery && matchCategory && matchMode;
  }), [cars, filter, mode, query]);

  return <><SiteHeader /><PageHero eyebrow="Koleksi kendaraan" title="Temukan kendaraan yang tepat." description="Armada terawat untuk perjalanan harian, urusan bisnis, liburan keluarga, hingga perjalanan rombongan." />
    <main className="inner-main fleet-catalog"><div className="container">
      <div className="catalog-toolbar"><div className="catalog-tabs">{categories.map(item => <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div><label className="catalog-search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari kendaraan" /></label></div>
      <div className="rental-mode-filter"><span>Tipe layanan</span>{["Semua layanan", "Lepas Kunci", "Dengan Sopir"].map(item => <button className={mode === item ? "active" : ""} onClick={() => setMode(item)} key={item}>{item}</button>)}</div>
      <div className="catalog-count"><strong>{results.length} kendaraan</strong><span>Harga sudah termasuk perawatan dan bantuan perjalanan.</span></div>
      <div className="catalog-grid">{results.map(car => <article className="catalog-card" key={car.slug}>
        <Link href={`/armada/${car.slug}`} className="catalog-image"><Image {...carImage(car.image)} alt={car.name} fill sizes="(max-width: 768px) 100vw, 50vw" />{car.badge && <span>{car.badge}</span>}<i className={car.available ? "ready" : "booked"}>{car.available ? "Tersedia" : "Terjadwal"}</i></Link>
        <div className="catalog-info"><small>{car.category} · {car.rentalType}</small><h2>{car.name}</h2><div className="catalog-spec"><span><Users/> {car.seats} kursi</span><span><Gauge/> {car.transmission}</span><span><Fuel/> {car.fuel}</span></div><div className="catalog-footer"><div><span>Mulai dari</span><strong>Rp{rupiah(car.price)} <small>/ hari</small></strong></div><Link href={`/armada/${car.slug}`}>Lihat detail <ArrowRight size={16}/></Link></div></div>
      </article>)}</div>
      {results.length === 0 && <div className="catalog-empty"><Search/><h3>Kendaraan tidak ditemukan</h3><p>Coba gunakan kata kunci atau kategori lain.</p></div>}
    </div></main><SiteFooter /></>;
}
