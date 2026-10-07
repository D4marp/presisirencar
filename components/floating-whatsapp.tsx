"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { rp, waLink } from "@/lib/booking";
import { useCars } from "@/lib/cars-api";

// Mobile (< 768px): bar tetap di bawah dengan harga mulai-dari + tombol WhatsApp.
// Desktop: tombol WhatsApp mengambang.
export function FloatingWhatsApp() {
  const pathname = usePathname();
  const { cars } = useCars();
  const prices = cars.filter((c) => c.available).map((c) => c.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/login")) return null;
  const href = waLink("Halo PRESISI Rent Car, saya ingin tanya sewa mobil.");

  return (
    <>
      <div className="h-[76px] md:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,.08)] md:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <p className="leading-tight">
          {minPrice > 0 ? (
            <>
              <span className="block text-xs text-slate-500">Sewa mulai</span>
              <span className="text-lg font-extrabold text-slate-900">{rp(minPrice).replace(/\.000$/, "rb")}<span className="text-sm font-semibold text-slate-500">/hr</span></span>
            </>
          ) : (
            <span className="text-sm font-bold text-slate-900">Rental mobil Semarang</span>
          )}
        </p>
        <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white active:bg-emerald-800">
          <MessageCircle className="size-5" aria-hidden /> Chat CS / Booking
        </a>
      </div>
      <a href={href} target="_blank" rel="noreferrer" aria-label="Chat PRESISI Rent Car melalui WhatsApp" className="fixed bottom-6 right-6 z-50 hidden h-14 items-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-emerald-800 md:inline-flex">
        <MessageCircle className="size-5" aria-hidden /> Chat sekarang
      </a>
    </>
  );
}
