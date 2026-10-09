import Image from "next/image";
import Link from "next/link";
import { Fuel, MessageCircle, Settings2, Users } from "lucide-react";
import type { Car } from "@/data/cars";
import { carImage } from "@/lib/images";
import { dailyPrice, rp, typeGroups, waLink, type Mode } from "@/lib/rental";
import type { Search } from "./hero";

export function Fleet({ cars, search, onChange }: { cars: Car[]; search: Search; onChange: (next: Search) => void }) {
  const group = typeGroups.find((g) => g.label === search.type) ?? typeGroups[0];
  const list = cars.filter((c) => group.match(c.category));

  return (
    <section id="armada" className="scroll-mt-24 bg-white py-14 md:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Pilih armada Anda</h2>
            <p className="mt-2 max-w-xl text-slate-600">
              Harga per 24 jam untuk <strong className="font-semibold text-slate-900">{search.mode}</strong>
              {search.mode === "Dengan Driver" ? " (sudah termasuk driver)" : ""}.
            </p>
          </div>
          <div className="inline-grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm" role="tablist" aria-label="Jenis sewa">
            {(["Lepas Kunci", "Dengan Driver"] as Mode[]).map((m) => (
              <button key={m} role="tab" aria-selected={search.mode === m} onClick={() => onChange({ ...search, mode: m })} className={`rounded-lg px-4 py-2 font-bold transition-colors ${search.mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{m}</button>
            ))}
          </div>
        </div>

        <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Tipe mobil">
          {typeGroups.map((g) => (
            <button key={g.label} role="tab" aria-selected={search.type === g.label} onClick={() => onChange({ ...search, type: g.label })} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${search.type === g.label ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}>{g.label}</button>
          ))}
        </div>

        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((car) => {
            const price = dailyPrice(car, search.mode);
            const includesDriver = car.rentalType === "Dengan Sopir";
            const message = `Halo PRESISI Rent Car, saya ingin sewa ${car.name} (${search.mode}) . Mohon info ketersediaan dan total biayanya.`;
            return (
              <li key={car.slug} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <Link href={`/armada/${car.slug}`} className="relative block aspect-[4/3] bg-slate-100">
                  <Image {...carImage(car.image)} alt={car.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                  <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${car.available ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-700 ring-1 ring-slate-300"}`}>
                    <span className={`size-1.5 rounded-full ${car.available ? "bg-emerald-600" : "bg-slate-500"}`} aria-hidden />
                    {car.available ? "Tersedia" : "Sedang terjadwal"}
                  </span>
                  {car.badge && <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-slate-900">{car.badge}</span>}
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{car.category}</p>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-900"><Link href={`/armada/${car.slug}`} className="hover:underline">{car.name}</Link></h3>
                  <ul className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                    <li className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5"><Settings2 className="size-3.5" aria-hidden />{car.transmission}</li>
                    <li className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5"><Users className="size-3.5" aria-hidden />{car.seats} kursi</li>
                    <li className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5"><Fuel className="size-3.5" aria-hidden />{car.fuel}</li>
                    <li className="rounded-lg bg-slate-100 px-2.5 py-1.5">{includesDriver ? "Termasuk driver" : "Lepas kunci tersedia"}</li>
                  </ul>
                  <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-2xl font-extrabold tracking-tight text-slate-900">{rp(price)}</p>
                      <p className="text-xs text-slate-500">/ 24 jam{search.mode === "Dengan Driver" && !includesDriver ? " · termasuk driver" : ""}</p>
                    </div>
                    
                  </div>
                  <a
                    href={car.available ? waLink(message) : waLink(`Halo PRESISI Rent Car, apakah ${car.name} bisa dijadwalkan? Mohon info tanggal yang tersedia.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                  >
                    <MessageCircle className="size-5" aria-hidden /> {car.available ? "Pesan via WhatsApp" : "Tanya jadwal via WhatsApp"}
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
        {list.length === 0 && <p className="mt-8 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-600">Belum ada unit untuk tipe ini. Hubungi CS untuk rekomendasi.</p>}
        <p className="mt-6 text-sm text-slate-500">Ketersediaan pada tanggal tertentu dikonfirmasi final oleh CS. Harga belum termasuk BBM, tol, parkir, dan biaya antar luar area.</p>
      </div>
    </section>
  );
}
