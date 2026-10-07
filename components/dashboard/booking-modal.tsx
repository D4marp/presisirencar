"use client";

import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DRIVER_FEE_PER_DAY } from "@/data/business";
import { UnauthorizedError, authedFetch } from "@/lib/api";
import { useCars } from "@/lib/cars-api";

type Booking = {
  id: string;
  customer_name: string;
  phone: string;
  email?: string;
  car_slug: string;
  pickup_location: string;
  start_date: string;
  duration: number;
  with_driver: boolean;
  notes?: string;
  status: string;
  total: number;
  created_at: string;
};

const STATUSES = ["Menunggu", "Dikonfirmasi", "Berjalan", "Selesai", "Dibatalkan"];
const field = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-100";
const rp = (n: number) => `Rp${new Intl.NumberFormat("id-ID").format(n)}`;

export function BookingModal({ id, isAdmin, onClose, onChanged, onUnauthorized }: { id: string; isAdmin: boolean; onClose: () => void; onChanged: (message: string) => void; onUnauthorized: () => void }) {
  const { cars } = useCars();
  const [original, setOriginal] = useState<Booking | null>(null);
  const [f, setF] = useState<Booking | null>(null);
  const [totalInput, setTotalInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authedFetch<Booking>(`/bookings/${id}`)
      .then((b) => {
        setOriginal(b);
        setF(b);
        setTotalInput(String(b.total));
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) return onUnauthorized();
        setError(err instanceof Error ? err.message : "Gagal memuat pesanan");
      });
  }, [id, onUnauthorized]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Booking>(k: K, v: Booking[K]) => setF((p) => (p ? { ...p, [k]: v } : p));

  const car = f ? cars.find((c) => c.slug === f.car_slug) : undefined;
  const pricingChanged = !!(f && original && (f.car_slug !== original.car_slug || f.duration !== original.duration || f.with_driver !== original.with_driver));
  const estimate = car && f ? car.price * f.duration + (f.with_driver && car.rentalType === "Lepas Kunci" ? DRIVER_FEE_PER_DAY * f.duration : 0) : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f || !original) return;
    setBusy(true);
    setError("");
    const payload: Record<string, unknown> = {
      customer_name: f.customer_name,
      phone: f.phone,
      email: f.email ?? "",
      car_slug: f.car_slug,
      pickup_location: f.pickup_location,
      start_date: f.start_date,
      duration: Number(f.duration),
      with_driver: f.with_driver,
      notes: f.notes ?? "",
      status: f.status,
    };
    if (isAdmin && Number(totalInput) !== original.total) payload.total = Number(totalInput);
    try {
      await authedFetch(`/bookings/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      onChanged(`${id} diperbarui`);
    } catch (err) {
      if (err instanceof UnauthorizedError) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Hapus pesanan ${id} secara permanen? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    try {
      await authedFetch(`/bookings/${id}`, { method: "DELETE" });
      onChanged(`${id} dihapus`);
    } catch (err) {
      if (err instanceof UnauthorizedError) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Gagal menghapus");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 md:p-8" role="dialog" aria-modal="true" aria-label={`Pesanan ${id}`}>
      <form onSubmit={save} className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl md:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Pesanan {id}</h2>
            {original && <p className="text-xs text-slate-500">Dibuat {new Date(original.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="grid size-9 place-items-center rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        {!f ? (
          <p className="py-8 text-center text-sm text-slate-500">{error || "Memuat..."}</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Nama pelanggan</span><input className={field} required maxLength={100} value={f.customer_name} onChange={(e) => set("customer_name", e.target.value)} /></label>
              <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Nomor telepon / WhatsApp</span><input className={field} required inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></label>
              <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Email (opsional)</span><input className={field} type="email" maxLength={120} value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} /></label>
              <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Mobil</span>
                <select className={field} value={f.car_slug} onChange={(e) => set("car_slug", e.target.value)}>
                  {!cars.some((c) => c.slug === f.car_slug) && <option value={f.car_slug}>{f.car_slug}</option>}
                  {cars.map((c) => <option key={c.slug} value={c.slug}>{c.name}{c.available ? "" : " (nonaktif)"}</option>)}
                </select></label>
              <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Tanggal mulai</span><input className={field} type="date" required value={f.start_date} onChange={(e) => set("start_date", e.target.value)} /></label>
              <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Durasi (hari)</span><input className={field} type="number" min={1} max={30} required value={f.duration} onChange={(e) => set("duration", Number(e.target.value))} /></label>
              <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Lokasi penjemputan</span><input className={field} required maxLength={200} value={f.pickup_location} onChange={(e) => set("pickup_location", e.target.value)} /></label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800"><input type="checkbox" className="size-4 accent-slate-900" checked={f.with_driver} onChange={(e) => set("with_driver", e.target.checked)} /> Dengan pengemudi</label>
              <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Status</span>
                <select className={field} value={f.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Catatan</span><textarea className={`${field} h-20 py-2`} maxLength={500} value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></label>

              <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Total biaya (Rp){!isAdmin && " — hanya admin yang bisa mengubah manual"}</span>
                  <input className={field} type="number" min={0} disabled={!isAdmin} value={totalInput} onChange={(e) => setTotalInput(e.target.value)} /></label>
                {pricingChanged && estimate !== null && Number(totalInput) === original?.total && (
                  <p className="mt-2 text-xs text-amber-700">Mobil, durasi, atau pengemudi berubah: total akan dihitung ulang otomatis menjadi sekitar <strong>{rp(estimate)}</strong>.</p>
                )}
              </div>
            </div>

            {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">{error}</div>}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              {isAdmin ? (
                <button type="button" onClick={remove} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-red-600 hover:bg-red-50"><Trash2 size={16} /> Hapus pesanan</button>
              ) : <span />}
              <div className="flex gap-2">
                <button type="button" className="btn btn-white" onClick={onClose}>Batal</button>
                <button className="btn btn-navy" disabled={busy}>{busy ? "Menyimpan..." : "Simpan perubahan"}</button>
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
