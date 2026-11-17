"use client";

import { useCallback, useEffect, useState } from "react";
import { REGION_LABELS, type RegionCode } from "@/lib/i18n";
import { getSupabase } from "@/lib/supabase";
import { markOwner } from "@/lib/track";

type Totals = { visitors: number; visits: number; participate: number; joined: number; shares: number; notify: number };
interface Stats {
  totals: Record<"today" | "week" | "month" | "all", Totals>;
  daily: { d: string; visitors: number; participate: number }[];
  top: { title: string; account_name: string | null; post_url: string; clicks: number }[];
  split: { dim: "lang" | "device" | "referrer" | "region"; k: string; n: number }[];
  subscribers: number;
  active_giveaways: number;
}

const KEY_STORE = "giveuz_stats_key";
const PERIODS = [
  ["today", "Сегодня"],
  ["week", "7 дней"],
  ["month", "30 дней"],
  ["all", "Всё время"],
] as const;
const TILES: [keyof Totals, string, string][] = [
  ["visitors", "Посетителей", "разных людей (браузеров)"],
  ["visits", "Посещений", "заходов на сайт"],
  ["participate", "Перешли к акции", "нажали «Участвовать в Instagram»"],
  ["joined", "«Я участвую»", "отметили, что участвуют"],
  ["shares", "Поделились", "нажали «Поделиться»"],
  ["notify", "Включили уведомления", "за период"],
];
const DIMS: [Stats["split"][number]["dim"], string][] = [
  ["referrer", "Откуда пришли"],
  ["device", "Устройства"],
  ["lang", "Язык сайта"],
  ["region", "Области (по переходам к акциям)"],
];
const REF_LABEL: Record<string, string> = {
  direct: "Напрямую / закладка",
  instagram: "Instagram",
  telegram: "Telegram",
  google: "Google",
  yandex: "Яндекс",
  facebook: "Facebook",
};

function label(dim: string, k: string) {
  if (dim === "lang") return k === "uz" ? "Узбекский" : k === "ru" ? "Русский" : k;
  if (dim === "referrer") return REF_LABEL[k] ?? k;
  if (dim === "region") return REGION_LABELS[k as RegionCode]?.ru ?? k;
  return k;
}

const nf = new Intl.NumberFormat("ru-RU");

