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

# Общие запросы — каждый запуск. Ищем всё бесплатное: розыгрыши, конкурсы, подарки, бесплатные раздачи.
BASE_QUERIES = [
    'site:instagram.com "розыгрыш" "Ташкент"',
    'site:instagram.com "дарим" "условия"',
    'site:instagram.com "giveaway" "uzbekistan"',
    'site:instagram.com "konkurs" "toshkent"',
    "instagram.com розыгрыш Ташкент условия",
    "site:instagram.com giveaway uzbekistan",
    "instagram.com konkurs sovg'a toshkent",
    "site:instagram.com розыгрыш Узбекистан приз",
    "site:instagram.com бесплатно раздаём Ташкент",
    "site:instagram.com yutib oling konkurs",
    "site:instagram.com bepul sovg'a",
    "site:instagram.com tekin beramiz",
    "site:instagram.com sovg'a o'yini shartlari",
    "site:instagram.com конкурс подарок Узбекистан",
    "site:instagram.com бесплатный мастер-класс Ташкент",
    # узбекский кириллицей и другие формулировки
    "site:instagram.com совға ютиб олинг",
    "site:instagram.com конкурс шартлари совға",
    "site:instagram.com bepul aksiya",
    "site:instagram.com giveaway o'zbekiston",
    "site:instagram.com sovrin o'yini",
    "site:instagram.com розыгрыш дарим подписчикам Узбекистан",
]

# Регионы: (русское название, узбекское). Каждый запуск берём часть, за сутки обходим все.
REGIONS = [
    ("Ташкент", "Toshkent"), ("Самарканд", "Samarqand"), ("Бухара", "Buxoro"), ("Фергана", "Farg'ona"),
    ("Наманган", "Namangan"), ("Андижан", "Andijon"), ("Карши", "Qarshi"), ("Навои", "Navoiy"),
    ("Джизак", "Jizzax"), ("Термез", "Termiz"), ("Ургенч", "Urganch"), ("Нукус", "Nukus"),
    ("Гулистан", "Guliston"), ("Коканд", "Qo'qon"), ("Чирчик", "Chirchiq"),
]
REGION_TEMPLATES = [
    "site:instagram.com розыгрыш {ru}",
    "site:instagram.com konkurs {uz}",
    "site:instagram.com sovg'a {uz} yutib oling",
]
REGION_QUERIES_PER_RUN = 18


def build_queries() -> list[str]:
    region_q = [t.format(ru=ru, uz=uz) for ru, uz in REGIONS for t in REGION_TEMPLATES]
    random.shuffle(region_q)
    return BASE_QUERIES + region_q[:REGION_QUERIES_PER_RUN]


QUERIES = BASE_QUERIES  # совместимость со старым кодом

# "Texnomart (@texnomart.uz) • Instagram photos..." / "@texnomart.uz on Instagram: ..."
_HANDLE_RE = re.compile(r"@([A-Za-z0-9._]{2,30})")


# Только свежее: без фильтра поисковик отдаёт в основном посты прошлых лет (проверено: 0–2 свежих из 7,
# с фильтром «за месяц» — 7 из 7). Страницы 2–3 дают ещё по ~7 новых постов на запрос.
TIMELIMIT = "m"
PAGES = 3


_errors_logged: set[str] = set()


def _search(ddgs, query: str, backend: str, page: int, max_results: int, timelimit: str | None) -> list[dict]:
    """Один запрос с одной повторной попыткой при сетевой ошибке."""
    for attempt in range(2):
        try:
            kwargs = {"timelimit": timelimit} if timelimit else {}
            if page > 1:
                kwargs["page"] = page
            return ddgs.text(query, region="ru-ru", max_results=max_results, backend=backend, **kwargs) or []
        except Exception as e:  # rate limit / сетевые ошибки / нет результатов
            msg = str(e)
            tag = f"{backend}:{timelimit}:{msg[:40]}"
            if tag not in _errors_logged:  # причину каждой новой ошибки пишем в журнал один раз
                _errors_logged.add(tag)
                log.info("Поиск %s (фильтр %s, стр. %d): %s", backend, timelimit or "нет", page, msg[:150])
            if "No results" in msg or attempt:
                return []
            time.sleep(random.uniform(3, 6))
    return []


def collect(max_results_per_query: int = 10) -> list[RawPost]:
    posts: dict[str, RawPost] = {}
    try:
        ddgs = DDGS()
    except Exception as e:
        log.error("Поиск недоступен: %s", e)
        return []

    # (поисковик, фильтр по дате): сначала свежее за месяц, без фильтра — запасной вариант
    # (с некоторых серверов поисковик отвечает только на запросы без фильтра). Удачные варианты идут первыми.
    variants = [(b, tl) for tl in (TIMELIMIT, None) for b in BACKENDS]
    misses: dict[tuple[str, str | None], int] = {}
    for query in build_queries():
        results: list[dict] = []
        for variant in list(variants):
            backend, timelimit = variant
            page_results = _search(ddgs, query, backend, 1, max_results_per_query, timelimit)
            if not any(parse_post_url(r.get("href", "")) for r in page_results):
                misses[variant] = misses.get(variant, 0) + 1
                if misses[variant] >= 6 and len(variants) > 1:  # стабильно молчит — дальше не тратим на него время
                    variants.remove(variant)
                continue
            misses[variant] = 0
            results.extend(page_results)
            for page in range(2, PAGES + 1):
                time.sleep(random.uniform(1.5, 3))
                more = _search(ddgs, query, backend, page, max_results_per_query, timelimit)
                if not more:
                    break
                results.extend(more)
            variants.remove(variant)
            variants.insert(0, variant)
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

        loader, logged_in = get_loader()
    except Exception as e:
        log.warning("Обогащение пропущено: %s", e)
        return
    if not logged_in:
        # анонимно Instagram почти всегда отказывает — не тратим время, ИИ разберёт сниппет
        log.info("Обогащение пропущено: нет входа в Instagram")
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
