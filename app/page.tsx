"use client";

import { useState } from "react";
import { Estimator } from "@/components/home/estimator";
import { Fleet } from "@/components/home/fleet";
import { Hero, type Search } from "@/components/home/hero";
import { Faq, FinalCta, Steps } from "@/components/home/info-sections";
import { Reviews } from "@/components/home/reviews";
import { TrustBar } from "@/components/home/trust-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { localDate } from "@/lib/booking";

export default function Home() {
  const [search, setSearch] = useState<Search>(() => ({ mode: "Lepas Kunci", type: "Semua tipe", date: localDate(1), days: 2 }));

  const showFleet = () => document.getElementById("armada")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <SiteHeader />
      <main className="bg-white">
        <Hero search={search} onChange={setSearch} onSearch={showFleet} />
        <TrustBar />
        <Fleet search={search} onChange={setSearch} />
        <Estimator search={search} />
        <Reviews />
        <Steps />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