export default function StatsView() {
  const [key, setKey] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<(typeof PERIODS)[number][0]>("week");

  const load = useCallback(async (k: string) => {
    const sb = getSupabase();
    if (!sb || !k) return;
    setLoading(true);
    setError(null);
    const { data, error } = await sb.rpc("get_stats", { p_key: k.trim() });
    setLoading(false);
    if (error || !data) {
      setStats(null);
      setError(error?.message?.includes("forbidden") ? "Неверный ключ" : "Не удалось загрузить статистику");
      return;
    }
    try {
      localStorage.setItem(KEY_STORE, k.trim());
    } catch {
      /* ignore */
    }
    markOwner(); // твои собственные заходы больше не считаются
    setStats(data as Stats);
  }, []);

  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem(KEY_STORE) ?? "";
    } catch {
      /* ignore */
    }
    if (saved) {
      setKey(saved);
      load(saved);
    }
  }, [load]);

  function logout() {
    try {
      localStorage.removeItem(KEY_STORE);
    } catch {
      /* ignore */
    }
    setStats(null);
    setKey("");
  }

  if (!stats) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(key);
        }}
        className="mx-auto mt-10 max-w-sm space-y-3 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h1 className="text-xl font-extrabold">📊 Статистика</h1>
        <p className="text-sm text-zinc-500">Страница только для владельца. Введите ключ доступа.</p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="current-password"
          placeholder="Ключ"
          className="w-full rounded-2xl border border-zinc-200 bg-transparent px-4 py-3 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={loading || !key}
          className="ig-gradient w-full rounded-2xl px-4 py-3 font-bold text-white disabled:opacity-60"
        >
          {loading ? "Загрузка…" : "Открыть"}
        </button>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </form>
    );
  }

  const t = stats.totals[period];
  const maxDay = Math.max(1, ...stats.daily.map((d) => d.visitors));
  const conversion = t.visitors ? Math.round((t.participate / t.visitors) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">📊 Статистика</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => load(key)}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-semibold dark:border-zinc-700"
          >
            {loading ? "…" : "↻ Обновить"}
          </button>
          <button type="button" onClick={logout} className="rounded-full px-3 py-1.5 text-sm text-zinc-500">
            Выйти
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-full bg-zinc-100 p-1 text-sm font-semibold dark:bg-zinc-900">
        {PERIODS.map(([p, name]) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 transition ${
              p === period ? "bg-white shadow-sm dark:bg-zinc-700" : "text-zinc-500"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TILES.map(([k, name, hint]) => (
          <div key={k} className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold text-zinc-500">{name}</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums">{nf.format(t[k])}</div>
            <div className="mt-1 text-xs text-zinc-400">{hint}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Fact name="Подписчиков на уведомления" value={stats.subscribers} />
        <Fact name="Акций на сайте сейчас" value={stats.active_giveaways} />
        <Fact name="Переходят к акции" value={`${conversion}%`} hint="посетителей за период" />
      </div>

      <section className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 font-bold">Посетители по дням (30 дней)</h2>
        <div className="flex h-40 items-end gap-[3px]">
          {stats.daily.map((d) => (
            <div
              key={d.d}
              className="group relative flex h-full flex-1 items-end"
              title={`${new Date(d.d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}: ${d.visitors} посетит., ${d.participate} переходов`}
            >
              <div
                className="ig-gradient w-full rounded-t-[3px] opacity-80 group-hover:opacity-100"
                style={{ height: `${Math.max(d.visitors ? 4 : 1, (d.visitors / maxDay) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
          <span>{new Date(stats.daily[0]?.d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span>
          <span>сегодня</span>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 font-bold">Самые популярные акции (30 дней)</h2>
        {stats.top.length === 0 ? (
          <p className="text-sm text-zinc-500">Пока никто не переходил к акциям.</p>
        ) : (
          <ol className="space-y-2">
            {stats.top.map((g, i) => (
              <li key={g.post_url} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-right font-bold text-zinc-400">{i + 1}</span>
                <a href={g.post_url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:underline">
                  {g.title}
                  {g.account_name && <span className="text-zinc-400"> · @{g.account_name}</span>}
                </a>
                <span className="font-bold tabular-nums">{nf.format(g.clicks)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {DIMS.map(([dim, name]) => {
          const rows = stats.split.filter((s) => s.dim === dim).slice(0, 8);
          const total = rows.reduce((a, r) => a + r.n, 0) || 1;
          return (
            <section key={dim} className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-3 font-bold">{name}</h2>
              {rows.length === 0 ? (
                <p className="text-sm text-zinc-500">Пока нет данных.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {rows.map((r) => (
                    <li key={r.k}>
                      <div className="flex justify-between gap-2">
                        <span className="truncate">{label(dim, r.k)}</span>
                        <span className="font-semibold tabular-nums">
                          {nf.format(r.n)} <span className="text-zinc-400">· {Math.round((r.n / total) * 100)}%</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div className="ig-gradient h-full" style={{ width: `${(r.n / total) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400">
        Считаются только посетители сайта; участие в самом розыгрыше происходит в Instagram — здесь видно, сколько
        людей перешли к посту. Твои собственные заходы с этого браузера не учитываются.
      </p>
    </div>
  );
}

function Fact({ name, value, hint }: { name: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-3xl bg-zinc-100 p-4 dark:bg-zinc-900">
      <div className="text-xs font-semibold text-zinc-500">{name}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">{typeof value === "number" ? nf.format(value) : value}</div>
      {hint && <div className="text-xs text-zinc-400">{hint}</div>}
    </div>
  );
}
