import { Clock3, MapPin, ShieldCheck, Star } from "lucide-react";
import { MAPS_URL, googleSummary } from "@/data/business";

export function TrustBar() {
  const items = [
    googleSummary
      ? { icon: Star, title: `${googleSummary.rating.toFixed(1)} ★ Google Review`, text: `${googleSummary.count}+ ulasan pelanggan` }
      : { icon: Star, title: "Ulasan di Google Maps", text: "Lihat penilaian pelanggan kami" },
    { icon: Clock3, title: "Operasional 24 jam", text: "Telepon dan WhatsApp setiap hari" },
    { icon: MapPin, title: "Antar-jemput Semarang", text: "Bandara, stasiun, hotel, atau alamat Anda" },
    { icon: ShieldCheck, title: "Unit terawat & bersih", text: "Disiapkan sebelum diserahkan" },
  ];
  return (
    <section className="border-y border-slate-200 bg-slate-50" aria-label="Alasan memilih PRESISI">
      <ul className="mx-auto grid w-full max-w-6xl gap-px px-4 py-5 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="flex items-center gap-3 py-2 lg:px-4 lg:first:pl-0">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"><Icon className="size-5 text-amber-600" aria-hidden /></span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-900">{i === 0 && !googleSummary ? <a href={MAPS_URL} target="_blank" rel="noreferrer" className="hover:underline">{title}</a> : title}</span>
              <span className="block text-xs text-slate-500">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
