"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, MessageCircle, ShieldCheck } from "lucide-react";
import { HERO_VIDEO } from "@/data/business";
import { waLink, type Mode } from "@/lib/rental";

// Pilihan jenis sewa dan tipe mobil di daftar armada.
export type Search = { mode: Mode; type: string };

// Latar hero: foto selalu dimuat sebagai dasar (poster). Video hanya diputar bila ada,
// pengguna tidak meminta gerakan dikurangi, dan videonya benar-benar siap diputar.
function HeroBackdrop() {
  const [playVideo, setPlayVideo] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!HERO_VIDEO) return;
    setPlayVideo(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div className="absolute inset-0 -z-10" aria-hidden>
      <Image src="/hero-presisi.jpg" alt="" fill priority sizes="100vw" className={`object-cover object-[72%_center] ${playVideo && ready ? "" : "hero-bg-zoom"}`} />
      {HERO_VIDEO && playVideo && (
        <video
          className={`absolute inset-0 size-full object-cover object-[70%_center] transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
          src={HERO_VIDEO}
          poster="/hero-presisi.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setReady(true)}
          onError={() => setPlayVideo(false)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-slate-950/10 max-lg:bg-slate-950/65" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/40 to-transparent" />
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-slate-900">
      <HeroBackdrop />
      <div className="mx-auto flex w-full max-w-6xl items-center px-4 pb-20 pt-16 md:px-6 md:pb-28 md:pt-24 lg:min-h-[calc(100svh-84px)] lg:max-h-[860px]">
        <div className="w-full max-w-xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            <ShieldCheck className="size-4 text-emerald-300" aria-hidden /> Rental mobil Semarang · Operasional 24 jam
          </p>
          <h1 className="text-[2.1rem] font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.6rem]">
            Sewa Mobil di Semarang — Rapi, Tepat Waktu &amp; Tanpa Ribet
          </h1>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={waLink("Halo PRESISI Rent Car, saya ingin sewa mobil. Mohon info unit yang tersedia.")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-amber-500 px-7 text-base font-extrabold text-slate-900 transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <MessageCircle className="size-5" aria-hidden /> Pesan via WhatsApp
            </a>
            <a
              href="#armada"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-7 text-base font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Lihat Armada <ArrowRight className="size-5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
