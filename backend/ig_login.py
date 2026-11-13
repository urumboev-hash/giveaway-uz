"""Одноразовый вход в Instagram на этом компьютере → файл сессии для сборщика.

Запуск: .\\ig_login.ps1 ИМЯ   (пароль спросит PowerShell и передаст через переменную окружения)
"""
import base64
import os
import sys
from pathlib import Path

import instaloader

user = sys.argv[1] if len(sys.argv) > 1 else input("Логин Instagram: ").strip()
password = os.environ.pop("IG_LOGIN_PASSWORD", "")
session_dir = Path(__file__).resolve().parent / ".ig_session"
session_dir.mkdir(exist_ok=True)
session_file = session_dir / f"session-{user}"

L = instaloader.Instaloader(quiet=True)
try:
    L.login(user, password)
except instaloader.exceptions.TwoFactorAuthRequiredException:
    code = input("Instagram прислал код подтверждения (SMS/приложение). Введите код: ").strip()
    L.two_factor_login(code)
except instaloader.exceptions.BadCredentialsException:
    sys.exit("Неверный пароль. Запустите ещё раз.")
except instaloader.exceptions.ConnectionException as e:
    msg = str(e)
    if "Checkpoint" in msg or "checkpoint" in msg:
        url = msg.split("Point your browser to ", 1)[-1].split(" - follow", 1)[0]
        print("\nInstagram просит подтвердить вход. Откройте ссылку и подтвердите, потом запустите ещё раз:")
        print("https://www.instagram.com" + url if url.startswith("/") else url)
        sys.exit(2)
    sys.exit(f"Ошибка входа: {msg}")

L.save_session_to_file(str(session_file))
print(f"\nГОТОВО: вход выполнен как {L.test_login()}, сессия сохранена в {session_file}")
(session_dir / "session.b64").write_text(base64.b64encode(session_file.read_bytes()).decode(), encoding="ascii")
