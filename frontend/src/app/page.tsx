import GiveawayList from "@/components/GiveawayList";
import { getSupabase, SITE_URL } from "@/lib/supabase";
import type { Giveaway } from "@/lib/types";

// ISR: страница пересобирается не чаще раза в 10 минут — быстро и бесплатно на Vercel
export const revalidate = 600;

async function getGiveaways(): Promise<{ items: Giveaway[]; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { items: [], error: "Supabase не настроен: заполните frontend/.env.local" };
  const { data, error } = await sb
    .from("giveaways")
    .select("id,post_url,account_name,image_url,title,prize,conditions,end_date,category,source_type,created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return { items: [], error: error.message };
  return { items: (data ?? []) as Giveaway[], error: null };
}

export default async function HomePage() {
  const { items, error } = await getGiveaways();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Розыгрыши и гивы в Instagram Узбекистан",
    url: SITE_URL,
    inLanguage: "ru",
    about: "Актуальные конкурсы и розыгрыши в Ташкенте и регионах Узбекистана",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="py-4 sm:py-8">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          Розыгрыши и гивы в Instagram{" "}
          <span className="bg-gradient-to-r from-orange-500 via-pink-600 to-purple-600 bg-clip-text text-transparent">
            Узбекистан
          </span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
          Актуальные конкурсы Ташкента и регионов в одном месте. Отмечайте условия и следите за своими участиями — без
          регистрации.
        </p>
      </section>
      {error && (
        <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {error}
        </p>
      )}
      <GiveawayList items={items} />
    </>
  );
}
