"""Осторожный сбор свежих постов по хэштегам (не более 10 постов за запуск)."""
from __future__ import annotations

import logging
import random
import time

import instaloader

from .base import RawPost
from .ig_session import get_loader

log = logging.getLogger("collectors.hashtag")

HASHTAGS = ["розыгрышташкент", "конкурсузбекистан", "giveawayuz"]
MAX_POSTS_PER_RUN = 10


def collect(max_posts: int = MAX_POSTS_PER_RUN) -> list[RawPost]:
    loader, logged_in = get_loader()
    if not logged_in:
        # Instagram отдаёт хэштеги только авторизованным пользователям
        log.info("Хэштеги: без логина Instagram недоступны, пропуск")
        return []

    posts: list[RawPost] = []
    per_tag = max(1, max_posts // len(HASHTAGS) + 1)

    for i, tag in enumerate(HASHTAGS):
        if len(posts) >= max_posts:
            break
        if i:
            time.sleep(random.uniform(15, 30))
        try:
            hashtag = instaloader.Hashtag.from_name(loader.context, tag)
            taken = 0
            for p in hashtag.get_posts_resumable():
                if len(posts) >= max_posts or taken >= per_tag:
                    break
                posts.append(
                    RawPost(
                        post_url=f"https://www.instagram.com/p/{p.shortcode}/",
                        text=p.caption or "",
                        source_type="hashtag",
                        account_name=p.owner_username,
                        image_url=p.url,
                    )
                )
                taken += 1
                time.sleep(random.uniform(2, 5))
            log.info("#%s — собрано %d постов", tag, taken)
        except instaloader.exceptions.TooManyRequestsException as e:
            log.error("Instagram ограничил запросы (429): %s — стоп", e)
            break
        except Exception as e:
            log.warning("#%s — ошибка: %s", tag, e)

    log.info("Хэштеги: всего %d постов", len(posts))
    return posts[:max_posts]
