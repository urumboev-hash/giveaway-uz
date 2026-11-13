"use client";

import { useState } from "react";
import { CATEGORY_EMOJI, type Giveaway } from "@/lib/types";

interface Props {
  g: Giveaway;
  joined: boolean;
  checked: number[];
  onToggleJoined: () => void;
  onToggleCheck: (index: number) => void;
}

export default function GiveawayCard({ g, joined, checked, onToggleJoined, onToggleCheck }: Props) {
  const [imgOk, setImgOk] = useState(Boolean(g.image_url));
  const conditions = Array.isArray(g.conditions) ? g.conditions : [];
  const done = conditions.filter((_, i) => checked.includes(i)).length;
  const progress = conditions.length ? Math.round((done / conditions.length) * 100) : 0;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition dark:bg-zinc-900 ${
        joined ? "border-pink-400 ring-2 ring-pink-400/30" : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {imgOk && g.image_url ? (
        <img
          src={g.image_url}
          alt={g.title ?? "Розыгрыш"}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgOk(false)}
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="ig-gradient grid aspect-[4/3] w-full place-items-center text-6xl" aria-hidden>
          {CATEGORY_EMOJI[g.category] ?? "🎁"}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="rounded-full bg-pink-50 px-2.5 py-1 font-semibold text-pink-700 dark:bg-pink-950 dark:text-pink-300">
            {CATEGORY_EMOJI[g.category]} {g.category}
          </span>
          {g.account_name && (
            <a
              href={`https://www.instagram.com/${g.account_name}/`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="truncate font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              @{g.account_name}
            </a>
          )}
        </div>

        <h2 className="text-xl font-extrabold leading-snug">{g.title || "Розыгрыш"}</h2>
        {g.prize && <p className="text-sm text-zinc-600 dark:text-zinc-400">{g.prize}</p>}

        {conditions.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span>Условия</span>
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

        <div className="mt-auto flex items-center gap-1.5 pt-1 text-sm text-zinc-500">
          <span aria-hidden>⏰</span> Итоги: <b className="text-zinc-800 dark:text-zinc-200">{g.end_date || "Не указана"}</b>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <a
            href={g.post_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="ig-gradient rounded-2xl px-4 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:opacity-90"
          >
            Участвовать в Instagram ↗
          </a>
          <button
            type="button"
            onClick={onToggleJoined}
            aria-pressed={joined}
            className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
              joined
                ? "border-pink-500 bg-pink-500 text-white"
                : "border-zinc-200 hover:border-pink-400 dark:border-zinc-700"
            }`}
          >
            {joined ? "✓ Участвую" : "Я участвую"}
          </button>
        </div>
      </div>
    </article>
  );
}
