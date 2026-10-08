"use client";

import { Check, Copy, KeyRound, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DashboardFrame, type FrameContext } from "@/components/dashboard/frame";
import { UnauthorizedError, authedFetch } from "@/lib/api";

type Account = { username: string; name: string; role: string; root: boolean; created_at: string };
type Invite = { id: string; role: string; created_by: string; expires_at: string };
type Fresh = { id: string; code: string; role: string; expires_at: string };

const roleLabel = (r: string) => (r === "admin" ? "Administrator" : "Staf");
const fmt = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

export default function PenggunaPage() {
  return (
    <DashboardFrame active="pengguna" title="Pengguna" subtitle="Undang dan kelola akun yang bisa masuk ke dashboard.">
      {(ctx) => (ctx.user.role === "admin" ? <Manager {...ctx} /> : <p className="panel" style={{ padding: 24 }}>Halaman ini khusus administrator.</p>)}
    </DashboardFrame>
  );
}

function Manager({ user, flash, onUnauthorized }: FrameContext) {
  const [users, setUsers] = useState<Account[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [error, setError] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [fresh, setFresh] = useState<Fresh | null>(null);
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, i] = await Promise.all([authedFetch<{ data: Account[] }>("/users"), authedFetch<{ data: Invite[] }>("/invites")]);
      setUsers(u.data);
      setInvites(i.data);
      setError("");
    } catch (err) {
      if (err instanceof UnauthorizedError) return onUnauthorized();
      setError("Server tidak dapat dihubungi.");
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  const fail = (err: unknown) => {
    if (err instanceof UnauthorizedError) return onUnauthorized();
    flash(err instanceof Error ? err.message : "Terjadi kesalahan");
  };

  const createInvite = async () => {
    setBusy(true);
    try {
      setFresh(await authedFetch<Fresh>("/invites", { method: "POST", body: JSON.stringify({ role }) }));
      setCopied("");
      load();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      flash("Salin manual: blok teksnya lalu tekan Ctrl/Cmd+C");
    }
  };

  const revoke = async (inv: Invite) => {
    if (!window.confirm("Cabut undangan ini? Kodenya tidak akan bisa dipakai lagi.")) return;
    try {
      await authedFetch(`/invites/${inv.id}`, { method: "DELETE" });
      if (fresh?.id === inv.id) setFresh(null);
      flash("Undangan dicabut");
      load();
    } catch (err) {
      fail(err);
    }
  };

  const remove = async (acc: Account) => {
    if (!window.confirm(`Hapus akun ${acc.name} (${acc.username})? Orang ini langsung tidak bisa masuk lagi.`)) return;
    try {
      await authedFetch(`/users/${encodeURIComponent(acc.username)}`, { method: "DELETE" });
      flash(`${acc.username} dihapus`);
      load();
    } catch (err) {
      fail(err);
    }
  };

  const link = fresh ? `${window.location.origin}/daftar?kode=${fresh.code}` : "";

  return (
    <>
      <section className="panel" style={{ padding: 24, marginBottom: 20 }}>
        <div className="panel-heading" style={{ padding: 0, marginBottom: 14 }}>
          <div><h2>Undang pengguna baru</h2><p>Buat kode sekali pakai, lalu kirim tautannya lewat jalur pribadi (WhatsApp pribadi, bukan grup). Kode berlaku 24 jam.</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">Peran
            <select value={role} onChange={(e) => setRole(e.target.value as "staff" | "admin")} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900">
              <option value="staff">Staf (aktif/nonaktifkan unit)</option>
              <option value="admin">Administrator (akses penuh)</option>
            </select>
          </label>
          <button className="btn btn-navy" onClick={createInvite} disabled={busy}><UserPlus size={17} /> {busy ? "Membuat..." : "Buat kode undangan"}</button>
        </div>

        {fresh && (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4" role="status">
            <p className="text-sm font-bold text-amber-900">Kode hanya tampil sekali ini. Salin sekarang.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-white px-4 py-3 text-lg font-bold tracking-widest text-slate-900 ring-1 ring-amber-200" style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{fresh.code}</code>
              <button className="btn btn-white" onClick={() => copy(fresh.code, "code")}>{copied === "code" ? <Check size={16} /> : <Copy size={16} />} Salin kode</button>
              <button className="btn btn-navy" onClick={() => copy(link, "link")}>{copied === "link" ? <Check size={16} /> : <Copy size={16} />} Salin tautan undangan</button>
            </div>
            <p className="mt-3 break-all text-xs text-slate-600">{link}</p>
            <p className="mt-1 text-xs text-slate-600">Peran: <strong>{roleLabel(fresh.role)}</strong> · kedaluwarsa {fmt(fresh.expires_at)} · sekali pakai</p>
          </div>
        )}
      </section>

      {invites.length > 0 && (
        <section className="panel booking-table" style={{ marginBottom: 20 }}>
          <div className="panel-heading"><div><h2>Undangan aktif</h2><p>Belum dipakai dan belum kedaluwarsa</p></div></div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>PERAN</th><th>DIBUAT OLEH</th><th>KEDALUWARSA</th><th /></tr></thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id}>
                    <td><KeyRound size={14} style={{ display: "inline", marginRight: 6 }} />{roleLabel(inv.role)}</td>
                    <td>{inv.created_by}</td>
                    <td>{fmt(inv.expires_at)}</td>
                    <td><button className="grid h-9 place-items-center rounded-lg px-3 text-sm font-bold text-red-600 hover:bg-red-50" onClick={() => revoke(inv)}>Cabut</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel booking-table">
        <div className="panel-heading"><div><h2>Akun terdaftar</h2><p>{error || `${users?.length ?? 0} akun`}</p></div></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>NAMA</th><th>USERNAME</th><th>PERAN</th><th>DIBUAT</th><th /></tr></thead>
            <tbody>
              {(users ?? []).map((acc) => (
                <tr key={acc.username}>
                  <td><strong>{acc.name}</strong>{acc.username === user.username && <span className="status gray" style={{ marginLeft: 8 }}>Anda</span>}</td>
                  <td>{acc.username}</td>
                  <td>{roleLabel(acc.role)}{acc.root && <span className="status gold" style={{ marginLeft: 8 }}>Utama</span>}</td>
                  <td>{acc.root ? "Konfigurasi server" : fmt(acc.created_at)}</td>
                  <td>
                    {!acc.root && acc.username !== user.username && (
                      <button className="grid size-9 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`Hapus ${acc.username}`} onClick={() => remove(acc)}><Trash2 size={17} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!users && !error && <div className="empty-state">Memuat...</div>}
      </section>
      <p className="mt-4 text-sm text-slate-500">Akun utama berasal dari konfigurasi server dan tidak bisa dihapus dari sini. Untuk mengganti peran seseorang, hapus akunnya lalu undang ulang.</p>
    </>
  );
}
