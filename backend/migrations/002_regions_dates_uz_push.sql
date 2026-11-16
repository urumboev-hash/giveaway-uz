-- 002: области, даты начала/окончания, дата поста, узбекские тексты, подписки на уведомления
-- Выполнить в Supabase → SQL Editor.

alter table public.giveaways
    add column if not exists region        text not null default 'all',
    add column if not exists starts_at     timestamptz,
    add column if not exists ends_at       timestamptz,
    add column if not exists posted_at     timestamptz,
    add column if not exists title_uz      text,
    add column if not exists prize_uz      text,
    add column if not exists conditions_uz jsonb not null default '[]'::jsonb,
    add column if not exists notified      boolean not null default false;

alter table public.giveaways drop constraint if exists giveaways_region_check;
alter table public.giveaways add constraint giveaways_region_check check (region in (
    'all','tashkent','tashkent_obl','andijan','bukhara','jizzakh','kashkadarya','navoi',
    'namangan','samarkand','surkhandarya','syrdarya','fergana','khorezm','karakalpakstan'));

create index if not exists giveaways_active_ends_idx on public.giveaways (is_active, ends_at);

-- ---------- Подписки на push-уведомления ----------
create table if not exists public.push_subscriptions (
    endpoint   text primary key,
    p256dh     text not null,
    auth       text not null,
    regions    text[] not null default '{}',   -- пусто = все области
    lang       text not null default 'ru' check (lang in ('ru','uz')),
    created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant all on public.push_subscriptions to service_role;

-- Посетители подписываются/отписываются только через эти функции (читать чужие подписки нельзя)
create or replace function public.subscribe_push(p_endpoint text, p_p256dh text, p_auth text,
                                                 p_regions text[] default '{}', p_lang text default 'ru')
returns void language sql security definer set search_path = public as $$
    insert into push_subscriptions (endpoint, p256dh, auth, regions, lang)
    values (p_endpoint, p_p256dh, p_auth, coalesce(p_regions, '{}'), case when p_lang = 'uz' then 'uz' else 'ru' end)
    on conflict (endpoint) do update
        set p256dh = excluded.p256dh, auth = excluded.auth,
            regions = excluded.regions, lang = excluded.lang;
$$;

create or replace function public.unsubscribe_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
    delete from push_subscriptions where endpoint = p_endpoint;
$$;

revoke all on function public.subscribe_push(text, text, text, text[], text) from public;
revoke all on function public.unsubscribe_push(text) from public;
grant execute on function public.subscribe_push(text, text, text, text[], text) to anon, authenticated;
grant execute on function public.unsubscribe_push(text) to anon, authenticated;

-- Поля формы /submit тоже могут прийти с областью
notify pgrst, 'reload schema';
