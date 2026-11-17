"use client";

import { getSupabase } from "@/lib/supabase";

export type EventKind = "visit" | "participate" | "join" | "share" | "notify";

const OWNER_FLAG = "giveuz_owner";

function store(kind: "local" | "session") {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Анонимный id браузера — чтобы считать уникальных посетителей (никаких личных данных). */
function visitorId(): string {
  const ls = store("local");
  let id = ls?.getItem("giveuz_vid") ?? "";
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    try {
      ls?.setItem("giveuz_vid", id);
    } catch {
      /* приватный режим */
    }
  }
  return id;
}

function device(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android";
  return "Компьютер";
}

/** Откуда пришёл: utm_source, иначе домен ссылки (Instagram, Telegram, Google…). */
function referrer(): string {
  try {
    const utm = new URLSearchParams(location.search).get("utm_source");
    if (utm) return utm.toLowerCase().slice(0, 40);
    if (!document.referrer) return "";
    const host = new URL(document.referrer).hostname.replace(/^www\.|^l\.|^m\./, "");
    if (host === location.hostname) return "";
    if (/instagram/.test(host)) return "instagram";
    if (/t\.me|telegram/.test(host)) return "telegram";
    if (/google/.test(host)) return "google";
    if (/yandex/.test(host)) return "yandex";
    if (/facebook|fb\./.test(host)) return "facebook";
    return host;
  } catch {
    return "";
  }
}

export function isOwner(): boolean {
  return store("local")?.getItem(OWNER_FLAG) === "1";
}

export function markOwner(): void {
  try {
    store("local")?.setItem(OWNER_FLAG, "1");
  } catch {
    /* ignore */
  }
}

/** Записывает событие в статистику. Ошибки молча игнорируются — сайт не должен ломаться из-за счётчика. */
export function track(kind: EventKind, extra: { lang?: string; region?: string | null; giveawayId?: string } = {}): void {
  if (typeof window === "undefined" || isOwner()) return;
  const sb = getSupabase();
  if (!sb) return;
  sb.rpc("log_event", {
    p_kind: kind,
    p_visitor: visitorId(),
    p_lang: extra.lang ?? (location.pathname.startsWith("/uz") ? "uz" : "ru"),
    p_device: device(),
    p_referrer: kind === "visit" ? referrer() : null,
    p_region: extra.region ?? null,
    p_giveaway: extra.giveawayId ?? null,
  }).then(
    () => {},
    () => {},
  );
}

/** Одно посещение на вкладку за сессию. */
export function trackVisit(lang: string): void {
  const ss = store("session");
  if (ss?.getItem("giveuz_visit")) return;
  try {
    ss?.setItem("giveuz_visit", "1");
  } catch {
    /* ignore */
  }
  track("visit", { lang });
}
