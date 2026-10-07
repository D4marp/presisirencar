"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  Clock3,
  Gauge,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CountUp, Reveal } from "@/components/motion";
import { cars, rupiah } from "@/data/cars";

function localDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const tabs = ["Semua", "City Car", "Family MPV", "Business MPV", "Premium SUV", "Mobil Listrik"];

const faqs = [
  ["Apa saja syarat untuk menyewa mobil?", "Cukup siapkan KTP, SIM A aktif, dan dokumen pendukung. Tim kami akan membantu verifikasi dengan proses yang ringkas."],
  ["Apakah tersedia layanan dengan pengemudi?", "Ya. Anda dapat memilih lepas kunci atau paket dengan pengemudi profesional, termasuk kebutuhan dalam dan luar kota."],
  ["Bisakah mobil diantar ke bandara atau hotel?", "Bisa. Kami melayani antar-jemput di area Kota Semarang, Bandara Ahmad Yani, stasiun, hotel, dan titik yang disepakati."],
];

export default function Home() {
  const [activeFaq, setActiveFaq] = useState(0);
  const [pickup, setPickup] = useState("Semarang Kota");
  const [date, setDate] = useState(() => localDate(1));
  const [duration, setDuration] = useState("2 hari");
  const [tab, setTab] = useState("Semua");
  const [calcCar, setCalcCar] = useState("avanza-xenia");
  const [days, setDays] = useState(3);
  const [withDriver, setWithDriver] = useState(false);
  const shown = cars.filter((c) => c.available && (tab === "Semua" || c.category === tab)).slice(0, 6);
  const picked = cars.find((c) => c.slug === calcCar) ?? cars[0];
  const driverFee = picked.rentalType === "Dengan Sopir" ? 0 : withDriver ? 250000 : 0;
  const total = (picked.price + driverFee) * days;

  const bookNow = () => {
    const message = `Halo PRESISI Rencar, saya ingin cek ketersediaan mobil. Lokasi: ${pickup}, tanggal: ${date}, durasi: ${duration}.`;
    window.open(`https://wa.me/6281362218168?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <main className="site-shell">
      <SiteHeader />

      <section className="hero">
        <div className="hero-media"><Image src="/hero-presisi.jpg" alt="Armada premium PRESISI Rencar di Semarang" fill priority sizes="100vw" className="hero-image" /><div className="hero-shade" /></div>
        <div className="container hero-content">
          <div className="eyebrow light"><span /> Rental mobil Semarang</div>
          <h1>Semarang,<br />jalan <em>tanpa ribet.</em></h1>
          <p>Pilih mobilnya. Kami siapkan unit, antar ke titik jemput, lalu Anda tinggal berangkat.</p>
          <div className="hero-cta">
            <button className="btn btn-gold btn-lg" onClick={bookNow}>Pilih kendaraan <ArrowRight size={18} /></button>
            <a href="tel:+6281362218168" className="phone-link"><span><Phone size={18} /></span><small>Hotline Office Order<strong>0813-6221-8168</strong></small></a>
          </div>
        </div>
        <div className="container booking-wrap">
          <div className="booking-panel">
            <div className="booking-title"><span><CarFront size={21} /></span><div><small>Mulai perjalanan</small><strong>Cek ketersediaan mobil</strong></div></div>
            <label><small>Lokasi penjemputan</small><span><MapPin size={17} /><select value={pickup} onChange={(e) => setPickup(e.target.value)}><option>Semarang Kota</option><option>Bandara Ahmad Yani</option><option>Stasiun Tawang</option><option>Luar Kota</option></select></span></label>
            <label><small>Tanggal mulai</small><span><CalendarDays size={17} /><input type="date" min={localDate(0)} value={date} onChange={(e) => setDate(e.target.value)} /></span></label>
            <label><small>Durasi sewa</small><span><Clock3 size={17} /><select value={duration} onChange={(e) => setDuration(e.target.value)}><option>1 hari</option><option>2 hari</option><option>3 hari</option><option>1 minggu</option></select></span></label>
            <button className="btn btn-navy search-btn" onClick={bookNow}>Tanya ketersediaan <ArrowRight size={17} /></button>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="container trust-grid">
          <div><strong><CountUp to={4.9} decimals={1} /></strong><span><span className="stars">★★★★★</span> dari pelanggan</span></div>
          <div><strong>24/7</strong><span>Dukungan perjalanan</span></div>
          <div><strong><CountUp to={30} suffix="+" /></strong><span>Armada siap jalan</span></div>
          <div><strong><CountUp to={100} suffix="%" /></strong><span>Harga transparan</span></div>
        </div>
      </section>

      <section className="section fleet-section" id="armada">
        <div className="container">
          <div className="section-heading">
            <div><div className="eyebrow"><span /> Pilihan kendaraan</div><h2>Armada untuk setiap cerita.</h2></div>
            <p>Dari agenda harian sampai perjalanan bisnis, pilih kendaraan yang paling pas dengan kebutuhan Anda.</p>
          </div>
          <div className="fleet-tabs" role="tablist">{tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}</div>
          <div className="fleet-grid" key={tab}>
            {shown.map((car, i) => (
              <Reveal key={car.slug} delay={i * 70}>
                <article className="car-card">
                  <Link href={`/armada/${car.slug}`} className="car-image">
                    <Image src={car.image} alt={car.name} fill sizes="(max-width: 768px) 100vw, 33vw" />
                    {car.badge && <span className="car-badge">{car.badge}</span>}
                  </Link>
                  <div className="car-content">
                    <small>{car.category} · {car.rentalType}</small>
                    <h3>{car.name}</h3>
                    <div className="car-meta"><span><Users size={16} /> {car.seats} kursi</span><span><Gauge size={16} /> {car.transmission}</span></div>
                    <div className="car-footer"><div><small>Mulai dari</small><strong>Rp {rupiah(car.price)}<em>/hari</em></strong></div><Link className="car-action" href={`/booking?car=${car.slug}`} aria-label={`Pesan ${car.name}`}><ArrowRight size={18} /></Link></div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="center-action"><Link className="btn btn-outline" href="/armada">Lihat semua armada <ArrowRight size={16} /></Link></div>
        </div>
      </section>

      <section className="section service-section" id="layanan">
        <div className="container service-layout">
          <div className="service-visual">
            <Image src="/fleet-suv.jpg" alt="Layanan pengantaran mobil PRESISI Rencar" fill sizes="50vw" />
            <div className="quote-card"><div className="quote-mark">“</div><p>Respons cepat, mobilnya bersih, dan prosesnya tidak ribet.</p><span>— Rina, pelanggan bisnis</span></div>
          </div>
          <div className="service-copy">
            <div className="eyebrow"><span /> Standar layanan kami</div>
            <h2>Lebih dari sekadar<br />menyewakan mobil.</h2>
            <p>Kami memastikan setiap detail perjalanan sudah siap sebelum Anda berangkat—dari kebersihan kabin hingga bantuan di jalan.</p>
            <div className="benefit-list">
              <div><span><ShieldCheck /></span><div><h3>Terawat & terlindungi</h3><p>Pemeriksaan rutin dan perlindungan perjalanan di setiap unit.</p></div></div>
              <div><span><Sparkles /></span><div><h3>Bersih sebelum berangkat</h3><p>Kabin disanitasi dan kendaraan disiapkan untuk setiap penyewa.</p></div></div>
              <div><span><Clock3 /></span><div><h3>Respons cepat 24/7</h3><p>Tim kami siap membantu kapan pun rencana Anda berubah.</p></div></div>
            </div>
            <button className="btn btn-navy" onClick={bookNow}>Konsultasikan perjalanan <ArrowRight size={16} /></button>
          </div>
        </div>
      </section>

      <section className="section steps-section" id="tentang">
        <div className="container">
          <div className="section-heading compact"><div><div className="eyebrow light"><span /> Cara menyewa</div><h2>Tiga langkah. Mobil siap.</h2></div><p>Proses ringkas, tanpa formulir panjang dan biaya tersembunyi.</p></div>
          <div className="steps-grid">
            {[['01','Pilih kendaraan','Tentukan mobil, tanggal, dan lokasi penjemputan.'],['02','Konfirmasi pesanan','Tim kami memastikan unit dan rincian biaya.'],['03','Mulai perjalanan','Mobil diantar bersih dan siap di lokasi Anda.']].map((step, i) => (
              <div className="step" key={step[0]}><div className="step-number">{step[0]}</div><div><h3>{step[1]}</h3><p>{step[2]}</p></div>{i < 2 && <ArrowRight className="step-arrow" />}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="section testimonial-section">
        <div className="container">
          <div className="section-heading"><div><div className="eyebrow"><span /> Cerita pelanggan</div><h2>Perjalanan baik,<br />diceritakan kembali.</h2></div><div className="testimonial-rating"><strong>4.9</strong><span><i>★★★★★</i> Berdasarkan pengalaman pelanggan</span></div></div>
          <div className="testimonial-grid">
            {[['“Booking malam, besok pagi mobil sudah sampai hotel. Kondisinya bersih dan komunikasinya jelas.”','RA','Raka Aditya','Perjalanan keluarga'],['“Innova yang datang sesuai foto. Driver sopan, tepat waktu, dan paham rute luar kota.”','NS','Nadia Sari','Perjalanan bisnis'],['“Biayanya dijelaskan dari awal, jadi tidak ada tambahan mendadak saat pengembalian.”','BW','Bima Wijaya','Sewa lepas kunci']].map(item => <article key={item[2]}><div className="testimonial-stars">★★★★★</div><blockquote>{item[0]}</blockquote><div><span>{item[1]}</span><p><strong>{item[2]}</strong><small>{item[3]}</small></p></div></article>)}
          </div>
        </div>
      </section>

      <section className="section calc-section">
        <div className="container calc-layout">
          <Reveal>
            <div className="eyebrow"><span /> Estimasi biaya</div>
            <h2>Hitung dulu,<br />baru putuskan.</h2>
            <p>Geser durasi sewa dan lihat perkiraan biayanya langsung. Harga final dikonfirmasi tim kami sebelum Anda membayar.</p>
          </Reveal>
          <Reveal delay={120}>
            <div className="calc-card">
              <label><small>Kendaraan</small><select value={calcCar} onChange={(e) => setCalcCar(e.target.value)}>{cars.filter((c) => c.available).map((c) => <option key={c.slug} value={c.slug}>{c.name} — Rp {rupiah(c.price)}/hari</option>)}</select></label>
              <label><small>Durasi sewa <b>{days} hari</b></small><input type="range" min={1} max={14} value={days} onChange={(e) => setDays(Number(e.target.value))} /></label>
              {picked.rentalType === "Lepas Kunci" ? (
                <label className="calc-check"><input type="checkbox" checked={withDriver} onChange={(e) => setWithDriver(e.target.checked)} /> Tambah pengemudi (+Rp {rupiah(250000)}/hari)</label>
              ) : (
                <p className="calc-note">Unit ini sudah termasuk pengemudi.</p>
              )}
              <div className="calc-total"><span>Perkiraan total</span><strong>Rp {rupiah(total)}</strong></div>
              <a className="btn btn-gold btn-lg" target="_blank" rel="noreferrer" href={`https://wa.me/6281362218168?text=${encodeURIComponent(`Halo PRESISI Rencar, saya tertarik menyewa ${picked.name} selama ${days} hari${driverFee ? " dengan pengemudi" : ""}. Estimasi Rp ${rupiah(total)}.`)}`}>Pesan lewat WhatsApp <ArrowRight size={18} /></a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section faq-section">
        <div className="container faq-layout">
          <div><div className="eyebrow"><span /> Perlu diketahui</div><h2>Pertanyaan yang<br />sering diajukan.</h2><p>Belum menemukan jawaban? Hubungi tim kami untuk rekomendasi kendaraan dan paket yang tepat.</p><a href="tel:+6281362218168" className="inline-phone"><Phone size={17} /> 0813-6221-8168</a></div>
          <div className="faq-list">
            {faqs.map(([q, a], i) => <button key={q} className={`faq-item ${activeFaq === i ? 'active' : ''}`} onClick={() => setActiveFaq(activeFaq === i ? -1 : i)}><span><strong>{q}</strong><ChevronDown size={20} /></span>{activeFaq === i && <p>{a}</p>}</button>)}
          </div>
        </div>
      </section>

      <section className="container cta-banner" id="kontak">
        <div><div className="eyebrow light"><span /> Siap berangkat?</div><h2>Ceritakan rencana perjalanan Anda.</h2><p>Tim PRESISI Rencar akan membantu memilihkan mobil dan paket yang paling sesuai.</p></div>
        <button className="btn btn-gold btn-lg" onClick={bookNow}>Hubungi via WhatsApp <ArrowRight size={18} /></button>
      </section>

      <SiteFooter />
    </main>
  );
}
