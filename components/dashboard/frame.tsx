"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { clearSession, getSession, type SessionUser } from "@/lib/api";
import { DashboardSidebar, type DashboardSection } from "./sidebar";

export type FrameContext = { user: SessionUser; flash: (text: string) => void; onUnauthorized: () => void };

// Kerangka halaman dashboard: penjagaan login, sidebar, header, dan notifikasi (toast).
export function DashboardFrame({ active, title, subtitle, children }: { active: DashboardSection; title: string; subtitle: string; children: (ctx: FrameContext) => React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUser(session.user);
  }, [router]);

  const flash = useCallback((text: string) => {
    setNotice(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(""), 3200);
  }, []);

  const onUnauthorized = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

  if (!user) return <main className="dashboard-shell" aria-busy="true" />;

  return (
    <main className="dashboard-shell">
      {notice && <div className="toast" role="status"><span><span className="toast-dot" />{notice}</span><button onClick={() => setNotice("")} aria-label="Tutup"><X size={15} /></button></div>}
      <DashboardSidebar active={active} open={open} onClose={() => setOpen(false)} />
      <section className="dashboard-content">
        <header className="dash-header">
          <button className="dash-menu" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu /></button>
          <div><h1>{title}</h1><p>{subtitle}</p></div>
          <div className="dash-head-actions">
            <div className="profile-button"><span>{user.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span><div><strong>{user.name}</strong><small>{user.role === "admin" ? "Administrator" : "Staf operasional"}</small></div></div>
            <button className="icon-button" aria-label="Keluar" title="Keluar" onClick={onUnauthorized}><LogOut size={18} /></button>
          </div>
        </header>
        <div className="dash-main">{children({ user, flash, onUnauthorized })}</div>
      </section>
    </main>
  );
}
