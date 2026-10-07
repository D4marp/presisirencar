"use client";

import { MessageCircle, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardFrame, type FrameContext } from "@/components/dashboard/frame";
import { UnauthorizedError, authedFetch } from "@/lib/api";

type Customer = { name: string; phone: string; email?: string; bookings: number; total_spent: number; last_booking: string };

const rp = (n: number) => `Rp${new Intl.NumberFormat("id-ID").format(n)}`;

function waNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export default function Pelanggan() {
  return (
    <DashboardFrame active="pelanggan" title="Pelanggan" subtitle="Daftar pelanggan dihimpun otomatis dari data pesanan.">
      {(ctx) => <List {...ctx} />}
    </DashboardFrame>
  );
}

function List({ onUnauthorized }: FrameContext) {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const body = await authedFetch<{ data: Customer[] }>("/customers");
      setCustomers(body.data);
      setError("");
    } catch (err) {
      if (err instanceof UnauthorizedError) return onUnauthorized();
      setError("Server tidak dapat dihubungi.");
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    const digits = q.replace(/\D/g, "");
    return (customers ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || (digits && c.phone.replace(/\D/g, "").includes(digits)));
  }, [customers, query]);

  return (
    <>
      <div className="dash-toolbar">
        <div><span className={`live-dot ${error ? "offline" : ""}`} /> {error || `${customers?.length ?? 0} pelanggan`}</div>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-slate-500"><Search size={16} /><input className="w-52 bg-transparent text-sm text-slate-900 outline-none" placeholder="Cari nama atau nomor..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari pelanggan" /></label>
      </div>
      <section className="panel booking-table">
        <div className="table-scroll">
          <table>
            <thead><tr><th>PELANGGAN</th><th>KONTAK</th><th>PESANAN</th><th>TOTAL BELANJA</th><th>TERAKHIR SEWA</th><th /></tr></thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.phone}>
                  <td><div className="customer"><span>{c.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span><strong>{c.name}</strong></div></td>
                  <td>{c.phone}{c.email && <div className="text-xs text-slate-500">{c.email}</div>}</td>
                  <td>{c.bookings}×</td>
                  <td><strong>{rp(c.total_spent)}</strong></td>
                  <td>{c.last_booking}</td>
                  <td><a className="grid size-9 place-items-center rounded-lg text-emerald-700 hover:bg-emerald-50" href={`https://wa.me/${waNumber(c.phone)}`} target="_blank" rel="noreferrer" aria-label={`Chat WhatsApp ${c.name}`}><MessageCircle size={18} /></a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {customers && visible.length === 0 && <div className="empty-state">Pelanggan tidak ditemukan.</div>}
        {!customers && !error && <div className="empty-state">Memuat...</div>}
      </section>
    </>
  );
}
