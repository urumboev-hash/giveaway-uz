# GiveUz — агрегатор розыгрышей Instagram (Узбекистан)

- `backend/` — Python-сборщик (DuckDuckGo + Instaloader + Gemini), запускается в GitHub Actions каждые 3 часа.
- `frontend/` — сайт на Next.js 15 + Tailwind 4, хостинг на Vercel (бесплатно).
- База — Supabase (бесплатный тариф).

## 1. Supabase
1. Создайте проект на supabase.com.
2. SQL Editor → вставьте `backend/schema.sql` → Run.
3. Project Settings → API: скопируйте `Project URL`, `anon public` key и `service_role` key.

## 2. Ключи
- `backend/.env` (копия `backend/.env.example`): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service_role), `GEMINI_API_KEY` (aistudio.google.com), `IG_USERNAME`/`IG_PASSWORD` (отдельный аккаунт, не личный).
- `frontend/.env.local` (копия `frontend/.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon!), `NEXT_PUBLIC_SITE_URL`.

## 3. Локальный запуск
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py --only google --dry-run   # проверка без записи в БД
python main.py                           # полный запуск
```
```
cd frontend
npm install
npm run dev        # http://localhost:3000
```

## 4. Автозапуск и деплой
- GitHub: залейте репозиторий → Settings → Secrets and variables → Actions → добавьте 5 секретов как в `backend/.env`. Вкладка Actions → «Giveaway scraper» → Run workflow для проверки.
- Vercel: Import repo → Root Directory = `frontend` → добавьте 3 переменные `NEXT_PUBLIC_*` → Deploy.

## Модерация
Заявки из `/submit` попадают в таблицу `giveaways` с `is_active = false`. Одобрить: Supabase → Table Editor → поставить `is_active = true` (по желанию дописать `conditions`/`end_date`).
