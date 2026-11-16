import GiveawayList from "@/components/GiveawayList";
import { getGiveaways } from "@/lib/data";
import { DICT, type Lang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/supabase";

/** Главная страница (общая для /ru и /uz). */
export default async function HomeView({ lang }: { lang: Lang }) {
  const t = DICT[lang];
  const { items, error } = await getGiveaways();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t.siteTitle,
    url: `${SITE_URL}${lang === "uz" ? "/uz" : "/"}`,
    inLanguage: lang,
    about: t.siteDescription,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="py-4 sm:py-8">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {t.h1a}{" "}
          <span className="bg-gradient-to-r from-orange-500 via-pink-600 to-purple-600 bg-clip-text text-transparent">
            {t.h1b}
          </span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 sm:text-base dark:text-zinc-400">{t.lead}</p>
      </section>
      {error && (
        <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {error}
        </p>
      )}
      <GiveawayList items={items} lang={lang} />
    </>
  );
}
