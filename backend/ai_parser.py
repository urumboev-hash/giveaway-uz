"""Разбор текста поста через ИИ.

Основной — Gemini (google-genai). Запасной — Groq (бесплатный, OpenAI-совместимый API).
Если у Gemini кончился лимит или он перегружен, пост автоматически уходит в Groq.
Работает и с одним из ключей: GEMINI_API_KEY и/или GROQ_API_KEY.
"""
from __future__ import annotations

import json
import logging
import os
import time
from datetime import date

import requests

log = logging.getLogger("ai_parser")

# У каждой модели Gemini свой дневной лимит — идём по цепочке: кончился лимит у одной, берём следующую.
# gemini-2.5-* новым ключам недоступны. Свой список — через GEMINI_MODELS="a,b,c".
DEFAULT_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
]
MODELS = [m.strip() for m in os.getenv("GEMINI_MODELS", "").split(",") if m.strip()] or (
    [os.getenv("GEMINI_MODEL")] if os.getenv("GEMINI_MODEL") else DEFAULT_MODELS
)
MODEL = MODELS[0]
GROQ_URL = "https://api.groq.com/openai/v1"
# первая доступная из списка (можно задать свою через GROQ_MODEL)
GROQ_PREFERRED = ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "openai/gpt-oss-20b", "llama-3.1-8b-instant"]

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

# для Groq схему описываем словами — он возвращает json_object без строгой схемы
JSON_SHAPE = (
    '\n\nФормат ответа — ровно один JSON-объект с ключами: '
    '"is_valid" (true/false), "title" (строка), "prize" (строка), '
    '"conditions" (массив строк), "end_date" (строка), "category" (строка из списка выше).'
)

EMPTY = {"is_valid": False, "title": "", "prize": "", "conditions": [], "end_date": "", "category": "Другое"}


def _clean(v: str | None) -> str:
    return (v or "").lstrip("﻿").strip()


