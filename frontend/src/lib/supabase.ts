import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Убирает BOM и пробелы, которые иногда попадают в переменные окружения при копировании. */
const clean = (v: string | undefined) => (v ?? "").replace(/^﻿/, "").trim();

/** Публичный (anon) клиент. Возвращает null, если ключи не заданы — сайт всё равно соберётся. */
export function getSupabase(): SupabaseClient | null {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export const SITE_URL = (clean(process.env.NEXT_PUBLIC_SITE_URL) || "http://localhost:3000").replace(/\/$/, "");
