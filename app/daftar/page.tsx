"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Lock, UserRound, BadgeCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { apiBase } from "@/lib/api";

export default function DaftarPage() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}

function Form() {
  const params = useSearchParams();
  const [code, setCode] = useState((params.get("kode") ?? "").toUpperCase());
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ username: string; role: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${apiBase()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code, name, username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Pendaftaran gagal");
      setDone({ username: data.username, role: data.role });
    } catch (err) {
      setError(err instanceof TypeError ? "Server tidak dapat dihubungi. Coba lagi nanti." : err instanceof Error ? err.message : "Pendaftaran gagal");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="login-page">
        <section className="login-form-wrap" style={{ gridColumn: "1 / -1" }}>
          <div className="login-card" role="status">
            <Logo />
            <CheckCircle2 size={44} className="text-emerald-600" aria-hidden />
            <h2>Akun berhasil dibuat</h2>
            <p>
              Akun <strong>{done.username}</strong> dengan peran <strong>{done.role === "admin" ? "Administrator" : "Staf"}</strong> siap dipakai. Kode undangan Anda sudah hangus dan tidak bisa dipakai lagi.
            </p>
            <Link className="btn btn-navy btn-lg" href="/login">Masuk sekarang <ArrowRight size={17} /></Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-side">
        <div className="login-side-inner">
          <div className="eyebrow light"><span /> Undangan khusus</div>
          <h1>Bergabung sebagai pengelola armada.</h1>
          <p>Halaman ini hanya untuk orang yang menerima kode undangan dari administrator PRESISI Rent Car.</p>
        </div>
      </section>
      <section className="login-form-wrap">
        <form className="login-card" onSubmit={submit}>
          <Logo />
          <h2>Buat akun</h2>
          <p>Masukkan kode undangan yang Anda terima. Kode berlaku sekali dan kedaluwarsa dalam 24 jam.</p>
          <label>Kode undangan<span className="login-input"><KeyRound size={17} /><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} required style={{ fontFamily: "ui-monospace, Menlo, monospace", letterSpacing: ".06em" }} /></span></label>
          <label>Nama lengkap<span className="login-input"><BadgeCheck size={17} /><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={60} /></span></label>
          <label>Username<span className="login-input"><UserRound size={17} /><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={40} placeholder="huruf kecil, angka, titik, strip" /></span></label>
          <label>Password<span className="login-input"><Lock size={17} /><input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={12} /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          <label>Ulangi password<span className="login-input"><Lock size={17} /><input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required minLength={12} /></span></label>
          <p style={{ margin: "-4px 0 0", fontSize: 12 }}>Minimal 12 karakter. Hindari nama brand, kata umum (admin, password), atau urutan angka.</p>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="btn btn-navy btn-lg" disabled={busy}>{busy ? "Membuat akun..." : "Buat akun"} <ArrowRight size={17} /></button>
          <Link href="/login" className="login-back">Sudah punya akun? Masuk</Link>
        </form>
      </section>
    </main>
  );
}
