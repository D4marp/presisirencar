"use client";

import { Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardFrame, type FrameContext } from "@/components/dashboard/frame";
import type { Car } from "@/data/cars";
import { rupiah } from "@/data/cars";
import { UnauthorizedError, apiBase, authedFetch, getSession } from "@/lib/api";
import { fromApi, invalidateCars, toApi } from "@/lib/cars-api";
import { carImage } from "@/lib/images";

type Form = {
  slug: string;
  name: string;
  category: string;
  price: string;
  seats: string;
  transmission: string;
  fuel: string;
  image: string;
  rentalType: "Lepas Kunci" | "Dengan Sopir";
  badge: string;
  features: string;
  available: boolean;
};

const emptyForm: Form = { slug: "", name: "", category: "", price: "", seats: "", transmission: "Automatic", fuel: "Bensin", image: "", rentalType: "Lepas Kunci", badge: "", features: "", available: true };

const toForm = (c: Car): Form => ({ slug: c.slug, name: c.name, category: c.category, price: String(c.price), seats: String(c.seats), transmission: c.transmission, fuel: c.fuel, image: c.image, rentalType: c.rentalType, badge: c.badge ?? "", features: c.features.join("\n"), available: c.available });

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const input = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

export default function ArmadaAdmin() {
  return (
    <DashboardFrame active="armada" title="Armada" subtitle="Kelola mobil, harga, foto, dan ketersediaan.">
      {(ctx) => <Manager {...ctx} />}
    </DashboardFrame>
  );
}

