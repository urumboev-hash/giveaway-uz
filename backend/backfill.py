"""Разовое обновление уже сохранённых акций после миграции 002.

- дата публикации из ссылки → posted_at;
- старые (без срока и старше NO_END_DATE_TTL_DAYS) скрываем без ИИ;
- свежие заново прогоняем через ИИ: область, даты начала/окончания, узбекский перевод;
- всем ставим notified = true, чтобы подписчикам не пришла рассылка о старых акциях.

Запуск: python backfill.py [--limit N]
"""
from __future__ import annotations

import argparse
import logging
from datetime import datetime, timedelta, timezone

import main  # загружает .env и настраивает логи
from ai_parser import AIParser
from collectors.base import posted_at_from_url

log = logging.getLogger("backfill")


def main_() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=200)
    args = ap.parse_args()

    sb = main.get_supabase()
    rows = sb.table("giveaways").select("*").eq("is_active", True).execute().data or []
    log.info("Активных записей: %d", len(rows))
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=main.NO_END_DATE_TTL_DAYS)

    parser = None
    hidden = updated = failed = 0
    for r in rows:
        posted = posted_at_from_url(r["post_url"])
        base = {"posted_at": posted.isoformat() if posted else None, "notified": True}
        if posted and posted < cutoff:
            sb.table("giveaways").update({**base, "is_active": False}).eq("id", r["id"]).execute()
            hidden += 1
            continue
        if r.get("title_uz") or updated >= args.limit:
            sb.table("giveaways").update(base).eq("id", r["id"]).execute()
            continue

        parser = parser or AIParser()
        text = "\n".join(
            filter(None, [r.get("title"), r.get("prize"), "Условия: " + "; ".join(r.get("conditions") or []),
                          f"Итоги: {r.get('end_date')}" if r.get("end_date") else None])
        )
        res = parser.parse(text, r.get("account_name"), posted.astimezone(main.TASHKENT).date() if posted else None)
        if res is None:
            failed += 1
            sb.table("giveaways").update(base).eq("id", r["id"]).execute()
            continue
        row = main.build_row(r["post_url"], r.get("account_name"), r.get("image_url"), r["source_type"], posted,
                             {**res, "is_valid": True})
        if row is None:  # по датам уже закончилась
            sb.table("giveaways").update({**base, "is_active": False}).eq("id", r["id"]).execute()
            hidden += 1
            continue
        patch = {k: row[k] for k in ("region", "starts_at", "ends_at", "title_uz", "prize_uz", "conditions_uz")}
        sb.table("giveaways").update({**base, **patch}).eq("id", r["id"]).execute()
        updated += 1
        log.info("↻ %s — %s [%s]", r["post_url"], r.get("title"), patch["region"])

    log.info("Готово: скрыто старых %d, обновлено %d, ошибок ИИ %d", hidden, updated, failed)


if __name__ == "__main__":
    main_()
