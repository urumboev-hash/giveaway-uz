"use client";

import { useEffect, useState } from "react";
import { CATEGORY_LABELS, DICT, formatDate, REGION_LABELS, sameTashkentDay, type Lang, type RegionCode } from "@/lib/i18n";
import { CATEGORY_EMOJI, type Giveaway } from "@/lib/types";

interface Props {
  g: Giveaway;
  lang: Lang;
  joined: boolean;
  checked: number[];
  onToggleJoined: () => void;
  onToggleCheck: (index: number) => void;
}

type Status = "soon" | "live" | "endsToday" | null;

function statusOf(g: Giveaway, now: Date): Status {
  if (g.starts_at && new Date(g.starts_at) > now) return "soon";
  if (g.ends_at && sameTashkentDay(g.ends_at, now)) return "endsToday";
  if (g.starts_at) return "live";
  return null;
}

const STATUS_CLS: Record<Exclude<Status, null>, string> = {
  soon: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  live: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  endsToday: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
};

export default function GiveawayCard({ g, lang, joined, checked, onToggleJoined, onToggleCheck }: Props) {
  const t = DICT[lang];
  const [imgOk, setImgOk] = useState(Boolean(g.image_url));
  // статус зависит от текущего времени — считаем только в браузере, чтобы не было расхождений с серверной версией
  const [status, setStatus] = useState<Status>(null);
  useEffect(() => setStatus(statusOf(g, new Date())), [g]);

  const uz = lang === "uz";
  const title = (uz && g.title_uz) || g.title || t.giveaway;
  const prize = (uz && g.prize_uz) || g.prize;
  const condUz = Array.isArray(g.conditions_uz) && g.conditions_uz.length ? g.conditions_uz : null;
  const conditions = (uz && condUz) || (Array.isArray(g.conditions) ? g.conditions : []);
  const done = conditions.filter((_, i) => checked.includes(i)).length;
  const progress = conditions.length ? Math.round((done / conditions.length) * 100) : 0;
  const region = REGION_LABELS[(g.region as RegionCode) in REGION_LABELS ? (g.region as RegionCode) : "all"][lang];
  const legacyEnd = !g.ends_at && g.end_date && g.end_date !== "Не указана" ? g.end_date : null;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition dark:bg-zinc-900 ${
        joined ? "border-pink-400 ring-2 ring-pink-400/30" : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {imgOk && g.image_url ? (
        <img
          src={g.image_url}
          alt={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgOk(false)}
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="ig-gradient relative grid aspect-[16/9] w-full place-items-center text-6xl" aria-hidden>
          {CATEGORY_EMOJI[g.category] ?? "🎁"}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-full bg-pink-50 px-2.5 py-1 font-semibold text-pink-700 dark:bg-pink-950 dark:text-pink-300">
            {CATEGORY_EMOJI[g.category]} {CATEGORY_LABELS[g.category]?.[lang] ?? g.category}
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            📍 {region}
          </span>
          {status && <span className={`rounded-full px-2.5 py-1 font-semibold ${STATUS_CLS[status]}`}>{t[status]}</span>}
        </div>

        <h2 className="text-xl font-extrabold leading-snug">{title}</h2>
        {prize && <p className="text-sm text-zinc-600 dark:text-zinc-400">{prize}</p>}

        <dl className="grid gap-1 rounded-2xl bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50">
          {g.starts_at && (
            <div className="flex gap-2">
              <dt className="text-zinc-500">🕒 {t.starts}:</dt>
              <dd className="font-semibold">{formatDate(g.starts_at, lang)}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="text-zinc-500">⏰ {t.ends}:</dt>
            <dd className="font-semibold">
              {g.ends_at ? formatDate(g.ends_at, lang) : (legacyEnd ?? <span className="font-normal text-zinc-500">{t.endsUnknown}</span>)}
            </dd>
          </div>
          {g.posted_at && (
            <div className="flex gap-2 text-xs">
              <dt className="text-zinc-500">{t.posted}:</dt>
              <dd className="text-zinc-500">{formatDate(g.posted_at, lang).split(",")[0]}</dd>
            </div>
          )}
        </dl>

        {conditions.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span>{t.conditions}</span>
              <span>
                {done}/{conditions.length}
              </span>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="ig-gradient h-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <ul className="space-y-1">
              {conditions.map((c, i) => {
                const on = checked.includes(i);
                return (
                  <li key={i}>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => onToggleCheck(i)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-pink-600"
                      />
                      <span className={on ? "text-zinc-400 line-through" : ""}>{c}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {g.account_name && (
          <a
            href={`https://www.instagram.com/${g.account_name}/`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-auto truncate text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            @{g.account_name}
          </a>
        )}

        <div className={`grid grid-cols-[1fr_auto] gap-2 ${g.account_name ? "" : "mt-auto"}`}>
          <a
            href={g.post_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="ig-gradient rounded-2xl px-4 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:opacity-90"
          >
            {t.participate}
          </a>
          <button
            type="button"
            onClick={onToggleJoined}
            aria-pressed={joined}
            className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
              joined ? "border-pink-500 bg-pink-500 text-white" : "border-zinc-200 hover:border-pink-400 dark:border-zinc-700"
            }`}
          >
            {joined ? t.joined : t.join}
          </button>
        </div>
      </div>
    </article>
  );
}
