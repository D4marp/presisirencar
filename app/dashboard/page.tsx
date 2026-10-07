"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CarFront,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Download,
  LogOut,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { UnauthorizedError, authedFetch, clearSession, getSession, type SessionUser } from "@/lib/api";

type Row = { id: string; name: string; car: string; date: string; total: string; rawTotal: number; start: string; status: string; tone: string };
type Stats = { bookings: number; revenue: number; active_bookings: number; fleet_total: number; fleet_available: number; customers: number; by_status: Record<string, number> };

const STATUSES = ["Menunggu", "Dikonfirmasi", "Berjalan", "Selesai", "Dibatalkan"];
const tone = (status: string) => status === "Dikonfirmasi" ? "green" : status === "Berjalan" ? "blue" : status === "Selesai" ? "gray" : status === "Dibatalkan" ? "red" : "gold";
const rp = (n: number) => `Rp${new Intl.NumberFormat("id-ID").format(n)}`;
const CAR_LABELS: Record<string, string> = { agya: "Toyota Agya", "brio-satya": "Honda Brio", "avanza-xenia": "Avanza / Xenia", mobilio: "Honda Mobilio", xpander: "Mitsubishi Xpander", "innova-reborn": "Innova Reborn", "innova-zenix": "Innova Zenix", "fortuner-pajero": "Fortuner / Pajero", "air-ev": "Wuling Air EV", "ioniq-5": "Hyundai Ioniq 5", "hiace-commuter": "Hiace Commuter", "hiace-premio": "Hiace Premio", alphard: "Toyota Alphard" };
const emptyStats: Stats = { bookings: 0, revenue: 0, active_bookings: 0, fleet_total: 0, fleet_available: 0, customers: 0, by_status: {} };

