"""Разбор текста поста через Gemini (официальный SDK google-genai)."""
from __future__ import annotations

import json
import logging
import os
import time
from datetime import date

from google import genai
from google.genai import types

log = logging.getLogger("ai_parser")

# gemini-2.5-flash больше не выдаётся новым ключам — Google рекомендует gemini-3.8-flash.
# Можно переопределить переменной окружения GEMINI_MODEL.
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
CATEGORIES = ["Техника", "Деньги", "Авто", "Еда и кафе", "Красота и одежда", "Другое"]

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "is_valid": {"type": "BOOLEAN"},
        "title": {"type": "STRING"},
        "prize": {"type": "STRING"},
        "conditions": {"type": "ARRAY", "items": {"type": "STRING"}},
        "end_date": {"type": "STRING"},
        "category": {"type": "STRING", "enum": CATEGORIES},
    },
    "required": ["is_valid", "title", "prize", "conditions", "end_date", "category"],
}

SYSTEM_PROMPT = """Ты — модератор агрегатора розыгрышей в Instagram для Узбекистана.
Тебе дают сырой текст поста (на русском, узбекском или английском; может быть только короткий сниппет из поиска).

Сегодня: {today}.

Реши, является ли пост АКТУАЛЬНЫМ розыгрышем/гивом/конкурсом с призом:
- is_valid = false, если это спам, обычная реклама или скидка без розыгрыша приза,
  продажа, объявление об итогах/победителях, или розыгрыш уже завершён (дата итогов в прошлом).
- is_valid = false, если розыгрыш явно не для Узбекистана.
- Если дата не указана, но это явно объявление о розыгрыше — считай его актуальным.

Если is_valid = true, заполни на РУССКОМ языке:
- title: короткий заголовок приза, до 60 символов (например «iPhone 16 Pro» или «1 000 000 сум»).
- prize: подробное описание приза(ов), 1–3 предложения.
- conditions: 2–6 коротких шагов для участия в повелительном наклонении
  (например «Подписаться на @brand», «Лайкнуть пост», «Отметить 2 друзей»).
- end_date: дата итогов как в посте, приведённая к виду «25 ноября 2026» или «25 ноября»; если нет — «Не указана».
- category: одна из {categories}.

Если is_valid = false — остальные поля заполни пустыми строками/пустым списком, category = «Другое».
Отвечай только JSON."""


class AIParser:
    def __init__(self, api_key: str | None = None, min_interval: float = 6.5):
        key = api_key or os.getenv("GEMINI_API_KEY")
        if not key:
            raise RuntimeError("GEMINI_API_KEY не задан")
        self.client = genai.Client(api_key=key)
        self.min_interval = min_interval  # бесплатный тариф ~10 запросов/мин
        self._last_call = 0.0

    def _throttle(self) -> None:
        wait = self.min_interval - (time.monotonic() - self._last_call)
        if wait > 0:
            time.sleep(wait)
        self._last_call = time.monotonic()

    def parse(self, text: str, account_name: str | None = None) -> dict | None:
        """Возвращает словарь по схеме или None при ошибке API."""
        if not text or len(text.strip()) < 15:
            return {"is_valid": False, "title": "", "prize": "", "conditions": [], "end_date": "", "category": "Другое"}

        prompt = f"Аккаунт: @{account_name or 'неизвестно'}\n\nТекст поста:\n{text[:4000]}"
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT.format(today=date.today().isoformat(), categories=", ".join(CATEGORIES)),
            response_mime_type="application/json",
            response_schema=RESPONSE_SCHEMA,
            temperature=0.1,
        )

        for attempt in range(3):
            self._throttle()
            try:
                resp = self.client.models.generate_content(model=MODEL, contents=prompt, config=config)
                return self._normalize(json.loads(resp.text or "{}"))
            except json.JSONDecodeError as e:
                log.warning("Gemini вернул не-JSON: %s", e)
                return None
            except Exception as e:
                msg = str(e)
                if "429" in msg or "RESOURCE_EXHAUSTED" in msg or "503" in msg:
                    delay = 20 * (attempt + 1)
                    log.warning("Gemini перегружен/лимит, жду %d с (%s)", delay, msg[:120])
                    time.sleep(delay)
                    continue
                log.error("Ошибка Gemini: %s", msg[:300])
                if "NOT_FOUND" in msg or "API_KEY_INVALID" in msg or "PERMISSION_DENIED" in msg:
                    raise RuntimeError(f"Gemini недоступен (модель {MODEL} или ключ): {msg[:200]}") from e
                return None
        return None

    @staticmethod
    def _normalize(data: dict) -> dict:
        conditions = data.get("conditions") or []
        if not isinstance(conditions, list):
            conditions = [str(conditions)]
        category = data.get("category") or "Другое"
        if category not in CATEGORIES:
            category = "Другое"
        return {
            "is_valid": bool(data.get("is_valid")),
            "title": str(data.get("title") or "").strip()[:120],
            "prize": str(data.get("prize") or "").strip()[:1000],
            "conditions": [str(c).strip() for c in conditions if str(c).strip()][:8],
            "end_date": str(data.get("end_date") or "Не указана").strip()[:60],
            "category": category,
        }
