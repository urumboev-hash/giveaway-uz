"use client";

import { useMemo, useState } from "react";
import GiveawayCard from "@/components/GiveawayCard";
import NotifyButton from "@/components/NotifyButton";
import { CATEGORY_LABELS, DICT, REGION_CODES, REGION_LABELS, type Lang } from "@/lib/i18n";
import { useLocalStorage } from "@/lib/storage";
import { CATEGORIES, CATEGORY_EMOJI, type Category, type Giveaway } from "@/lib/types";

type Filter = "all" | Category | "mine";

export default function GiveawayList({ items, lang }: { items: Giveaway[]; lang: Lang }) {
  const t = DICT[lang];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [region, setRegion] = useLocalStorage<string>("giveuz:region", "");
  const [sort, setSort] = useState<"new" | "ending">("new");
  const [joined, setJoined] = useLocalStorage<string[]>("giveuz:joined", []);
  const [checks, setChecks] = useLocalStorage<Record<string, number[]>>("giveuz:checks", {});

  const joinedSet = useMemo(() => new Set(joined), [joined]);

  // акции «весь Узбекистан» показываем в любой выбранной области
  const inRegion = useMemo(
    () => (region ? items.filter((g) => g.region === region || g.region === "all") : items),
    [items, region],
  );

  const regionCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of items) c[g.region] = (c[g.region] ?? 0) + 1;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = inRegion.filter((g) => {
      if (filter === "mine" && !joinedSet.has(g.id)) return false;
      if (filter !== "all" && filter !== "mine" && g.category !== filter) return false;
      if (!q) return true;
      return [g.title, g.prize, g.title_uz, g.prize_uz, g.account_name].some((v) => v?.toLowerCase().includes(q));
    });
    if (sort === "ending") {
      // сначала те, у кого известен срок (ближайший первым), затем без срока
      const end = (g: Giveaway) => (g.ends_at ? new Date(g.ends_at).getTime() : Number.MAX_SAFE_INTEGER);
      return [...list].sort((a, b) => end(a) - end(b));
    }
    return list; // с сервера уже отсортировано: новые сверху
  }, [inRegion, query, filter, joinedSet, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of inRegion) c[g.category] = (c[g.category] ?? 0) + 1;
    return c;
  }, [inRegion]);

  function toggleJoined(id: string) {
    setJoined((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleCheck(id: string, idx: number) {
    setChecks((prev) => {
      const cur = prev[id] ?? [];
      const next = cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx];
      return { ...prev, [id]: next };
    });
  }

  const chips: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: t.all, count: inRegion.length },
    ...CATEGORIES.map((c) => ({
      key: c as Filter,
      label: `${CATEGORY_EMOJI[c]} ${CATEGORY_LABELS[c][lang]}`,
      count: counts[c] ?? 0,
    })),
    { key: "mine", label: t.mine, count: joined.length },
  ];

  const nationwide = regionCounts["all"] ?? 0;

  return (
    <div>
      <div className="sticky top-[61px] z-10 -mx-4 bg-zinc-50/90 px-4 pb-3 pt-1 backdrop-blur dark:bg-zinc-950/90">
        <div className="grid gap-2 sm:grid-cols-[1fr_minmax(0,260px)]">
          <label className="relative block">
            <span className="sr-only">{t.searchLabel}</span>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden>
              🔍
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-base outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-500/15 dark:border-zinc-800 dark:bg-zinc-900"
            />
          </label>
          <label className="relative block">
            <span className="sr-only">{t.region}</span>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" aria-hidden>
              📍
            </span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-9 text-base outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-500/15 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <option value="">
                {t.allRegions} ({items.length})
              </option>
              {REGION_CODES.map((code) => (
                <option key={code} value={code}>
                  {REGION_LABELS[code][lang]} ({(regionCounts[code] ?? 0) + nationwide})
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden>
              ▾
            </span>
          </label>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {chips.map((c) => {
            const active = filter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                aria-pressed={active}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
              >
                {c.label}
                {typeof c.count === "number" && <span className="ml-1.5 opacity-60">{c.count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <NotifyButton lang={lang} region={region} />

      <div className="mb-3 flex justify-end">
        <div className="flex overflow-hidden rounded-full border border-zinc-200 text-xs font-semibold dark:border-zinc-800">
          {(["new", "ending"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              aria-pressed={sort === s}
              className={`px-3 py-1.5 transition ${
                sort === s
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
              }`}
            >
              {s === "new" ? t.sortNew : t.sortEnding}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-zinc-500">
          <div className="text-4xl">🔎</div>
          <p className="mt-3">{filter === "mine" ? t.emptyMine : t.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <GiveawayCard
              key={g.id}
              g={g}
              lang={lang}
              joined={joinedSet.has(g.id)}
              checked={checks[g.id] ?? []}
              onToggleJoined={() => toggleJoined(g.id)}
              onToggleCheck={(i) => toggleCheck(g.id, i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
