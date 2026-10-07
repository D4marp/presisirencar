"use client";

import Link from "next/link";
import { CarFront, ChevronRight, X } from "lucide-react";
import { Logo } from "@/components/logo";

export type DashboardSection = "armada";

export function DashboardSidebar({ active, open, onClose }: { active: DashboardSection; open: boolean; onClose: () => void }) {
  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand"><Logo /><button onClick={onClose} aria-label="Tutup menu"><X /></button></div>
        <nav className="side-nav">
          <small>MENU</small>
          <Link className={active === "armada" ? "active" : ""} href="/dashboard" onClick={onClose}><CarFront /> Armada</Link>
        </nav>
        <div className="support-card"><span>Butuh bantuan?</span><p>Pesanan pelanggan masuk lewat WhatsApp. Di sini Anda mengelola daftar mobil.</p><a href="tel:+6281362218168">Hubungi support <ChevronRight size={15} /></a></div>
        <Link href="/" className="back-site">← Kembali ke website</Link>
      </aside>
      {open && <button className="sidebar-backdrop" onClick={onClose} aria-label="Tutup menu" />}
    </>
  );
}
