"""Единый экземпляр Instaloader с аккуратным логином."""
from __future__ import annotations

import base64
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
    session_file = _SESSION_DIR / f"session-{user}" if user else None

    # На GitHub сессию передаём секретом IG_SESSION_B64 (файл сессии в base64) —
    # вход один раз делается на ноутбуке командой: instaloader --login ИМЯ
    b64 = os.getenv("IG_SESSION_B64", "").strip()
    if user and b64 and session_file is not None:
        try:
            _SESSION_DIR.mkdir(exist_ok=True)
            session_file.write_bytes(base64.b64decode(b64))
        except Exception as e:
            log.warning("Instagram: IG_SESSION_B64 не читается (%s)", e)

    if user and (password or (session_file and session_file.exists())):
        try:
            if session_file.exists():
                # test_login() ходит в старый graphql и часто получает «подождите» даже с живой сессией,
                # поэтому не проверяем: если сессия устарела, сборщики сами получат отказ и пропустят
                loader.load_session_from_file(user, str(session_file))
                _logged_in = True
                log.info("Instagram: сессия %s загружена", user)
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
        log.info("Instagram: нет IG_USERNAME и сессии/пароля — анонимный режим")

    _loader = loader
    return loader, _logged_in
