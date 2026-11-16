"""Точка входа: сбор → дедупликация → ИИ-разбор → сохранение в Supabase.

Запуск:  python main.py               (все источники)
         python main.py --only google  (один источник: google | account | hashtag)
         python main.py --dry-run      (без записи в БД)
"""
from __future__ import annotations

import argparse
import logging
import os
import re
import sys

from dotenv import load_dotenv
from supabase import Client, create_client

from datetime import date, datetime, timedelta, timezone

from collectors import accounts_collector, google_collector, hashtag_collector
from collectors.base import RawPost, posted_at_from_url

load_dotenv()
# убираем BOM/пробелы из ключей (бывает при копировании или передаче через PowerShell)
for _k in ("SUPABASE_URL", "SUPABASE_SERVICE_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "IG_USERNAME", "IG_PASSWORD"):
    if _k in os.environ:
        os.environ[_k] = os.environ[_k].lstrip("﻿").strip()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
for noisy in ("primp", "httpx", "httpx2", "httpcore", "ddgs", "ddgs.ddgs", "google_genai"):
    logging.getLogger(noisy).setLevel(logging.WARNING)
log = logging.getLogger("main")

# сколько постов за запуск отдаём ИИ; разбираются пачками по AI_BATCH за один запрос
MAX_AI_CALLS_PER_RUN = int(os.getenv("MAX_AI_CALLS_PER_RUN", "150"))
AI_BATCH = int(os.getenv("AI_BATCH", "5"))
# посты старше этого даже не отправляем в ИИ — почти всегда уже прошли
MAX_POST_AGE_DAYS = int(os.getenv("MAX_POST_AGE_DAYS", "30"))
# акция без даты окончания скрывается через столько дней после публикации
NO_END_DATE_TTL_DAYS = int(os.getenv("NO_END_DATE_TTL_DAYS", "21"))
TASHKENT = timezone(timedelta(hours=5))  # в Узбекистане нет перехода на летнее время


def to_ts(d: str, t: str, default_time: str) -> str | None:
    """'2026-11-20' + '10:00' (по Ташкенту) → ISO-время для базы."""
    if not d:
        return None
    hh, mm = (t or default_time).split(":")
    dt = datetime.combine(date.fromisoformat(d), datetime.min.time(), TASHKENT).replace(hour=int(hh), minute=int(mm))
    return dt.isoformat()

# слова «халявы» — посты с ними проверяем первыми, чтобы лимит ИИ тратился на самые вероятные
FREE_WORDS = (
    "розыгрыш", "разыгр", "конкурс", "дарим", "подар", "приз", "бесплатн", "халяв", "гив", "giveaway",
    "free", "gift", "konkurs", "sovg", "yutib", "yutuq", "bepul", "tekin", "o'yin", "совға", "ютиб",
)


def free_score(p: RawPost) -> int:
    t = (p.text or "").lower()
    return sum(w in t for w in FREE_WORDS)


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
    # без входа Instagram страницы брендов и хэштеги не отдаёт — не тратим на них ~6 минут каждого запуска
    has_ig = bool(os.getenv("IG_USERNAME", "").strip() and (os.getenv("IG_PASSWORD") or os.getenv("IG_SESSION_B64")))
    posts: list[RawPost] = []
    for name, fn in sources.items():
        if only and only != name:
            continue
        if name in ("account", "hashtag") and not has_ig and only != name:
            log.info("Сборщик %s пропущен: нет входа в Instagram", name)
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


def _norm(s: str | None) -> str:
    """Название без регистра, пунктуации и города в скобках — для поиска дублей."""
    s = re.sub(r"\(.*?\)", " ", (s or "").lower())
    return " ".join(re.findall(r"[\w']+", s))


def dedupe_key(row: dict) -> tuple[str, str]:
    """Одна и та же акция часто выложена несколькими постами одного аккаунта (пост + рилс + повтор)."""
    return (row.get("account_name") or "").lower(), _norm(row.get("title"))


def active_keys(sb: Client) -> set[tuple[str, str]]:
    try:
        rows = sb.table("giveaways").select("account_name,title").eq("is_active", True).limit(1000).execute().data or []
    except Exception as e:
        log.warning("Не удалось загрузить активные акции для поиска дублей: %s", e)
        return set()
    # без аккаунта дубли не ищем — слишком велик риск склеить разные акции
    return {dedupe_key(r) for r in rows if r.get("account_name")}


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

    # дата публикации — прямо из ссылки; старые посты отсеиваем без ИИ (экономим лимит)
    now = datetime.now(timezone.utc)
    fresh, old = [], []
    for p in posts:
        p.posted_at = p.posted_at or posted_at_from_url(p.post_url)
        if p.posted_at and p.posted_at < now - timedelta(days=MAX_POST_AGE_DAYS):
            old.append(p)
        else:
            fresh.append(p)
    if old:
        log.info("Старше %d дней, пропускаем: %d", MAX_POST_AGE_DAYS, len(old))
        if sb is not None:
            try:
                sb.table("rejected_posts").upsert(
                    [{"post_url": p.post_url, "reason": "old"} for p in old], on_conflict="post_url"
                ).execute()
            except Exception as e:
                log.warning("Не удалось записать старые посты: %s", e)
    posts = fresh

    posts.sort(key=free_score, reverse=True)
    if len(posts) > MAX_AI_CALLS_PER_RUN:
        log.info("Проверим %d самых вероятных, остальные %d — в следующий запуск",
                 MAX_AI_CALLS_PER_RUN, len(posts) - MAX_AI_CALLS_PER_RUN)
    posts = posts[:MAX_AI_CALLS_PER_RUN]

    # у постов из поиска только короткий сниппет — пробуем подтянуть полный текст
    google_external = [p for p in posts if p.source_type == "google"]
    google_collector.enrich(google_external, limit=10)

    def reject(p: RawPost, reason: str, why: str) -> None:
        log.info("✗ %s — %s", p.post_url, why)
        if sb is not None:
            try:
                sb.table("rejected_posts").upsert({"post_url": p.post_url, "reason": reason},
                                                  on_conflict="post_url").execute()
            except Exception as e:
                log.warning("Не удалось записать rejected: %s", e)

    existing = active_keys(sb) if sb is not None else set()
    saved = rejected = failed = 0
    for start in range(0, len(posts), AI_BATCH):
        batch = posts[start : start + AI_BATCH]
        results = parser.parse_many(
            [(p.text, p.account_name, p.posted_at.astimezone(TASHKENT).date() if p.posted_at else None) for p in batch]
        )
        for p, result in zip(batch, results):
            if result is None:
                failed += 1  # ошибка API — не помечаем, попробуем в следующий раз
                continue

            row = build_row(p.post_url, p.account_name, p.image_url, p.source_type, p.posted_at, result)
            if not result["is_valid"] or row is None:
                rejected += 1
                reject(p, "expired" if result["is_valid"] else "ai_invalid",
                       "уже прошло" if result["is_valid"] else "не халява/неактуально")
                continue

            if row.get("account_name"):
                key = dedupe_key(row)
                if key in existing:
                    rejected += 1
                    reject(p, "duplicate", f"дубль: {row['title']}")
                    continue
                existing.add(key)

            log.info("✓ %s — %s [%s, %s]", p.post_url, row["title"], row["category"], row["region"])
            if sb is None:
                saved += 1
                continue
            try:
                sb.table("giveaways").upsert(row, on_conflict="post_url", ignore_duplicates=True).execute()
                saved += 1
            except Exception as e:
                failed += 1
                log.error("Ошибка записи %s: %s", p.post_url, e)

    log.info("Итог: сохранено %d, отклонено %d, ошибок %d (разобрал Gemini: %d, Groq: %d)",
             saved, rejected, failed, parser.stats["gemini"], parser.stats["groq"])

    if sb is not None:
        deactivate_expired(sb)
        try:
            import notifier

            notifier.send_new(sb)
        except Exception as e:  # уведомления не должны ронять сбор
            log.warning("Уведомления не отправлены: %s", e)
    return 0


def build_row(post_url, account_name, image_url, source_type, posted_at, result) -> dict | None:
    """Строка для базы из ответа ИИ. None — если по датам акция уже закончилась."""
    ends_at = to_ts(result["end_date_iso"], result["end_time"], "23:59")
    if ends_at and datetime.fromisoformat(ends_at) < datetime.now(timezone.utc):
        return None
    return {
        "post_url": post_url,
        "account_name": account_name,
        "image_url": image_url,
        "title": result["title"],
        "prize": result["prize"],
        "conditions": result["conditions"],
        "end_date": result["end_date"],
        "category": result["category"],
        "region": result["region"],
        "starts_at": to_ts(result["start_date"], result["start_time"], "00:00"),
        "ends_at": ends_at,
        "posted_at": posted_at.isoformat() if posted_at else None,
        "title_uz": result["title_uz"] or None,
        "prize_uz": result["prize_uz"] or None,
        "conditions_uz": result["conditions_uz"],
        "source_type": source_type,
        "is_active": True,
    }


def deactivate_expired(sb: Client) -> None:
    """Прячем с сайта прошедшие акции и старые посты без даты окончания."""
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=NO_END_DATE_TTL_DAYS)).isoformat()
    hidden = 0
    for q in (
        sb.table("giveaways").update({"is_active": False}).eq("is_active", True).lt("ends_at", now.isoformat()),
        sb.table("giveaways").update({"is_active": False}).eq("is_active", True).is_("ends_at", "null")
        .lt("posted_at", cutoff),
        sb.table("giveaways").update({"is_active": False}).eq("is_active", True).is_("ends_at", "null")
        .is_("posted_at", "null").lt("created_at", cutoff),
    ):
        try:
            hidden += len(q.execute().data or [])
        except Exception as e:
            log.warning("Не удалось скрыть прошедшие: %s", e)
    log.info("Скрыто прошедших/старых акций: %d", hidden)


if __name__ == "__main__":
    sys.exit(main())
