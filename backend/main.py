"""Точка входа: сбор → дедупликация → ИИ-разбор → сохранение в Supabase.

Запуск:  python main.py               (все источники)
         python main.py --only google  (один источник: google | account | hashtag)
         python main.py --dry-run      (без записи в БД)
"""
from __future__ import annotations

import argparse
import logging
import os
import sys

from dotenv import load_dotenv
from supabase import Client, create_client

from collectors import accounts_collector, google_collector, hashtag_collector
from collectors.base import RawPost

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
for noisy in ("primp", "httpx", "httpx2", "httpcore", "ddgs", "ddgs.ddgs", "google_genai"):
    logging.getLogger(noisy).setLevel(logging.WARNING)
log = logging.getLogger("main")

MAX_AI_CALLS_PER_RUN = int(os.getenv("MAX_AI_CALLS_PER_RUN", "60"))


def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY не заданы")
    return create_client(url, key)


def collect_all(only: str | None) -> list[RawPost]:
    sources = {
        "google": google_collector.collect,
        "account": accounts_collector.collect,
        "hashtag": hashtag_collector.collect,
    }
    posts: list[RawPost] = []
    for name, fn in sources.items():
        if only and only != name:
            continue
        try:
            posts.extend(fn())
        except Exception as e:  # один упавший сборщик не должен ронять весь запуск
            log.exception("Сборщик %s упал: %s", name, e)

    # дедупликация внутри запуска; приоритет — посты с более полным текстом
    unique: dict[str, RawPost] = {}
    for p in posts:
        prev = unique.get(p.post_url)
        if prev is None or len(p.text) > len(prev.text):
            unique[p.post_url] = p
    return list(unique.values())


def known_urls(sb: Client, urls: list[str]) -> set[str]:
    """URL, которые уже есть в giveaways или rejected_posts — их не отправляем в ИИ."""
    known: set[str] = set()
    for i in range(0, len(urls), 100):
        chunk = urls[i : i + 100]
        for table in ("giveaways", "rejected_posts"):
            try:
                res = sb.table(table).select("post_url").in_("post_url", chunk).execute()
                known.update(row["post_url"] for row in res.data or [])
            except Exception as e:
                log.warning("Не удалось проверить дубликаты в %s: %s", table, e)
    return known


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=["google", "account", "hashtag"])
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    from ai_parser import AIParser  # импорт здесь, чтобы --help работал без ключей

    sb = None if args.dry_run else get_supabase()
    parser = AIParser()

    posts = collect_all(args.only)
    log.info("Собрано уникальных постов: %d", len(posts))
    if not posts:
        return 0

    if sb is not None:
        seen = known_urls(sb, [p.post_url for p in posts])
        posts = [p for p in posts if p.post_url not in seen]
        log.info("Новых (ещё не в базе): %d", len(posts))

    posts = posts[:MAX_AI_CALLS_PER_RUN]

    # у постов из поиска только короткий сниппет — пробуем подтянуть полный текст
    google_external = [p for p in posts if p.source_type == "google"]
    google_collector.enrich(google_external, limit=10)

    saved = rejected = failed = 0
    for p in posts:
        result = parser.parse(p.text, p.account_name)
        if result is None:
            failed += 1  # ошибка API — не помечаем, попробуем в следующий раз
            continue

        if not result["is_valid"]:
            rejected += 1
            log.info("✗ %s — не розыгрыш/неактуален", p.post_url)
            if sb is not None:
                try:
                    sb.table("rejected_posts").upsert(
                        {"post_url": p.post_url, "reason": "ai_invalid"}, on_conflict="post_url"
                    ).execute()
                except Exception as e:
                    log.warning("Не удалось записать rejected: %s", e)
            continue

        row = {
            "post_url": p.post_url,
            "account_name": p.account_name,
            "image_url": p.image_url,
            "title": result["title"],
            "prize": result["prize"],
            "conditions": result["conditions"],
            "end_date": result["end_date"],
            "category": result["category"],
            "source_type": p.source_type,
            "is_active": True,
        }
        log.info("✓ %s — %s [%s]", p.post_url, row["title"], row["category"])
        if sb is None:
            saved += 1
            continue
        try:
            sb.table("giveaways").upsert(row, on_conflict="post_url", ignore_duplicates=True).execute()
            saved += 1
        except Exception as e:
            failed += 1
            log.error("Ошибка записи %s: %s", p.post_url, e)

    log.info("Итог: сохранено %d, отклонено %d, ошибок %d", saved, rejected, failed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