function Manager({ user, flash, onUnauthorized }: FrameContext) {
  const isAdmin = user.role === "admin";
  const [cars, setCars] = useState<Car[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; form: Form } | null>(null);

  const load = useCallback(async () => {
    try {
      const body = await authedFetch<{ data: Parameters<typeof fromApi>[0][] }>("/cars");
      setCars(body.data.map(fromApi));
      setError("");
    } catch (err) {
      if (err instanceof UnauthorizedError) return onUnauthorized();
      setError("Server tidak dapat dihubungi.");
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => (cars ?? []).filter((c) => `${c.name} ${c.category} ${c.slug}`.toLowerCase().includes(query.toLowerCase())), [cars, query]);

  const handleError = (err: unknown) => {
    if (err instanceof UnauthorizedError) return onUnauthorized();
    flash(err instanceof Error ? err.message : "Terjadi kesalahan");
  };

  const toggle = async (car: Car) => {
    try {
      await authedFetch(`/cars/${car.slug}/availability`, { method: "PATCH", body: JSON.stringify({ available: !car.available }) });
      invalidateCars();
      flash(`${car.name} ${car.available ? "dinonaktifkan" : "diaktifkan"}`);
      load();
    } catch (err) {
      handleError(err);
    }
  };

  const remove = async (car: Car) => {
    if (!window.confirm(`Hapus ${car.name}? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await authedFetch(`/cars/${car.slug}`, { method: "DELETE" });
      invalidateCars();
      flash(`${car.name} dihapus`);
      load();
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <>
      <div className="dash-toolbar">
        <div><span className={`live-dot ${error ? "offline" : ""}`} /> {error || `${cars?.length ?? 0} mobil terdaftar`}</div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-slate-500"><Search size={16} /><input className="w-44 bg-transparent text-sm text-slate-900 outline-none" placeholder="Cari mobil..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari mobil" /></label>
          {isAdmin && <button className="btn btn-navy" onClick={() => setEditing({ mode: "create", form: emptyForm })}><Plus size={17} /> Tambah mobil</button>}
        </div>
      </div>

      <section className="panel booking-table">
        <div className="table-scroll">
          <table>
            <thead><tr><th>MOBIL</th><th>KATEGORI</th><th>HARGA / HARI</th><th>KURSI</th><th>LAYANAN</th><th>STATUS</th><th /></tr></thead>
            <tbody>
              {visible.map((car) => {
                const img = carImage(car.image);
                return (
                  <tr key={car.slug}>
                    <td>
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.src} alt="" className="h-11 w-16 rounded-md bg-slate-100 object-cover" />
                        <div><strong>{car.name}</strong><div className="text-xs text-slate-500">{car.slug}{car.badge ? ` · ${car.badge}` : ""}</div></div>
                      </div>
                    </td>
                    <td>{car.category}</td>
                    <td><strong>Rp{rupiah(car.price)}</strong></td>
                    <td>{car.seats}</td>
                    <td>{car.rentalType}</td>
                    <td>
                      <button onClick={() => toggle(car)} className={`status ${car.available ? "green" : "gray"}`} title="Klik untuk mengubah" aria-label={`${car.name}: ${car.available ? "tersedia" : "nonaktif"}, klik untuk mengubah`}><i />{car.available ? "Tersedia" : "Nonaktif"}</button>
                    </td>
                    <td>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button className="grid size-9 place-items-center rounded-lg hover:bg-slate-100" aria-label={`Ubah ${car.name}`} onClick={() => setEditing({ mode: "edit", form: toForm(car) })}><Pencil size={17} /></button>
                          <button className="grid size-9 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`Hapus ${car.name}`} onClick={() => remove(car)}><Trash2 size={17} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {cars && visible.length === 0 && <div className="empty-state">Mobil tidak ditemukan.</div>}
        {!cars && !error && <div className="empty-state">Memuat...</div>}
      </section>
      {!isAdmin && <p className="mt-4 text-sm text-slate-500">Staf dapat mengaktifkan/menonaktifkan unit. Tambah, ubah, dan hapus hanya untuk administrator.</p>}

      {editing && (
        <CarModal
          mode={editing.mode}
          initial={editing.form}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            invalidateCars();
            flash(msg);
            load();
          }}
          onUnauthorized={onUnauthorized}
        />
      )}
    </>
  );
}

function CarModal({ mode, initial, onClose, onSaved, onUnauthorized }: { mode: "create" | "edit"; initial: Form; onClose: () => void; onSaved: (msg: string) => void; onUnauthorized: () => void }) {
  const [f, setF] = useState<Form>(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function uploadPhoto(file: File) {
    setUploading(true);
    setError("");
    try {
      const data = new FormData();
      data.append("file", file);
      const session = getSession();
      const res = await fetch(`${apiBase()}/uploads`, { method: "POST", headers: session ? { Authorization: `Bearer ${session.token}` } : {}, body: data });
      if (res.status === 401) return onUnauthorized();
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Gagal mengunggah foto");
      set("image", body.path);
    } catch (err) {
      setError(err instanceof TypeError ? "Server tidak dapat dihubungi." : err instanceof Error ? err.message : "Gagal mengunggah foto");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const car: Car = {
      slug: f.slug,
      name: f.name,
      category: f.category,
      price: Number(f.price),
      seats: Number(f.seats),
      transmission: f.transmission,
      fuel: f.fuel,
      image: f.image,
      available: f.available,
      rentalType: f.rentalType,
      badge: f.badge || undefined,
      features: f.features.split("\n").map((x) => x.trim()).filter(Boolean),
    };
    try {
      if (mode === "create") {
        await authedFetch("/cars", { method: "POST", body: JSON.stringify(toApi(car)) });
        onSaved(`${car.name} ditambahkan`);
      } else {
        await authedFetch(`/cars/${f.slug}`, { method: "PUT", body: JSON.stringify(toApi(car)) });
        onSaved(`${car.name} diperbarui`);
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  const preview = f.image ? carImage(f.image) : null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 md:p-8" role="dialog" aria-modal="true" aria-label={mode === "create" ? "Tambah mobil" : "Ubah mobil"}>
      <form onSubmit={submit} className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl md:p-7">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">{mode === "create" ? "Tambah mobil" : `Ubah ${f.name || "mobil"}`}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="grid size-9 place-items-center rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Nama mobil</span>
            <input className={input} value={f.name} required maxLength={80} onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} placeholder="mis. Toyota Avanza Veloz" /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Slug (alamat URL){mode === "edit" && " — tidak bisa diubah"}</span>
            <input className={`${input} disabled:bg-slate-100`} value={f.slug} required disabled={mode === "edit"} maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="huruf kecil, angka, dan tanda hubung" onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Kategori</span>
            <input className={input} value={f.category} required maxLength={40} list="kategori" onChange={(e) => set("category", e.target.value)} placeholder="City Car, Family MPV, Minibus..." />
            <datalist id="kategori">{["City Car", "Family MPV", "Business MPV", "Premium SUV", "Minibus", "Mobil Listrik", "Executive"].map((c) => <option key={c} value={c} />)}</datalist></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Harga per hari (Rp)</span>
            <input className={input} type="number" min={10000} step={1000} required value={f.price} onChange={(e) => set("price", e.target.value)} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Jumlah kursi</span>
            <input className={input} type="number" min={1} max={60} required value={f.seats} onChange={(e) => set("seats", e.target.value)} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Transmisi</span>
            <input className={input} value={f.transmission} required maxLength={30} onChange={(e) => set("transmission", e.target.value)} placeholder="Automatic / Manual" /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Bahan bakar</span>
            <input className={input} value={f.fuel} required maxLength={30} onChange={(e) => set("fuel", e.target.value)} placeholder="Bensin / Diesel / Listrik" /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Jenis layanan</span>
            <select className={input} value={f.rentalType} onChange={(e) => set("rentalType", e.target.value as Form["rentalType"])}><option>Lepas Kunci</option><option>Dengan Sopir</option></select></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Lencana (opsional)</span>
            <input className={input} value={f.badge} maxLength={30} onChange={(e) => set("badge", e.target.value)} placeholder="mis. Paling diminati" /></label>

          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Foto mobil</span>
            <div className="flex items-start gap-3">
              <div className="h-24 w-36 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {preview && <img src={preview.src} alt="Pratinjau foto" className="size-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadPhoto(file); e.target.value = ""; }} />
                <button type="button" className="btn btn-white" disabled={uploading} onClick={() => fileRef.current?.click()}><Upload size={16} /> {uploading ? "Mengunggah..." : "Unggah foto"}</button>
                <input className={input} value={f.image} required onChange={(e) => set("image", e.target.value)} placeholder="atau isi path/URL: /fleet-mpv.jpg atau https://..." />
                <p className="text-xs text-slate-500">JPG, PNG, atau WebP, maks 4 MB. Disarankan rasio 4:3, sudut samping, latar bersih.</p>
              </div>
            </div>
          </div>

          <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Fasilitas (satu per baris, maks 12)</span>
            <textarea className={`${input} h-28 py-2`} value={f.features} onChange={(e) => set("features", e.target.value)} placeholder={"AC dingin\nAudio Bluetooth\nBagasi luas"} /></label>

          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 sm:col-span-2"><input type="checkbox" className="size-4 accent-slate-900" checked={f.available} onChange={(e) => set("available", e.target.checked)} /> Tersedia untuk dipesan</label>
        </div>

        {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">{error}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-white" onClick={onClose}>Batal</button>
          <button className="btn btn-navy" disabled={busy || uploading}>{busy ? "Menyimpan..." : mode === "create" ? "Tambah mobil" : "Simpan perubahan"}</button>
        </div>
      </form>
    </div>
  );
}
