"""Push-уведомления о новых акциях (Web Push, работает в Chrome/Android/Edge/Firefox и в iPhone с сайтом на экране «Домой»).

Подписки лежат в таблице push_subscriptions (их добавляет сайт через функцию subscribe_push).
Ключи VAPID: VAPID_PRIVATE_KEY (секрет) — здесь, NEXT_PUBLIC_VAPID_PUBLIC_KEY — на сайте.
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone

log = logging.getLogger("notifier")

SITE_URL = os.getenv("SITE_URL", "https://giveaway-uz.vercel.app").rstrip("/")
MAX_TITLES = 3

TEXT = {
    "ru": {"one": "🎁 Новая халява", "many": "🎁 Новых бесплатных акций: {n}", "more": "и ещё {n}"},
    "uz": {"one": "🎁 Yangi tekin aksiya", "many": "🎁 Yangi bepul aksiyalar: {n}", "more": "va yana {n} ta"},
}


def send_new(sb) -> None:
    private_key = os.getenv("VAPID_PRIVATE_KEY", "").lstrip("﻿").strip()
    if not private_key:
        log.info("Уведомления: VAPID_PRIVATE_KEY не задан — пропуск")
        return
    from pywebpush import WebPushException, webpush

    since = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    new = (
        sb.table("giveaways")
        .select("id,title,title_uz,region")
        .eq("is_active", True)
        .eq("notified", False)
        .gte("created_at", since)
        .order("created_at", desc=True)
        .limit(200)
        .execute()
        .data
        or []
    )
    if not new:
        log.info("Уведомления: новых акций нет")
        return

    subs = sb.table("push_subscriptions").select("*").execute().data or []
    sent = gone = 0
    for s in subs:
        regions = set(s.get("regions") or [])
        mine = [g for g in new if not regions or g["region"] == "all" or g["region"] in regions]
        if not mine:
            continue
        lang = "uz" if s.get("lang") == "uz" else "ru"
        t = TEXT[lang]
        titles = [(g.get("title_uz") if lang == "uz" else None) or g.get("title") or "" for g in mine]
        if len(mine) == 1:
            title, body = t["one"], titles[0]
        else:
            title = t["many"].format(n=len(mine))
            body = " · ".join(titles[:MAX_TITLES])
            if len(mine) > MAX_TITLES:
                body += " " + t["more"].format(n=len(mine) - MAX_TITLES)
        payload = json.dumps({"title": title, "body": body, "url": f"{SITE_URL}/{'uz' if lang == 'uz' else ''}"})
        try:
            webpush(
                subscription_info={"endpoint": s["endpoint"], "keys": {"p256dh": s["p256dh"], "auth": s["auth"]}},
                data=payload,
                vapid_private_key=private_key,
                vapid_claims={"sub": SITE_URL},
                ttl=24 * 3600,
                timeout=15,
            )
            sent += 1
        except WebPushException as e:
            code = getattr(e.response, "status_code", None)
            if code in (404, 410):  # подписка отозвана (человек отключил уведомления)
                sb.table("push_subscriptions").delete().eq("endpoint", s["endpoint"]).execute()
                gone += 1
            else:
                log.warning("Push не доставлен (%s): %s", code, str(e)[:150])
        except Exception as e:
            log.warning("Push ошибка: %s", str(e)[:150])

    sb.table("giveaways").update({"notified": True}).in_("id", [g["id"] for g in new]).execute()
    log.info("Уведомления: новых акций %d, отправлено %d подписчикам, удалено устаревших подписок %d",
             len(new), sent, gone)
