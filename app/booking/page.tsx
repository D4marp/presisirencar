"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, MapPin, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cars, rupiah } from "@/data/cars";
import { apiBase } from "@/lib/api";

type Result = { id: string; total: number };

export default function BookingPage() { return <Suspense><BookingContent /></Suspense>; }

function BookingContent() {
  const params = useSearchParams();
  const initial = params.get("car") || "innova-reborn";
  const [carSlug, setCarSlug] = useState(cars.some(c => c.slug === initial) ? initial : cars[0].slug);
  const [duration, setDuration] = useState(1);
  const [driver, setDriver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const car = useMemo(() => cars.find(item => item.slug === carSlug)!, [carSlug]);
  const driverIncluded = car.rentalType === "Dengan Sopir";
  const withDriver = driverIncluded || driver;
  const estimate = car.price * duration + (driver && !driverIncluded ? 250000 * duration : 0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError("");
    const form = new FormData(e.currentTarget);
    const payload = { customer_name: form.get("name"), phone: form.get("phone"), email: form.get("email"), car_slug: carSlug, pickup_location: form.get("location"), start_date: form.get("date"), duration, with_driver: withDriver, notes: form.get("notes") };
    try {
      const response = await fetch(`${apiBase()}/bookings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pemesanan gagal dikirim");
      setResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Backend tidak dapat dihubungi"); }
    finally { setLoading(false); }
  }

  return <><SiteHeader /><PageHero eyebrow="Reservasi kendaraan" title="Rencana perjalanan, kami siapkan." description="Isi detail perjalanan Anda. Tim kami akan mengonfirmasi ketersediaan dan rincian penjemputan." />
    <main className="inner-main booking-page"><div className="container booking-page-grid">
      {result ? <section className="booking-success"><CheckCircle2/><div className="eyebrow"><span/>Booking diterima</div><h1>Terima kasih. Kami segera menghubungi Anda.</h1><p>Nomor pesanan Anda <strong>{result.id}</strong> dengan estimasi total <strong>Rp{rupiah(result.total)}</strong>.</p><a className="btn btn-gold" href={`https://wa.me/6281362218168?text=${encodeURIComponent(`Halo, saya ingin konfirmasi pesanan ${result.id}`)}`} target="_blank">Konfirmasi via WhatsApp <ArrowRight size={16}/></a></section> : <form className="booking-form" onSubmit={submit}><div className="form-section-title"><span>01</span><div><h2>Data penyewa</h2><p>Pastikan nomor WhatsApp aktif.</p></div></div><div className="form-grid"><label>Nama lengkap<input name="name" required placeholder="Nama sesuai identitas" /></label><label>Nomor WhatsApp<input name="phone" required inputMode="tel" placeholder="08xxxxxxxxxx" /></label><label className="full">Email <span>(opsional)</span><input type="email" name="email" placeholder="nama@email.com" /></label></div>
        <div className="form-section-title"><span>02</span><div><h2>Detail perjalanan</h2><p>Pilih kendaraan dan jadwal.</p></div></div><div className="form-grid"><label className="full">Kendaraan<select value={carSlug} onChange={e => { setCarSlug(e.target.value); setDriver(false); }}>{cars.filter(c => c.available).map(c => <option value={c.slug} key={c.slug}>{c.name} · {c.rentalType} — Rp{rupiah(c.price)}/hari</option>)}</select></label><label>Tanggal mulai<input type="date" name="date" min="2026-10-07" required /></label><label>Durasi (hari)<input type="number" min="1" max="30" value={duration} onChange={e => setDuration(Math.max(1, Number(e.target.value)))} required /></label><label className="full">Lokasi penjemputan<div className="input-icon"><MapPin/><input name="location" required placeholder="Alamat, hotel, bandara, atau stasiun" /></div></label><label className="full checkbox-label"><input type="checkbox" checked={withDriver} disabled={driverIncluded} onChange={e => setDriver(e.target.checked)} /><span><strong>Dengan pengemudi profesional</strong><small>{driverIncluded ? "Sudah termasuk dalam paket kendaraan" : "Tambahan Rp250.000 per hari"}</small></span></label><label className="full">Catatan <span>(opsional)</span><textarea name="notes" placeholder="Kursi bayi, rute luar kota, waktu penjemputan, dll." /></label></div>{error && <div className="form-error">{error}. Pastikan backend Go berjalan di port 8080.</div>}<button disabled={loading} className="btn btn-navy btn-lg submit-booking">{loading ? "Mengirim..." : "Kirim permintaan booking"}<ArrowRight size={17}/></button></form>}
      <aside className="booking-summary"><small>RINGKASAN PESANAN</small><h2>{car.name}</h2><div className="summary-row"><span>Tipe layanan</span><strong>{car.rentalType}</strong></div><div className="summary-row"><span>Harga sewa</span><strong>Rp{rupiah(car.price)} × {duration} hari</strong></div><div className="summary-row"><span>Pengemudi</span><strong>{driverIncluded ? "Sudah termasuk" : driver ? `Rp${rupiah(250000 * duration)}` : "Tanpa pengemudi"}</strong></div><div className="summary-total"><span>Estimasi total</span><strong>Rp{rupiah(estimate)}</strong></div><p>Belum termasuk BBM, tol, parkir, dan akomodasi pengemudi untuk perjalanan luar kota.</p><div className="summary-trust"><ShieldCheck/><span><strong>Pembayaran aman</strong>Bayar setelah ketersediaan dikonfirmasi.</span></div><div className="summary-trust"><CalendarDays/><span><strong>Perubahan fleksibel</strong>Jadwal dapat disesuaikan sebelum H-1.</span></div></aside>
    </div></main><SiteFooter /></>;
}
