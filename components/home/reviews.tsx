import { ArrowUpRight, BadgeCheck, MapPin, Star } from "lucide-react";
import { MAPS_URL, googleSummary, reviews } from "@/data/business";

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${n} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`size-4 ${i <= n ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} aria-hidden />)}
    </span>
  );
}

export function Reviews() {
  return (
    <section id="ulasan" className="scroll-mt-24 bg-white py-14 md:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Dipercaya pelanggan di Semarang</h2>
            {googleSummary && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-slate-700">
                <span className="text-2xl font-extrabold text-slate-900">{googleSummary.rating.toFixed(1)}</span>
                <Stars n={Math.round(googleSummary.rating)} />
                <span className="text-sm">Google Review · {googleSummary.count}+ pelanggan</span>
              </p>
            )}
          </div>
          <a href={MAPS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 transition-colors hover:border-slate-900">
            Lihat semua ulasan di Google Maps <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </div>

        {reviews.length > 0 ? (
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.author + r.text.slice(0, 12)} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between"><Stars n={r.rating} />{r.when && <span className="text-xs text-slate-500">{r.when}</span>}</div>
                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-700">“{r.text}”</blockquote>
                <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <span className="grid size-10 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white" aria-hidden>{r.author.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{r.author}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500"><BadgeCheck className="size-3.5 text-emerald-600" aria-hidden /> {r.tag} · Google Review</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              ["Lokasi kantor nyata", "Kami punya kantor di Banyumanik, Semarang. Anda bisa datang langsung, cek unit, dan bertemu tim kami."],
              ["Penilaian terbuka", "Ulasan pelanggan kami tampil apa adanya di Google Maps, bisa Anda baca sebelum memutuskan."],
              ["Respons langsung", "Telepon dan WhatsApp aktif 24 jam. Tanyakan unit dan harga sebelum memesan."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <MapPin className="size-6 text-amber-600" aria-hidden />
                <h3 className="mt-4 text-lg font-extrabold text-slate-900">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
