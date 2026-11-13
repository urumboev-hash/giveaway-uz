"use client";

import { useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { CATEGORIES, type Category } from "@/lib/types";

const POST_RE = /^https?:\/\/(?:www\.|m\.)?instagram\.com\/(?:([A-Za-z0-9._]+)\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/i;

type Status = { kind: "idle" | "sending" | "ok" | "error"; message?: string };

const inputCls =
  "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none transition focus:border-pink-500 focus:ring-4 focus:ring-pink-500/15 dark:border-zinc-800 dark:bg-zinc-900";

export default function SubmitForm() {
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<Category>("Техника");
  const [prize, setPrize] = useState("");
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const m = url.trim().match(POST_RE);
    if (!m) {
      setStatus({ kind: "error", message: "Нужна ссылка на пост Instagram, например https://www.instagram.com/p/ABC123/" });
      return;
    }
    if (prize.trim().length < 3) {
      setStatus({ kind: "error", message: "Опишите приз хотя бы в нескольких словах." });
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setStatus({ kind: "error", message: "Сервис временно недоступен (Supabase не настроен)." });
      return;
    }

    setStatus({ kind: "sending" });
    const accountName = (account.trim().replace(/^@/, "") || m[1] || null) as string | null;
    const prizeText = prize.trim().slice(0, 1000);
    const { error } = await sb.from("giveaways").insert({
      post_url: `https://www.instagram.com/p/${m[2]}/`,
      account_name: accountName,
      title: prizeText.slice(0, 60),
      prize: prizeText,
      category,
      conditions: [],
      end_date: "Не указана",
      source_type: "user_submit",
      is_active: false,
    });

    if (error) {
      const dup = error.code === "23505";
      setStatus({
        kind: dup ? "ok" : "error",
        message: dup ? "Этот розыгрыш уже есть у нас — спасибо!" : `Не удалось отправить: ${error.message}`,
      });
      return;
    }
    setStatus({ kind: "ok", message: "Спасибо! Розыгрыш отправлен на модерацию и скоро появится на сайте." });
    setUrl("");
    setPrize("");
    setAccount("");
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Ссылка на пост *</span>
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
        <span className="mb-1.5 block text-sm font-semibold">Аккаунт организатора</span>
        <input
          type="text"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="@brand.uz"
          maxLength={40}
          className={inputCls}
        />
      </label>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold">Категория *</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                category === c
                  ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Что разыгрывается? *</span>
        <textarea
          required
          rows={4}
          value={prize}
          onChange={(e) => setPrize(e.target.value)}
          placeholder="Например: iPhone 16 Pro и 3 сертификата по 500 000 сум"
          maxLength={1000}
          className={inputCls}
        />
      </label>

      <button
        type="submit"
        disabled={status.kind === "sending"}
        className="ig-gradient w-full rounded-2xl px-4 py-3.5 font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
      >
        {status.kind === "sending" ? "Отправляем…" : "Отправить на модерацию"}
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
  );
}
