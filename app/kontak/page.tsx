"use client";

import { FormEvent } from "react";
import { ArrowRight, Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MAPS_EMBED_URL, MAPS_URL } from "@/data/business";

export default function KontakPage() {
  function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = `Halo PRESISI Rent Car, saya ${data.get("name")}. ${data.get("message")}`;
    window.open(`https://wa.me/6281362218168?text=${encodeURIComponent(text)}`, "_blank");
  }
  return <><SiteHeader/><PageHero eyebrow="Hubungi kami" title="Kami dekat saat Anda membutuhkan." description="Konsultasikan kendaraan, jadwal, dan rute perjalanan dengan tim lokal kami di Semarang."/>
    <main className="inner-main contact-page"><div className="container contact-grid"><section><div className="eyebrow"><span/>Kontak PRESISI</div><h2>Mari siapkan perjalanan Anda.</h2><p>Sampaikan rencana Anda melalui formulir atau hubungi hotline. Tim kami akan memberi rekomendasi dan rincian harga yang jelas.</p><div className="contact-list"><a href="tel:+6281362218168"><span><Phone/></span><div><small>Hotline Office Order</small><strong>0813-6221-8168</strong></div></a><a href="https://wa.me/6281362218168" target="_blank"><span><MessageCircle/></span><div><small>WhatsApp</small><strong>Chat dengan tim</strong></div></a><a href="mailto:hello@presisirencar.id"><span><Mail/></span><div><small>Email</small><strong>hello@presisirencar.id</strong></div></a><div><span><Clock3/></span><div><small>Jam layanan</small><strong>24 jam, setiap hari</strong></div></div></div></section>
      <form className="contact-form" onSubmit={send}><small>KIRIM PESAN</small><h2>Apa yang bisa kami bantu?</h2><label>Nama lengkap<input name="name" required placeholder="Nama Anda"/></label><label>Nomor WhatsApp<input name="phone" required placeholder="08xxxxxxxxxx"/></label><label>Pesan<textarea name="message" required placeholder="Ceritakan kebutuhan perjalanan Anda"/></label><button className="btn btn-navy btn-lg">Kirim via WhatsApp <ArrowRight size={17}/></button></form></div>
      <section className="container location-card"><div><MapPin/><small>OFFICE PRESISI RENT CAR</small><h2>Jl. Sukun I No.46</h2><p>Kel. Srondol Wetan, Kec. Banyumanik<br/>Kota Semarang, Jawa Tengah 50264</p><a href={MAPS_URL} target="_blank" rel="noreferrer">Buka di Google Maps <ArrowRight size={15}/></a></div><div className="map-embed"><iframe title="Lokasi kantor PRESISI Rent Car di Google Maps" src={MAPS_EMBED_URL} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div></section>
    </main><SiteFooter/></>;
}
