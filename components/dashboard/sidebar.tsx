"use client";

import Link from "next/link";
import { CarFront, ChevronRight, ClipboardList, LayoutDashboard, Users, X } from "lucide-react";
import { Logo } from "@/components/logo";

export type DashboardSection = "overview" | "armada" | "pelanggan";

export function DashboardSidebar({ active, open, onClose, bookingCount }: { active: DashboardSection; open: boolean; onClose: () => void; bookingCount?: number }) {
  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand"><Logo /><button onClick={onClose} aria-label="Tutup menu"><X /></button></div>
        <nav className="side-nav">
          <small>MENU UTAMA</small>
          <Link className={active === "overview" ? "active" : ""} href="/dashboard" onClick={onClose}><LayoutDashboard /> Ikhtisar</Link>
          <Link href="/dashboard#pesanan" onClick={onClose}><ClipboardList /> Pesanan {bookingCount !== undefined && <span>{bookingCount}</span>}</Link>
          <Link className={active === "armada" ? "active" : ""} href="/dashboard/armada" onClick={onClose}><CarFront /> Armada</Link>
          <Link className={active === "pelanggan" ? "active" : ""} href="/dashboard/pelanggan" onClick={onClose}><Users /> Pelanggan</Link>
        </nav>
        <div className="support-card"><span>Butuh bantuan?</span><p>Tim support siap membantu operasional Anda.</p><a href="tel:+6281362218168">Hubungi support <ChevronRight size={15} /></a></div>
        <Link href="/" className="back-site">← Kembali ke website</Link>
      </aside>
      {open && <button className="sidebar-backdrop" onClick={onClose} aria-label="Tutup menu" />}
    </>
  );
}
