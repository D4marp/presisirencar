"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, UserRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { apiBase, getSession, saveSession } from "@/lib/api";

const showDemo = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_DEMO === "1";
const demoAccounts = [
  { role: "Administrator", username: "admin", password: "Presisi#2026" },
  { role: "Staf operasional", username: "staff", password: "Staff#2026" },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) router.replace("/dashboard");
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase()}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login gagal");
      saveSession(data.token, data.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof TypeError ? "Server tidak dapat dihubungi. Pastikan backend berjalan di port 8080." : err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-side">
        <div className="login-side-inner">
          <div className="eyebrow light"><span /> Panel operasional</div>
          <h1>Kelola armada dan pesanan dalam satu tempat.</h1>
          <p>Pantau booking masuk, ubah status pesanan, dan lihat pendapatan secara langsung.</p>
        </div>
      </section>
      <section className="login-form-wrap">
        <form className="login-card" onSubmit={submit}>
          <Logo />
          <h2>Masuk ke dashboard</h2>
          <p>Gunakan akun yang diberikan oleh administrator.</p>
          <label>Username<span className="login-input"><UserRound size={17} /><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required autoFocus /></span></label>
          <label>Password<span className="login-input"><Lock size={17} /><input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="btn btn-navy btn-lg" disabled={loading}>{loading ? "Memeriksa..." : "Masuk"} <ArrowRight size={17} /></button>
          {showDemo && <div className="demo-box">
            <strong>Akun demo prototype</strong>
            {demoAccounts.map((a) => (
              <button type="button" key={a.username} onClick={() => { setUsername(a.username); setPassword(a.password); }}>
                <span>{a.role}</span><code>{a.username} / {a.password}</code>
              </button>
            ))}
          </div>}
          <Link href="/" className="login-back">← Kembali ke website</Link>
        </form>
      </section>
    </main>
  );
}
