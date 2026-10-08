import type { MetadataRoute } from "next";
import { cars } from "@/data/cars";
import { SITE_URL } from "@/lib/site";

const siteUrl = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/armada", "/layanan", "/tentang", "/faq", "/kontak"];
  return [
    ...pages.map((p) => ({ url: `${siteUrl}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...cars.map((c) => ({ url: `${siteUrl}/armada/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
