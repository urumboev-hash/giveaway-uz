import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/supabase";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const langs = (ru: string, uz: string) => ({ languages: { ru: `${SITE_URL}${ru}`, uz: `${SITE_URL}${uz}` } });
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "hourly", priority: 1, alternates: langs("/", "/uz") },
    { url: `${SITE_URL}/uz`, lastModified: now, changeFrequency: "hourly", priority: 1, alternates: langs("/", "/uz") },
    { url: `${SITE_URL}/submit`, lastModified: now, changeFrequency: "monthly", priority: 0.5, alternates: langs("/submit", "/uz/submit") },
    { url: `${SITE_URL}/uz/submit`, lastModified: now, changeFrequency: "monthly", priority: 0.5, alternates: langs("/submit", "/uz/submit") },
  ];
}
