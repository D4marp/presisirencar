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
import { useCars } from "@/lib/cars-api";

export default function Home() {
  const { cars } = useCars();
  const [search, setSearch] = useState<Search>({ mode: "Lepas Kunci", type: "Semua tipe" });

  return (
    <>
      <SiteHeader />
      <main className="bg-white">
        <Hero />
        <TrustBar />
        <Fleet cars={cars} search={search} onChange={setSearch} />
        <Estimator cars={cars} />
        <Reviews />
        <Steps />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
