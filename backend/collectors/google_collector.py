"""Поиск свежих постов-розыгрышей через DuckDuckGo (поиск по индексу instagram.com)."""
from __future__ import annotations

import logging
import random
import re
import time

try:  # duckduckgo-search переименован в ddgs (старый пакет больше не работает)
    from ddgs import DDGS
except ImportError:  # pragma: no cover
    from duckduckgo_search import DDGS  # type: ignore

# Поисковые движки ddgs по порядку: берём первый, что вернул посты Instagram
BACKENDS = ["yahoo", "duckduckgo", "brave", "startpage", "mojeek"]

from .base import RawPost, parse_post_url

log = logging.getLogger("collectors.google")

QUERIES = [
    'site:instagram.com "розыгрыш" "Ташкент"',
    'site:instagram.com "дарим" "условия"',
    'site:instagram.com "giveaway" "uzbekistan"',
    'site:instagram.com "konkurs" "toshkent"',
    # запасные формулировки без кавычек — бесплатные поисковики часто «молчат» на точные фразы
    "instagram.com розыгрыш Ташкент условия",
    "site:instagram.com giveaway uzbekistan",
    "instagram.com konkurs sovg'a toshkent",
]

# "Texnomart (@texnomart.uz) • Instagram photos..." / "@texnomart.uz on Instagram: ..."
_HANDLE_RE = re.compile(r"@([A-Za-z0-9._]{2,30})")


def collect(max_results_per_query: int = 25) -> list[RawPost]:
    posts: dict[str, RawPost] = {}
    try:
        ddgs = DDGS()
    except Exception as e:
        log.error("DuckDuckGo недоступен: %s", e)
        return []

    for query in QUERIES:
        results: list[dict] = []
        for backend in BACKENDS:
            try:
                found = ddgs.text(query, region="ru-ru", max_results=max_results_per_query, backend=backend) or []
            except Exception as e:  # rate limit / сетевые ошибки / нет результатов
                log.info("Запрос %r через %s не выполнен: %s", query, backend, str(e)[:120])
                continue
            if any(parse_post_url(r.get("href", "")) for r in found):
                results = found
                break

        for r in results:
            parsed = parse_post_url(r.get("href", ""))
            if not parsed:
                continue
            url, user = parsed
            title = r.get("title", "") or ""
            body = r.get("body", "") or ""
            if not user:
                m = _HANDLE_RE.search(title) or _HANDLE_RE.search(body)
                user = m.group(1) if m else None
            if url not in posts:
                posts[url] = RawPost(
                    post_url=url,
                    text=f"{title}\n{body}".strip(),
                    source_type="google",
                    account_name=user,
                )
        log.info("Запрос %r: найдено %d результатов", query, len(results))
        time.sleep(random.uniform(2, 5))

    log.info("Google/DDG: всего %d уникальных постов", len(posts))
    return list(posts.values())


def enrich(posts: list[RawPost], limit: int = 10) -> None:
    """Пытается подтянуть полный текст поста и картинку через Instaloader.

    Поисковый сниппет короткий, полная подпись даёт ИИ больше контекста.
    Ошибки игнорируются — пост остаётся со сниппетом.
    """
    if not posts:
        return
    try:
        import instaloader

        from .base import shortcode_from_url
        from .ig_session import get_loader

        loader, _ = get_loader()
    except Exception as e:
        log.warning("Обогащение пропущено: %s", e)
        return

    for post in posts[:limit]:
        code = shortcode_from_url(post.post_url)
        if not code:
            continue
        try:
            p = instaloader.Post.from_shortcode(loader.context, code)
            if p.caption:
                post.text = p.caption
            post.account_name = p.owner_username or post.account_name
            post.image_url = p.url
        except Exception as e:
            log.info("Не удалось обогатить %s: %s", post.post_url, e)
            if "429" in str(e) or "wait a few minutes" in str(e).lower():
                break  # Instagram просит подождать — дальше не долбим
        time.sleep(random.uniform(8, 15))
