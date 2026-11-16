"use client";

import { useState, type FormEvent } from "react";
import { CATEGORY_LABELS, DICT, REGION_CODES, REGION_LABELS, type Lang } from "@/lib/i18n";
import { getSupabase } from "@/lib/supabase";
import { CATEGORIES, type Category } from "@/lib/types";

const POST_RE = /^https?:\/\/(?:www\.|m\.)?instagram\.com\/(?:([A-Za-z0-9._]+)\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/i;

type Status = { kind: "idle" | "sending" | "ok" | "error"; message?: string };

const inputCls =
  "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-500/15 dark:border-zinc-800 dark:bg-zinc-900";

export default function SubmitForm({ lang }: { lang: Lang }) {
  const t = DICT[lang];
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<Category>("Техника");
  const [region, setRegion] = useState<string>("tashkent");
  const [prize, setPrize] = useState("");
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const m = url.trim().match(POST_RE);
    if (!m) return setStatus({ kind: "error", message: t.fBadUrl });
    if (prize.trim().length < 3) return setStatus({ kind: "error", message: t.fShort });
    const sb = getSupabase();
    if (!sb) return setStatus({ kind: "error", message: t.fNoDb });

    setStatus({ kind: "sending" });
    const accountName = (account.trim().replace(/^@/, "") || m[1] || null) as string | null;
    const prizeText = prize.trim().slice(0, 1000);
    const { error } = await sb.from("giveaways").insert({
      post_url: `https://www.instagram.com/p/${m[2]}/`,
      account_name: accountName,
      title: prizeText.slice(0, 60),
      prize: prizeText,
      category,
      region,
      conditions: [],
      end_date: "Не указана",
      source_type: "user_submit",
      is_active: false,
    });

    if (error) {
      const dup = error.code === "23505";
      setStatus({ kind: dup ? "ok" : "error", message: dup ? t.fDup : `${t.fFail} ${error.message}` });
      return;
    }
    setStatus({ kind: "ok", message: t.fOk });
    setUrl("");
    setPrize("");
    setAccount("");
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
      active
        ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    }`;

  return (
    <div className="mx-auto max-w-xl py-4 sm:py-8">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.submitTitle}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t.submitLead}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.fUrl}</span>
          <input
            type="url"
            inputMode="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/…"
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.fAccount}</span>
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="@brand.uz"
            maxLength={40}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.fRegion}</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls}>
            {REGION_CODES.map((code) => (
              <option key={code} value={code}>
                {REGION_LABELS[code][lang]}
              </option>
            ))}
            <option value="all">{REGION_LABELS.all[lang]}</option>
          </select>
        </label>

        <fieldset>
          <legend className="mb-1.5 block text-sm font-semibold">{t.fCategory}</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c} className={chip(category === c)}>
                {CATEGORY_LABELS[c][lang]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.fPrize}</span>
          <textarea
            required
            rows={4}
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            placeholder={t.fPrizePh}
            maxLength={1000}
            className={inputCls}
          />
        </label>

        <button
          type="submit"
          disabled={status.kind === "sending"}
          className="ig-gradient w-full rounded-2xl px-4 py-3.5 font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {status.kind === "sending" ? t.fSending : t.fSend}
        </button>

        {status.message && (
          <p
            role="status"
            className={`rounded-xl p-3 text-sm ${
              status.kind === "ok"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            {status.message}
          </p>
        )}
      </form>
    </div>
  );
}
