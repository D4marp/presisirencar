"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { waLink } from "@/lib/rental";
import { Logo } from "./logo";

const links = [
  ["/armada", "Armada"],
  ["/layanan", "Layanan"],
  ["/tentang", "Tentang"],
  ["/faq", "FAQ"],
  ["/kontak", "Kontak"],
];

// `transparent` is kept so existing callers still compile; the navbar is always white.
export function SiteHeader(_props: { transparent?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={`site-header solid${scrolled ? " scrolled" : ""}`}>
      <div className="container site-header-inner">
        <Logo compact />
        <nav className="site-desktop-nav">
          {links.map(([href, label]) => (
            <Link href={href} key={href} className={isActive(href) ? "active" : ""}>{label}</Link>
          ))}
        </nav>
        <div className="site-header-actions">
          <a href="tel:+6281362218168" className="site-phone"><Phone size={15} /> 0813-6221-8168</a>
          <a className="btn btn-gold" href={waLink("Halo PRESISI Rent Car, saya ingin sewa mobil.")} target="_blank" rel="noreferrer">Pesan via WhatsApp</a>
        </div>
        <button className="site-menu" onClick={() => setOpen(!open)} aria-label="Buka navigasi" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <nav className="site-mobile-nav">
          {links.map(([href, label]) => <Link href={href} onClick={() => setOpen(false)} key={href}>{label}</Link>)}
          <a className="btn btn-gold" href={waLink("Halo PRESISI Rent Car, saya ingin sewa mobil.")} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>Pesan via WhatsApp</a>
        </nav>
      )}
    </header>
  );
}
