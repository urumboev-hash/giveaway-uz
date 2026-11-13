"""Сбор последних постов целевых аккаунтов (backend/targets.json) через Instaloader."""
from __future__ import annotations

import json
import logging
import random
import time
from itertools import islice
from pathlib import Path

import instaloader

from .base import RawPost
from .ig_session import get_loader

log = logging.getLogger("collectors.accounts")

TARGETS_FILE = Path(__file__).resolve().parent.parent / "targets.json"


def _load_targets() -> tuple[list[str], int]:
    try:
        data = json.loads(TARGETS_FILE.read_text(encoding="utf-8"))
        accounts = [a.strip().lstrip("@") for a in data.get("accounts", []) if a.strip()]
        return accounts, int(data.get("posts_per_account", 3))
    except Exception as e:
        log.error("Не удалось прочитать %s: %s", TARGETS_FILE, e)
        return [], 3


def collect(min_pause: float = 15, max_pause: float = 30) -> list[RawPost]:
    accounts, per_account = _load_targets()
    if not accounts:
        return []

    loader, _ = get_loader()
    posts: list[RawPost] = []
    random.shuffle(accounts)  # каждый запуск — разный порядок, меньше шаблонности

    for i, username in enumerate(accounts):
        if i:
            time.sleep(random.uniform(min_pause, max_pause))
        try:
            profile = instaloader.Profile.from_username(loader.context, username)
            if profile.is_private:
                log.info("@%s — закрытый профиль, пропуск", username)
                continue
            count = 0
            for p in islice(profile.get_posts(), per_account):
                posts.append(
                    RawPost(
                        post_url=f"https://www.instagram.com/p/{p.shortcode}/",
                        text=p.caption or "",
                        source_type="account",
                        account_name=profile.username,
                        image_url=p.url,
                    )
                )
                count += 1
            log.info("@%s — собрано %d постов", username, count)
        except instaloader.exceptions.ProfileNotExistsException:
            log.warning("@%s — профиль не найден, пропуск", username)
        except (
            instaloader.exceptions.LoginRequiredException,
            instaloader.exceptions.PrivateProfileNotFollowedException,
        ) as e:
            log.warning("@%s — нужен логин/доступ: %s", username, e)
        except instaloader.exceptions.TooManyRequestsException as e:
            log.error("Instagram ограничил запросы (429): %s — останавливаю сбор аккаунтов", e)
            break
        except Exception as e:  # блокировка, сеть, изменения API — просто идём дальше
            log.warning("@%s — ошибка: %s", username, e)

    log.info("Аккаунты: всего %d постов", len(posts))
    return posts
