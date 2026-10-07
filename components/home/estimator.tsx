"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { DRIVER_FEE_PER_DAY, deliveryOptions } from "@/data/business";
import type { Car } from "@/data/cars";
import { formatDate, rp, waLink, type Mode } from "@/lib/booking";
import type { Search } from "./hero";

export function Estimator({ cars, search }: { cars: Car[]; search: Search }) {
  const available = cars.filter((c) => c.available);
  const [slug, setSlug] = useState("avanza-xenia");
  const [days, setDays] = useState(3);
  const [mode, setMode] = useState<Mode>("Lepas Kunci");
  const [delivery, setDelivery] = useState("kantor");

  const car = available.find((c) => c.slug === slug) ?? available[0];
  if (!car) return null;
  const place = deliveryOptions.find((d) => d.id === delivery) ?? deliveryOptions[0];
  const driverIncluded = car.rentalType === "Dengan Sopir";
  const base = car.price * days;
  const driver = mode === "Dengan Driver" && !driverIncluded ? DRIVER_FEE_PER_DAY * days : 0;
  const fee = place.fee ?? 0;
  const total = base + driver + fee;

  const message = `Halo PRESISI Rent Car, saya minta price quote: ${car.name} (${driverIncluded ? "Dengan Sopir" : mode}), ${days} hari mulai ${formatDate(search.date)}, serah terima: ${place.label}. Estimasi ${rp(total)}${place.fee === null ? " (belum termasuk biaya antar)" : ""}.`;

  return (
    <section id="estimasi" className="scroll-mt-24 border-y border-slate-200 bg-slate-50 py-14 md:py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 md:px-6 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Hitung biaya sewa dalam 10 detik</h2>
          <p className="mt-3 max-w-md text-slate-600">Pilih mobil dan durasi, lihat rincian biayanya langsung. Harga final dikonfirmasi CS sebelum Anda membayar.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md md:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Model mobil</span>
              <select value={slug} onChange={(e) => setSlug(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10">
                {available.map((c) => <option key={c.slug} value={c.slug}>{c.name} — {rp(c.price)}/hari</option>)}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500"><span>Durasi sewa</span><span className="text-sm font-extrabold text-slate-900">{days} hari</span></span>
              <input type="range" min={1} max={7} step={1} value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-8 w-full accent-amber-500" aria-valuetext={`${days} hari`} />
              <span className="flex justify-between text-[11px] text-slate-400" aria-hidden><span>1</span><span>7 hari</span></span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Serah terima</span>
              <select value={delivery} onChange={(e) => setDelivery(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10">
                {deliveryOptions.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </label>

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Pengemudi</span>
              {driverIncluded ? (
                <p className="flex h-12 items-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-700">Sudah termasuk driver</p>
              ) : (
                <div className="grid h-12 grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm" role="radiogroup" aria-label="Pengemudi">
                  {(["Lepas Kunci", "Dengan Driver"] as Mode[]).map((m) => (
                    <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`rounded-lg font-bold transition-colors ${mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{m === "Lepas Kunci" ? "Tanpa driver" : "Driver"}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <dl className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-600">Harga sewa ({rp(car.price)} × {days} hari)</dt><dd className="font-semibold text-slate-900">{rp(base)}</dd></div>
            {!driverIncluded && <div className="flex justify-between gap-4"><dt className="text-slate-600">Driver ({rp(DRIVER_FEE_PER_DAY)} × {days} hari)</dt><dd className="font-semibold text-slate-900">{driver ? rp(driver) : "Tidak dipakai"}</dd></div>}
            <div className="flex justify-between gap-4"><dt className="text-slate-600">Biaya antar · {place.label}</dt><dd className="text-right font-semibold text-slate-900">{place.fee === null ? "Dikonfirmasi CS" : place.fee === 0 ? "Gratis" : rp(place.fee)}</dd></div>
            <div className="flex items-end justify-between gap-4 border-t border-slate-200 pt-4">
              <dt className="font-bold text-slate-900">Total estimasi</dt>
              <dd className="text-right"><span className="block text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">{rp(total)}</span>{place.fee === null && <span className="text-xs text-slate-500">belum termasuk biaya antar</span>}</dd>
            </div>
          </dl>

          <a href={waLink(message)} target="_blank" rel="noreferrer" className="mt-5 flex h-14 items-center justify-center gap-2 rounded-xl bg-emerald-700 text-base font-bold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
            <MessageCircle className="size-5" aria-hidden /> Amankan Price Quote Ini di WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
