-- =============================================================
-- Агрегатор розыгрышей Instagram (Узбекистан) — схема Supabase
-- Выполнить целиком в Supabase → SQL Editor → New query → Run
-- =============================================================

create extension if not exists pgcrypto;

-- ---------- Основная таблица ----------
create table if not exists public.giveaways (
    id           uuid primary key default gen_random_uuid(),
    post_url     text unique not null,
    account_name text,
    image_url    text,
    title        text,
    prize        text,
    conditions   jsonb not null default '[]'::jsonb,
    end_date     text,
    category     text not null default 'Другое'
                 check (category in ('Техника','Деньги','Авто','Еда и кафе','Красота и одежда','Другое')),
    source_type  text not null default 'user_submit'
                 check (source_type in ('google','account','hashtag','user_submit')),
    is_active    boolean not null default true,
    created_at   timestamptz not null default now()
);

create index if not exists giveaways_active_created_idx
    on public.giveaways (is_active, created_at desc);

-- ---------- Row Level Security ----------
alter table public.giveaways enable row level security;

-- Публичное чтение: сайт показывает только одобренные (активные) розыгрыши.
-- Заявки на модерации (is_active = false) посторонним не видны.
drop policy if exists "Public read active giveaways" on public.giveaways;
create policy "Public read active giveaways"
    on public.giveaways
    for select
    to anon, authenticated
    using (is_active = true);

-- Публичная вставка (форма /submit): только неактивные записи от пользователей.
drop policy if exists "Public insert pending submissions" on public.giveaways;
create policy "Public insert pending submissions"
    on public.giveaways
    for insert
    to anon, authenticated
    with check (is_active = false and source_type = 'user_submit');

-- UPDATE / DELETE политик нет: это делает только бэкенд (service_role обходит RLS)
-- или модератор в Supabase Table Editor.

-- ---------- Служебная таблица отклонённых постов ----------
-- Чтобы не тратить токены Gemini повторно на посты, которые ИИ уже признал
-- спамом/рекламой/завершёнными. Публичного доступа нет (только service_role).
create table if not exists public.rejected_posts (
    post_url   text primary key,
    reason     text,
    created_at timestamptz not null default now()
);
alter table public.rejected_posts enable row level security;

-- ---------- Права доступа Data API ----------
grant select, insert on public.giveaways to anon, authenticated;
grant all on public.giveaways, public.rejected_posts to service_role;
revoke all on public.rejected_posts from anon, authenticated;
