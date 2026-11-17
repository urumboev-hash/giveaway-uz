import { Inter } from "next/font/google";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import VisitTracker from "@/components/VisitTracker";
import { DICT, type Lang } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });

// выставляем тему до отрисовки, чтобы не было «вспышки» светлой темы
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`;

/** Общая оболочка страницы (html/body, шапка, подвал) для русской и узбекской версии. */
export default function SiteShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const t = DICT[lang];
  return (
    <html lang={lang} className={inter.variable} suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-head-element -- это корневой layout (App Router), <head> здесь корректен */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <VisitTracker lang={lang} />
        <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
            <Link href={t.home} className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <span className="ig-gradient grid h-9 w-9 place-items-center rounded-xl text-white">🎁</span>
              GiveUz
            </Link>
            <nav className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex overflow-hidden rounded-full border border-zinc-200 text-xs font-bold dark:border-zinc-800">
                {(["ru", "uz"] as const).map((l) => (
                  <a
                    key={l}
                    href={DICT[l].home}
                    hrefLang={l}
                    aria-current={l === lang ? "true" : undefined}
                    className={`px-2.5 py-2 transition ${
                      l === lang
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {l === "ru" ? "RU" : "UZ"}
                  </a>
                ))}
              </div>
              <Link
                href={t.submitHref}
                className="rounded-full bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {t.add}
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-4">{children}</main>
        <footer className="border-t border-zinc-200 px-4 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
          {t.footer}
        </footer>
      </body>
    </html>
  );
}