class AIParser:
    def __init__(self, api_key: str | None = None, min_interval: float = 6.5):
        gemini_key = _clean(api_key or os.getenv("GEMINI_API_KEY"))
        groq_key = _clean(os.getenv("GROQ_API_KEY"))
        if not gemini_key and not groq_key:
            raise RuntimeError("Не задан ни GEMINI_API_KEY, ни GROQ_API_KEY")

        self.gemini = None
        if gemini_key:
            from google import genai  # импорт здесь — без ключа Gemini пакет не нужен

            self.gemini = genai.Client(api_key=gemini_key)
        # модели Gemini, у которых ещё есть лимит в этом запуске
        self.gemini_models = list(MODELS) if self.gemini else []
        self.min_interval = min_interval  # бесплатный Gemini ~10 запросов/мин на модель
        self._last_gemini = 0.0

        self.groq_key = groq_key
        self.groq_model = self._pick_groq_model() if groq_key else None
        self._last_groq = 0.0
        self.stats = {"gemini": 0, "groq": 0}

        log.info(
            "ИИ: Gemini %s, Groq %s",
            " → ".join(self.gemini_models) or "выкл",
            self.groq_model or "выкл",
        )

    @property
    def gemini_off(self) -> bool:
        return not self.gemini_models

    # ---------- общий вход ----------
    def parse(self, text: str, account_name: str | None = None) -> dict | None:
        """Возвращает словарь по схеме или None при ошибке API."""
        if not text or len(text.strip()) < 15:
            return dict(EMPTY)

        prompt = f"Аккаунт: @{account_name or 'неизвестно'}\n\nТекст поста:\n{text[:4000]}"
        system = SYSTEM_PROMPT.format(today=date.today().isoformat(), categories=", ".join(CATEGORIES))

        if not self.gemini_off:
            result = self._gemini(system, prompt)
            if result is not None:
                self.stats["gemini"] += 1
                return result
        if self.groq_model:
            result = self._groq(system, prompt)
            if result is not None:
                self.stats["groq"] += 1
            return result
        return None

    # ---------- Gemini ----------
    def _gemini(self, system: str, prompt: str) -> dict | None:
        from google.genai import types

        config = types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
            response_schema=RESPONSE_SCHEMA,
            temperature=0.1,
        )
        # 2 круга по цепочке моделей; перегруженную (503) модель пропускаем только для этого поста,
        # а модель с исчерпанным лимитом (429) или недоступную (404) убираем до конца запуска.
        for round_ in range(2):
            for model in list(self.gemini_models):
                self._wait("_last_gemini", self.min_interval)
                try:
                    resp = self.gemini.models.generate_content(model=model, contents=prompt, config=config)
                    return self._normalize(json.loads(resp.text or "{}"))
                except json.JSONDecodeError as e:
                    log.warning("Gemini %s вернул не-JSON: %s", model, e)
                    return None
                except Exception as e:
                    msg = str(e)
                    if "API_KEY_INVALID" in msg or "PERMISSION_DENIED" in msg:
                        self.gemini_models.clear()
                        if self.groq_model:
                            log.error("Ключ Gemini не работает — дальше только Groq")
                            return None
                        raise RuntimeError(f"Ключ Gemini не работает: {msg[:200]}") from e
                    if "429" in msg or "RESOURCE_EXHAUSTED" in msg or "NOT_FOUND" in msg or "404" in msg:
                        why = "лимит исчерпан" if ("429" in msg or "RESOURCE" in msg) else "модель недоступна"
                        self.gemini_models.remove(model)
                        nxt = self.gemini_models[0] if self.gemini_models else (self.groq_model and "Groq") or "нет"
                        log.warning("Gemini %s: %s — переключаюсь на %s", model, why, nxt)
                        continue
                    if "503" in msg or "UNAVAILABLE" in msg or "500" in msg or "INTERNAL" in msg:
                        log.info("Gemini %s перегружен — пробую следующую модель", model)
                        continue
                    log.error("Ошибка Gemini %s: %s", model, msg[:300])
                    return None
            if not self.gemini_models or self.groq_model:
                return None
            log.warning("Все модели Gemini перегружены, жду 30 с")
            time.sleep(30)
        return None

    # ---------- Groq ----------
    def _groq_headers(self) -> dict:
        return {"Authorization": f"Bearer {self.groq_key}", "Content-Type": "application/json"}

    def _pick_groq_model(self) -> str | None:
        wanted = _clean(os.getenv("GROQ_MODEL"))
        try:
            r = requests.get(f"{GROQ_URL}/models", headers=self._groq_headers(), timeout=20)
            r.raise_for_status()
            available = {m["id"] for m in r.json().get("data", [])}
        except Exception as e:
            log.error("Groq: не удалось получить список моделей (%s) — проверьте GROQ_API_KEY", str(e)[:200])
            return None
        for m in ([wanted] if wanted else []) + GROQ_PREFERRED:
            if m in available:
                return m
        # ни одна из любимых не найдена — берём любую llama/gpt-oss
        for m in sorted(available):
            if ("llama" in m or "gpt-oss" in m) and "guard" not in m:
                return m
        log.error("Groq: подходящая модель не найдена (%s)", ", ".join(sorted(available))[:300])
        return None

    def _groq(self, system: str, prompt: str) -> dict | None:
        body = {
            "model": self.groq_model,
            "messages": [
                {"role": "system", "content": system + JSON_SHAPE},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }
        for attempt in range(3):
            self._wait("_last_groq", 2.5)  # бесплатный Groq ~30 запросов/мин
            try:
                r = requests.post(f"{GROQ_URL}/chat/completions", headers=self._groq_headers(), json=body, timeout=60)
            except requests.RequestException as e:
                log.warning("Groq: сеть (%s)", str(e)[:120])
                time.sleep(5)
                continue
            if r.status_code in (429, 500, 502, 503):
                delay = float(r.headers.get("retry-after") or 15 * (attempt + 1))
                delay = min(delay, 90)
                log.warning("Groq %d, жду %d с", r.status_code, delay)
                time.sleep(delay)
                continue
            if r.status_code != 200:
                log.error("Ошибка Groq %d: %s", r.status_code, r.text[:300])
                return None
            try:
                content = r.json()["choices"][0]["message"]["content"]
                return self._normalize(json.loads(content or "{}"))
            except (KeyError, IndexError, json.JSONDecodeError) as e:
                log.warning("Groq вернул не-JSON: %s", e)
                return None
        return None

    # ---------- утилиты ----------
    def _wait(self, attr: str, interval: float) -> None:
        wait = interval - (time.monotonic() - getattr(self, attr))
        if wait > 0:
            time.sleep(wait)
        setattr(self, attr, time.monotonic())

    @staticmethod
    def _normalize(data: dict) -> dict:
        conditions = data.get("conditions") or []
        if not isinstance(conditions, list):
            conditions = [str(conditions)]
        category = data.get("category") or "Другое"
        if category not in CATEGORIES:
            category = "Другое"
        is_valid = data.get("is_valid")
        if isinstance(is_valid, str):
            is_valid = is_valid.strip().lower() in ("true", "1", "yes", "да")
        return {
            "is_valid": bool(is_valid),
            "title": str(data.get("title") or "").strip()[:120],
            "prize": str(data.get("prize") or "").strip()[:1000],
            "conditions": [str(c).strip() for c in conditions if str(c).strip()][:8],
            "end_date": str(data.get("end_date") or "Не указана").strip()[:60],
            "category": category,
        }
