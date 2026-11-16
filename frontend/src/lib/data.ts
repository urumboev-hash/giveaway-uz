import { getSupabase } from "@/lib/supabase";
import type { Giveaway } from "@/lib/types";

/** Акция без даты окончания показывается столько дней после публикации поста. */
const NO_END_DATE_TTL_DAYS = 21;

const COLUMNS =
  "id,post_url,account_name,image_url,title,prize,conditions,end_date,category,source_type,created_at," +
  "region,starts_at,ends_at,posted_at,title_uz,prize_uz,conditions_uz";

/** Только действующие: срок не прошёл, а без срока — пост не старше 3 недель. */
export function isCurrent(g: Giveaway, now = Date.now()): boolean {
  if (g.ends_at) return new Date(g.ends_at).getTime() >= now;
  const published = new Date(g.posted_at ?? g.created_at).getTime();
  return now - published <= NO_END_DATE_TTL_DAYS * 86400_000;
}

function sortKey(g: Giveaway): number {
  return new Date(g.posted_at ?? g.created_at).getTime();
}

export async function getGiveaways(): Promise<{ items: Giveaway[]; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { items: [], error: "Supabase не настроен: заполните frontend/.env.local" };
  const { data, error } = await sb
    .from("giveaways")
    .select(COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return { items: [], error: error.message };
  const now = Date.now();
  const items = ((data ?? []) as unknown as Giveaway[]).filter((g) => isCurrent(g, now));
  items.sort((a, b) => sortKey(b) - sortKey(a));
  return { items, error: null };
}
