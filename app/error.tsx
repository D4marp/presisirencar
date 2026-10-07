"use client";

import Link from "next/link";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="state-page">
      <div className="container">
        <div className="eyebrow"><span /> Terjadi kendala</div>
        <h1>Maaf, ada yang tidak berjalan semestinya.</h1>
        <p>Silakan coba lagi. Jika masih bermasalah, hubungi kami langsung lewat WhatsApp.</p>
        <div className="state-actions">
          <button className="btn btn-navy btn-lg" onClick={() => retry()}>Coba lagi</button>
          <a className="btn btn-outline btn-lg" href="https://wa.me/6281362218168" target="_blank" rel="noreferrer">Hubungi WhatsApp</a>
          <Link className="btn btn-outline btn-lg" href="/">Ke beranda</Link>
        </div>
      </div>
    </main>
  );
}
