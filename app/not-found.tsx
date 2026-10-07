import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="state-page">
        <div className="container">
          <div className="eyebrow"><span /> Error 404</div>
          <h1>Halaman tidak ditemukan.</h1>
          <p>Alamat yang Anda tuju tidak ada atau sudah dipindahkan. Silakan kembali ke beranda atau lihat armada kami.</p>
          <div className="state-actions"><Link className="btn btn-navy btn-lg" href="/">Ke beranda</Link><Link className="btn btn-outline btn-lg" href="/armada">Lihat armada</Link></div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
