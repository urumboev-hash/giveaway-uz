"use client";

import { useMemo, useState } from "react";
import GiveawayCard from "@/components/GiveawayCard";
import { useLocalStorage } from "@/lib/storage";
import { CATEGORIES, CATEGORY_EMOJI, type Category, type Giveaway } from "@/lib/types";

type Filter = "Все" | Category | "Мои";

export default function GiveawayList({ items }: { items: Giveaway[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Все");
  const [joined, setJoined] = useLocalStorage<string[]>("giveuz:joined", []);
  const [checks, setChecks] = useLocalStorage<Record<string, number[]>>("giveuz:checks", {});

  const joinedSet = useMemo(() => new Set(joined), [joined]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((g) => {
      if (filter === "Мои" && !joinedSet.has(g.id)) return false;
      if (filter !== "Все" && filter !== "Мои" && g.category !== filter) return false;
      if (!q) return true;
      return [g.title, g.prize, g.account_name].some((v) => v?.toLowerCase().includes(q));
    });
  }, [items, query, filter, joinedSet]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of items) c[g.category] = (c[g.category] ?? 0) + 1;
    return c;
  }, [items]);

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
    { key: "Все", label: "Все", count: items.length },
    ...CATEGORIES.map((c) => ({ key: c as Filter, label: `${CATEGORY_EMOJI[c]} ${c}`, count: counts[c] ?? 0 })),
    { key: "Мои", label: "⭐ Я участвую", count: joined.length },
  ];

  return (
    <div>
      <div className="sticky top-[61px] z-10 -mx-4 bg-zinc-50/90 px-4 pb-3 pt-1 backdrop-blur dark:bg-zinc-950/90">
        <label className="relative block">
          <span className="sr-only">Поиск по призу или аккаунту</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden>
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="iPhone, деньги, @texnomart…"
            className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-base outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-500/15 dark:border-zinc-800 dark:bg-zinc-900"
          />
        </label>
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

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-zinc-500">
          <div className="text-4xl">🔎</div>
          <p className="mt-3">
            {filter === "Мои" ? "Вы ещё не отметили ни одного участия." : "Ничего не найдено. Попробуйте другой запрос."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <GiveawayCard
              key={g.id}
              g={g}
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
