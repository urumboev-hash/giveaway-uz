"""Единый экземпляр Instaloader с аккуратным логином."""
from __future__ import annotations

import logging
import os
from pathlib import Path

import instaloader

log = logging.getLogger("collectors.ig")

_SESSION_DIR = Path(__file__).resolve().parent.parent / ".ig_session"
MAX_WAIT_SECONDS = 90


class _NoLongWaitRateController(instaloader.RateController):
    """Instaloader при лимите Instagram «засыпает» на 30+ минут — вместо этого бросаем 429,
    сборщики ловят его и переходят дальше, запуск не зависает."""

    def sleep(self, secs: float) -> None:
        if secs > MAX_WAIT_SECONDS:
            raise instaloader.exceptions.TooManyRequestsException(
                f"Instagram просит подождать {int(secs)} с — пропускаем"
            )
        super().sleep(secs)
_loader: instaloader.Instaloader | None = None
_logged_in = False


def get_loader() -> tuple[instaloader.Instaloader, bool]:
    """Возвращает (loader, logged_in). Никогда не бросает исключений из-за логина."""
    global _loader, _logged_in
    if _loader is not None:
        return _loader, _logged_in

    loader = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        quiet=True,
        max_connection_attempts=1,
        request_timeout=30,
        rate_controller=lambda ctx: _NoLongWaitRateController(ctx),
    )

    user = os.getenv("IG_USERNAME", "").strip()
    password = os.getenv("IG_PASSWORD", "").strip()
    if user and password:
        session_file = _SESSION_DIR / f"session-{user}"
        try:
            if session_file.exists():
                loader.load_session_from_file(user, str(session_file))
                _logged_in = True
                log.info("Instagram: сессия загружена из файла")
            else:
                loader.login(user, password)
                _SESSION_DIR.mkdir(exist_ok=True)
                loader.save_session_to_file(str(session_file))
                _logged_in = True
                log.info("Instagram: вход выполнен как %s", user)
        except Exception as e:  # checkpoint, 2FA, неверный пароль, блок IP...
            log.warning("Instagram: не удалось войти (%s). Работаем анонимно.", e)
            _logged_in = False
    else:
        log.info("Instagram: IG_USERNAME/IG_PASSWORD не заданы — анонимный режим")

    _loader = loader
    return loader, _logged_in
