import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { SITE_URL } from "@/lib/supabase";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });

const TITLE = "Розыгрыши и гивы в Instagram Узбекистан — актуальные конкурсы Ташкент";
const DESCRIPTION =
  "Все актуальные розыгрыши, гивы и конкурсы из Instagram в Ташкенте и регионах Узбекистана в одном месте. Призы: техника, деньги, авто, кафе. Обновляется каждые 3 часа.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s — GiveUz" },
  description: DESCRIPTION,
  keywords: [
    "розыгрыши Instagram Узбекистан",
    "гивы Ташкент",
    "актуальные конкурсы Ташкент",
    "giveaway uzbekistan",
    "konkurs toshkent",
    "розыгрыш айфона Ташкент",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: "GiveUz",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

// выставляем тему до отрисовки, чтобы не было «вспышки» светлой темы
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <span className="ig-gradient grid h-9 w-9 place-items-center rounded-xl text-white">🎁</span>
              GiveUz
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                href="/submit"
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                + Добавить
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-4">{children}</main>
        <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
          GiveUz — агрегатор розыгрышей из Instagram. Мы не являемся организатором конкурсов.
        </footer>
      </body>
    </html>
  );
}
