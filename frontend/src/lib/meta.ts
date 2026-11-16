import type { Metadata, Viewport } from "next";
import { DICT, type Lang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/supabase";

const KEYWORDS: Record<Lang, string[]> = {
  ru: [
    "розыгрыши Instagram Узбекистан",
    "бесплатно Ташкент",
    "халява Узбекистан",
    "гивы Ташкент",
    "конкурсы Самарканд Бухара Фергана",
    "giveaway uzbekistan",
  ],
  uz: ["konkurs Instagram O'zbekiston", "bepul sovg'a", "tekin aksiya", "yutib oling", "giveaway uzbekistan", "konkurs Toshkent"],
};

export function siteMetadata(lang: Lang): Metadata {
  const t = DICT[lang];
  const path = lang === "uz" ? "/uz" : "/";
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.siteTitle, template: "%s — GiveUz" },
    description: t.siteDescription,
    keywords: KEYWORDS[lang],
    alternates: { canonical: path, languages: { ru: "/", uz: "/uz" } },
    openGraph: {
      type: "website",
      locale: lang === "uz" ? "uz_UZ" : "ru_RU",
      url: path,
      siteName: "GiveUz",
      title: t.siteTitle,
      description: t.siteDescription,
    },
    twitter: { card: "summary_large_image", title: t.siteTitle, description: t.siteDescription },
    robots: { index: true, follow: true },
    appleWebApp: { capable: true, title: "GiveUz", statusBarStyle: "black-translucent" },
    icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  };
}

export const siteViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};
