"""Общие типы и утилиты для сборщиков."""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone

log = logging.getLogger("collectors")

# instagram.com/p/<code>, /reel/<code>, /tv/<code>, а также /<username>/p/<code>
_POST_RE = re.compile(
    r"https?://(?:www\.|m\.)?instagram\.com/(?:(?P<user>[A-Za-z0-9._]+)/)?"
    r"(?P<kind>p|reel|reels|tv)/(?P<code>[A-Za-z0-9_-]{5,})",
    re.IGNORECASE,
)


@dataclass
class RawPost:
    post_url: str
    text: str
    source_type: str  # google | account | hashtag
    account_name: str | None = None
    image_url: str | None = None
    posted_at: datetime | None = None


def parse_post_url(url: str) -> tuple[str, str | None] | None:
    """Возвращает (канонический URL, username или None) либо None, если это не пост."""
    m = _POST_RE.search(url or "")
    if not m:
        return None
    code = m.group("code")
    user = m.group("user")
    if user and user.lower() in {"p", "reel", "reels", "tv", "explore", "stories"}:
        user = None
    return f"https://www.instagram.com/p/{code}/", user


def shortcode_from_url(url: str) -> str | None:
    m = _POST_RE.search(url or "")
    return m.group("code") if m else None


_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
_IG_EPOCH_MS = 1314220021721  # «нулевой» момент в ID медиа Instagram


def posted_at_from_url(url: str) -> datetime | None:
    """Дата публикации поста прямо из короткого кода ссылки (ID медиа содержит время создания).

    Работает без входа в Instagram. Для обычных постов код 11 символов; у длинных берём первые 11.
    """
    code = shortcode_from_url(url)
    if not code or len(code) < 10:
        return None
    try:
        n = 0
        for ch in code[:11]:
            n = n * 64 + _B64.index(ch)
        dt = datetime.fromtimestamp(((n >> 23) + _IG_EPOCH_MS) / 1000, tz=timezone.utc)
    except (ValueError, OverflowError, OSError):
        return None
    # защита от мусора: Instagram с 2010 года, и не из будущего
    if dt.year < 2010 or dt > datetime.now(timezone.utc):
        return None
    return dt