export default function Dashboard() {
  const [sidebar, setSidebar] = useState(false);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("7 hari terakhir");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [bookings, setBookings] = useState<Row[]>([]);
  const [apiOnline, setApiOnline] = useState(false);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const filtered = useMemo(() => bookings.filter((item) => `${item.id} ${item.name} ${item.car}`.toLowerCase().includes(query.toLowerCase())), [bookings, query]);

  const chart = useMemo(() => {
    const days = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });
    const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const sums = days.map((d) => bookings.filter((b) => b.start === key(d) && b.status !== "Dibatalkan").reduce((t, b) => t + b.rawTotal, 0));
    const max = Math.max(...sums, 1);
    return days.map((d, i) => ({ h: Math.max(4, Math.round((sums[i] / max) * 100)), sum: sums[i], label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) }));
  }, [bookings]);
  const peak = chart.reduce((m, c, i) => (c.sum > chart[m].sum ? i : m), 0);

  const load = async () => {
    try {
      const [summary, list] = await Promise.all([
        authedFetch<Stats>("/dashboard"),
        authedFetch<{ data: { id: string; customer_name: string; car_slug: string; start_date: string; duration: number; total: number; status: string }[] | null }>("/bookings"),
      ]);
      setApiOnline(true);
      setStats(summary);
      setBookings((list.data ?? []).map((item) => ({ id: item.id, name: item.customer_name, car: CAR_LABELS[item.car_slug] || item.car_slug, date: `${item.start_date} · ${item.duration} hari`, start: item.start_date, rawTotal: item.total, total: rp(item.total), status: item.status, tone: tone(item.status) })));
    } catch (err) {
      if (err instanceof UnauthorizedError) { clearSession(); router.replace("/login"); return; }
      setApiOnline(false);
    }
  };

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace("/login"); return; }
    setUser(session.user);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => { clearSession(); router.replace("/login"); };

  const changeStatus = async (id: string, status: string) => {
    setOpenMenu(null);
    try {
      await authedFetch(`/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      flash(`${id} diubah menjadi ${status}`);
      load();
    } catch (err) {
      if (err instanceof UnauthorizedError) { clearSession(); router.replace("/login"); return; }
      flash(err instanceof Error ? err.message : "Gagal mengubah status");
    }
  };

  const rented = stats.by_status["Berjalan"] ?? 0;
  const total = Math.max(stats.fleet_total, 1);
  const rentedPct = Math.round((rented / total) * 100);
  const availPct = Math.round((stats.fleet_available / total) * 100);

  const exportCsv = () => {
    const lines = [["ID", "Pelanggan", "Kendaraan", "Tanggal", "Total", "Status"], ...bookings.map((b) => [b.id, b.name, b.car, b.date, String(b.rawTotal), b.status])];
    const csv = lines.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "pesanan-presisi.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const flash = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2600);
  };

  if (!user) return <main className="dashboard-shell" aria-busy="true" />;

  return (
    <main className="dashboard-shell">
      {notice && <div className="toast"><span><span className="toast-dot" />{notice}</span><button onClick={() => setNotice("")}><X size={15} /></button></div>}
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <div className="sidebar-brand"><Logo /><button onClick={() => setSidebar(false)}><X /></button></div>
        <nav className="side-nav">
          <small>MENU UTAMA</small>
          <a className="active" href="#top"><LayoutDashboard /> Ikhtisar</a>
          <a href="#pesanan"><ClipboardList /> Pesanan <span>{stats.bookings}</span></a>
          <Link href="/armada"><CarFront /> Lihat armada</Link>
        </nav>
        <div className="support-card"><span>Butuh bantuan?</span><p>Tim support siap membantu operasional Anda.</p><a href="tel:+6281362218168">Hubungi support <ChevronRight size={15} /></a></div>
        <Link href="/" className="back-site">← Kembali ke website</Link>
      </aside>
      {sidebar && <button className="sidebar-backdrop" onClick={() => setSidebar(false)} aria-label="Tutup menu" />}

      <section className="dashboard-content">
        <header className="dash-header">
          <button className="dash-menu" onClick={() => setSidebar(true)}><Menu /></button>
          <div><h1>Halo, {user.name.split(" ")[0]}</h1><p>Berikut ringkasan bisnis rental hari ini.</p></div>
          <div className="dash-head-actions">
            <label className="dash-search"><Search size={17} /><input aria-label="Cari" placeholder="Cari pesanan..." value={query} onChange={(e) => setQuery(e.target.value)} /></label>
            <button className="icon-button" aria-label="Notifikasi"><Bell size={19} /><i /></button>
            <div className="profile-button"><span>{user.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span><div><strong>{user.name}</strong><small>{user.role === "admin" ? "Administrator" : "Staf operasional"}</small></div></div><button className="icon-button" aria-label="Keluar" title="Keluar" onClick={logout}><LogOut size={18} /></button>
          </div>
        </header>

        <div className="dash-main">
          <div className="dash-toolbar"><div><span className={`live-dot ${apiOnline ? "" : "offline"}`} /> {apiOnline ? "Terhubung ke Go API" : "Server tidak terhubung"}</div><div><button className="btn btn-white" onClick={() => exportCsv()}><Download size={16} /> Unduh laporan</button><button className="btn btn-navy" onClick={() => window.location.href = "/booking"}><Plus size={17} /> Pesanan baru</button></div></div>

          <div className="stat-grid">
            <Stat icon={<ClipboardList />} label="Total pesanan" value={String(stats.bookings)} delta={`${stats.by_status["Menunggu"] ?? 0}`} note="menunggu konfirmasi" tone="navy" />
            <Stat icon={<CircleDollarSign />} label="Pendapatan" value={`Rp${new Intl.NumberFormat("id-ID", { notation: "compact" }).format(stats.revenue)}`} delta={`${stats.active_bookings}`} note="pesanan aktif" tone="gold" />
            <Stat icon={<CarFront />} label="Armada" value={String(stats.fleet_total)} delta={`${stats.fleet_available} unit`} note="tersedia" tone="blue" />
            <Stat icon={<UserRound />} label="Pelanggan" value={String(stats.customers)} delta={`${stats.by_status["Selesai"] ?? 0}`} note="pesanan selesai" tone="green" />
          </div>

          <div className="dash-grid">
            <section className="panel revenue-panel">
              <div className="panel-heading"><div><h2>Pendapatan</h2><p>Performa pendapatan rental</p></div><label className="select-control"><CalendarDays size={15} /><select value={period} onChange={(e) => setPeriod(e.target.value)}><option>7 hari terakhir</option><option>30 hari terakhir</option><option>Tahun ini</option></select></label></div>
              <div className="revenue-top"><div><small>Total pendapatan</small><strong>{rp(stats.revenue)}</strong></div><span><TrendingUp size={15} /> {stats.active_bookings} aktif</span></div>
              <div className="chart-wrap">
                <div className="y-labels">{[4, 3, 2, 1, 0].map((n) => <span key={n}>{n === 0 ? "0" : new Intl.NumberFormat("id-ID", { notation: "compact" }).format((Math.max(...chart.map((c) => c.sum), 1) * n) / 4)}</span>)}</div>
                <div className="bar-chart">
                  {chart.map((c, i) => <div className="bar-column" key={i} title={`${c.label}: ${rp(c.sum)}`}><span className="bar" style={{ height: `${c.h}%`, ...(i === peak && c.sum > 0 ? { background: "var(--gold)" } : {}) }}><i>{i === peak && c.sum > 0 ? rp(c.sum) : ""}</i></span><small>{i % 2 === 0 ? c.label : ""}</small></div>)}
                </div>
              </div>
            </section>

            <section className="panel fleet-panel">
              <div className="panel-heading"><div><h2>Status armada</h2><p>Ketersediaan saat ini</p></div><button onClick={() => flash("Membuka daftar armada")}><MoreHorizontal /></button></div>
              <div className="donut-row"><div className="donut" style={{ background: `conic-gradient(var(--navy) 0 ${rentedPct}%, var(--gold) ${rentedPct}% ${rentedPct + availPct}%, #dfe3e8 ${rentedPct + availPct}% 100%)` }}><div><strong>{stats.fleet_total}</strong><span>Total unit</span></div></div><div className="legend"><div><i className="available"/><span>Tersedia</span><strong>{stats.fleet_available}</strong></div><div><i className="rented"/><span>Disewa</span><strong>{rented}</strong></div><div><i className="service"/><span>Tidak tersedia</span><strong>{stats.fleet_total - stats.fleet_available}</strong></div></div></div>
              <div className="fleet-alert"><span><CarFront size={18} /></span><div><strong>{stats.by_status["Menunggu"] ?? 0} pesanan menunggu konfirmasi</strong><p>Segera hubungi pelanggan agar jadwal terkunci.</p></div><ChevronRight size={18} /></div>
            </section>
          </div>

          <section className="panel booking-table" id="pesanan">
            <div className="panel-heading"><div><h2>Pesanan terbaru</h2><p>Pantau dan kelola pesanan masuk</p></div><button className="view-all" onClick={() => setQuery("")}>Lihat semua <ArrowMini /></button></div>
            <div className="table-filter-mobile"><Search size={16} /><input placeholder="Cari pesanan..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>ID PESANAN</th><th>PELANGGAN</th><th>KENDARAAN</th><th>TANGGAL SEWA</th><th>TOTAL</th><th>STATUS</th><th /></tr></thead>
                <tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.id}</strong></td><td><div className="customer"><span>{item.name.split(' ').map(x => x[0]).slice(0,2).join('')}</span><strong>{item.name}</strong></div></td><td>{item.car}</td><td>{item.date}</td><td><strong>{item.total}</strong></td><td><span className={`status ${item.tone}`}><i />{item.status}</span></td><td className="row-menu"><button aria-label={`Ubah status ${item.id}`} onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}><MoreHorizontal size={19} /></button>{openMenu === item.id && <div className="status-menu">{STATUSES.filter((st) => st !== item.status).map((st) => <button key={st} onClick={() => changeStatus(item.id, st)}>{st}</button>)}</div>}</td></tr>)}</tbody>
              </table>
            </div>
            {filtered.length === 0 && <div className="empty-state">Pesanan tidak ditemukan.</div>}
          </section>
        </div>
      </section>
    </main>
  );
}

function Stat({ icon, label, value, delta, note, tone }: { icon: React.ReactNode; label: string; value: string; delta: string; note: string; tone: string }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><small>{label}</small><strong>{value}</strong><p><span><TrendingUp size={13} /> {delta}</span> {note}</p></article>;
}

function ArrowMini() { return <ChevronRight size={16} />; }
