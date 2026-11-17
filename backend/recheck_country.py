"""Повторная проверка страны у уже опубликованных акций: всё, что не Узбекистан, скрываем с сайта.

python recheck_country.py            — проверить и скрыть
python recheck_country.py --dry-run  — только показать
"""
import argparse
import logging

from ai_parser import AIParser
from main import FOREIGN_RE, get_supabase, has_uz_sign

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("recheck")
BATCH = 10


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    sb = get_supabase()
    rows = (sb.table("giveaways").select("id,account_name,title,prize,conditions,title_uz,post_url")
            .eq("is_active", True).limit(2000).execute().data or [])
    log.info("Активных акций: %d", len(rows))
    parser = AIParser()
    hide: list[tuple[dict, str]] = []
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        verdicts = parser.check_country_many(chunk)
        for r, v in zip(chunk, verdicts):
            text = " ".join([r.get("account_name") or "", r.get("title") or "", r.get("prize") or "",
                             *(r.get("conditions") or [])])
            if FOREIGN_RE.search(text.lower()) and not has_uz_sign(text):
                v = "other"
            if v in ("other", "unknown"):
                hide.append((r, v))
    log.info("\nСкрыть: %d из %d", len(hide), len(rows))
    for r, v in hide:
        log.info("  [%s] @%s — %s", v, r.get("account_name") or "?", r.get("title"))
    if args.dry_run or not hide:
        return
    for r, v in hide:
        sb.table("giveaways").update({"is_active": False}).eq("id", r["id"]).execute()
    log.info("Готово: скрыто %d", len(hide))


if __name__ == "__main__":
    main()
