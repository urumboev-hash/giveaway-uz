"""Общие типы и утилиты для сборщиков."""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass

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
