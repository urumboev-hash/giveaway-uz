"use client";

import { useEffect, useState } from "react";
import { DICT, REGION_LABELS, type Lang, type RegionCode } from "@/lib/i18n";
import { getSupabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").replace(/^﻿/, "").trim();

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "busy";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

async function saveSubscription(sub: PushSubscription, region: string, lang: Lang) {
  const sb = getSupabase();
  if (!sb) throw new Error("no supabase");
  const json = sub.toJSON();
  const { error } = await sb.rpc("subscribe_push", {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? "",
    p_auth: json.keys?.auth ?? "",
    p_regions: region ? [region] : [],
    p_lang: lang,
  });
  if (error) throw error;
}

export default function NotifyButton({ lang, region }: { lang: Lang; region: string }) {
  const t = DICT[lang];
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "on" : "off");
      } catch {
        setState("unsupported");
      }
    })();
  }, []);

  // сменили область, а уведомления уже включены — обновляем подписку
  useEffect(() => {
    if (state !== "on") return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => sub && saveSubscription(sub, region, lang))
      .catch(() => {});
  }, [region, lang, state]);

  async function enable() {
    setState("busy");
    setMessage(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
      await saveSubscription(sub, region, lang);
      setState("on");
      setMessage(t.notifyDone);
    } catch {
      setState("off");
      setMessage(t.notifyError);
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await getSupabase()?.rpc("unsubscribe_push", { p_endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setMessage(t.notifyStopped);
    } finally {
      setState("off");
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  const scope = region ? `${t.notifyRegion}: ${REGION_LABELS[region as RegionCode]?.[lang] ?? region}` : t.notifyAll;

  return (
    <div className="my-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      {state === "ios-install" ? (
        <p className="text-zinc-600 dark:text-zinc-400">🔔 {t.notifyIos}</p>
      ) : state === "denied" ? (
        <p className="text-zinc-600 dark:text-zinc-400">🔕 {t.notifyDenied}</p>
      ) : (
        <>
          <button
            type="button"
            onClick={state === "on" ? disable : enable}
            disabled={state === "busy"}
            className={`rounded-full px-4 py-2 font-semibold transition disabled:opacity-60 ${
              state === "on"
                ? "border border-zinc-300 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
                : "ig-gradient text-white hover:opacity-90"
            }`}
          >
            {state === "on" ? t.notifyOff : t.notifyOn}
          </button>
          <span className="text-zinc-500">{scope}</span>
          {message && <span className="w-full text-zinc-600 dark:text-zinc-400">{message}</span>}
        </>
      )}
    </div>
  );
}
