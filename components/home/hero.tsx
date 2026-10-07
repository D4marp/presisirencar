"use client";

import Image from "next/image";
import { ArrowRight, CalendarDays, Car, Clock, Minus, Plus, ShieldCheck, MessageCircle } from "lucide-react";
import { HERO_VIDEO } from "@/data/business";
import { endDate, formatDate, localDate, typeGroups, waLink, type Mode } from "@/lib/rental";

export type Search = { mode: Mode; type: string; date: string; days: number };

const modes: Mode[] = ["Lepas Kunci", "Dengan Driver"];

export function Hero({ search, onChange, onSearch }: { search: Search; onChange: (next: Search) => void; onSearch: () => void }) {
  const set = <K extends keyof Search>(key: K, value: Search[K]) => onChange({ ...search, [key]: value });
  const range = search.days > 1 ? `${formatDate(search.date)} – ${formatDate(endDate(search.date, search.days))}` : formatDate(search.date);

  return (
    <section className="relative isolate overflow-hidden bg-slate-900">
      <div className="absolute inset-0 -z-10" aria-hidden>
        {HERO_VIDEO ? (
          <video className="hero-bg-zoom size-full object-cover object-[70%_center]" src={HERO_VIDEO} poster="/hero-presisi.jpg" autoPlay muted loop playsInline preload="metadata" />
        ) : (
          <Image src="/hero-presisi.jpg" alt="" fill priority sizes="100vw" className="hero-bg-zoom object-cover object-[72%_center]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-slate-950/10 max-lg:bg-slate-950/65" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/40 to-transparent" />
      </div>
      <div className="mx-auto flex w-full max-w-6xl items-center px-4 pb-14 pt-10 md:px-6 md:pb-20 md:pt-16 lg:min-h-[calc(100svh-84px)] lg:max-h-[860px]">
        <div className="w-full max-w-xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            <ShieldCheck className="size-4 text-emerald-300" aria-hidden /> Rental mobil Semarang · Operasional 24 jam
          </p>
          <h1 className="text-[2rem] font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
            Sewa Mobil di Semarang — Rapi, Tepat Waktu &amp; Tanpa Ribet
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-200 md:text-lg">
            Pilihan armada terawat untuk perjalanan bisnis, wisata keluarga, atau harian. Bisa <strong className="font-semibold text-white">Lepas Kunci</strong> / <strong className="font-semibold text-white">Dengan Driver</strong>.
          </p>

          <form
            id="cari"
            className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-md md:p-5"
            onSubmit={(e) => { e.preventDefault(); onSearch(); }}
            aria-label="Cek ketersediaan unit"
          >
            <div role="tablist" aria-label="Jenis sewa" className="mb-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              {modes.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={search.mode === m}
                  onClick={() => set("mode", m)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${search.mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><CalendarDays className="size-3.5" aria-hidden /> Tanggal mulai</span>
                <input
                  type="date"
                  min={localDate(0)}
                  value={search.date}
                  onChange={(e) => set("date", e.target.value || localDate(1))}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </label>
              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Clock className="size-3.5" aria-hidden /> Durasi</span>
                <div className="flex h-12 items-center justify-between rounded-xl border border-slate-200 bg-white px-1.5">
                  <button type="button" aria-label="Kurangi hari" onClick={() => set("days", Math.max(1, search.days - 1))} className="grid size-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30" disabled={search.days <= 1}><Minus className="size-4" /></button>
                  <span className="text-sm font-bold text-slate-900" aria-live="polite">{search.days} hari</span>
                  <button type="button" aria-label="Tambah hari" onClick={() => set("days", Math.min(30, search.days + 1))} className="grid size-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30" disabled={search.days >= 30}><Plus className="size-4" /></button>
                </div>
              </div>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Car className="size-3.5" aria-hidden /> Tipe mobil / kapasitas</span>
                <select
                  value={search.type}
                  onChange={(e) => set("type", e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                >
                  {typeGroups.map((g) => <option key={g.label}>{g.label}</option>)}
                </select>
              </label>
            </div>

            <p className="mt-3 text-xs text-slate-500">Periode sewa: <span className="font-semibold text-slate-700">{range} · {search.days} hari</span></p>

            <button type="submit" className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-base font-extrabold text-slate-900 transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
              Cek Ketersediaan Unit <ArrowRight className="size-5" aria-hidden />
            </button>
            <a
              href={waLink(`Halo PRESISI Rent Car, saya butuh mobil (${search.mode}) mulai ${formatDate(search.date)} selama ${search.days} hari. Mohon info unit yang tersedia.`)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <MessageCircle className="size-4" aria-hidden /> Butuh cepat hari ini? Chat CS langsung
            </a>
          </form>
        </div>
      </div>
    </section>
  );
}
