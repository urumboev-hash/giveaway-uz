-- 003: статистика сайта (посещения, переходы к акциям, «Я участвую», «Поделиться», уведомления)
-- Выполнить в Supabase → SQL Editor. Читать статистику может только владелец — через get_stats(ключ).

create table if not exists public.site_events (
    id          bigserial primary key,
    created_at  timestamptz not null default now(),
    kind        text not null check (kind in ('visit','participate','join','share','notify')),
    visitor     text,
    lang        text,
    device      text,
    referrer    text,
    region      text,
    giveaway_id uuid
);
create index if not exists site_events_time_idx on public.site_events (created_at desc);
create index if not exists site_events_kind_idx on public.site_events (kind, created_at desc);
alter table public.site_events enable row level security;
revoke all on public.site_events from anon, authenticated;
grant all on public.site_events to service_role;

-- посетители только пишут события, прочитать их не могут
create or replace function public.log_event(p_kind text, p_visitor text default null, p_lang text default null,
                                            p_device text default null, p_referrer text default null,
                                            p_region text default null, p_giveaway uuid default null)
returns void language sql security definer set search_path = public as $$
    insert into site_events (kind, visitor, lang, device, referrer, region, giveaway_id)
    select p_kind, left(p_visitor, 40), left(p_lang, 4), left(p_device, 20), left(p_referrer, 80), left(p_region, 30), p_giveaway
    where p_kind in ('visit','participate','join','share','notify');
$$;

-- хэш ключа владельца (сам ключ хранится только у владельца)
create table if not exists public.stats_owner (key_hash text primary key);
alter table public.stats_owner enable row level security;
revoke all on public.stats_owner from anon, authenticated;
insert into public.stats_owner (key_hash)
values ('7051ac7d0bed7f306c42ed079b6f1d266ab8ea8a29592c2baa7dd06c412a37d8')
on conflict do nothing;

create or replace function public.get_stats(p_key text)
returns json language plpgsql security definer set search_path = public as $$
declare
    tz constant text := 'Asia/Tashkent';
    today date := (now() at time zone tz)::date;
    result json;
begin
    if not exists (select 1 from stats_owner where key_hash = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex')) then
        raise exception 'forbidden';
    end if;

    with ev as (
        select e.*, (e.created_at at time zone tz)::date as d from site_events e
    ),
    periods as (
        select p.name, p.since from (values ('today', today), ('week', today - 6), ('month', today - 29), ('all', date '2000-01-01')) p(name, since)
    ),
    totals as (
        select p.name,
               count(distinct ev.visitor) filter (where ev.kind = 'visit') as visitors,
               count(*) filter (where ev.kind = 'visit') as visits,
               count(*) filter (where ev.kind = 'participate') as participate,
               count(*) filter (where ev.kind = 'join') as joined,
               count(*) filter (where ev.kind = 'share') as shares,
               count(*) filter (where ev.kind = 'notify') as notify
        from periods p left join ev on ev.d >= p.since
        group by p.name
    ),
    days as (
        select g::date as d from generate_series(today - 29, today, interval '1 day') g
    ),
    daily as (
        select days.d,
               count(distinct ev.visitor) filter (where ev.kind = 'visit') as visitors,
               count(*) filter (where ev.kind = 'participate') as participate
        from days left join ev on ev.d = days.d
        group by days.d order by days.d
    ),
    top_g as (
        select g.title, g.account_name, g.post_url, count(*) as clicks
        from ev join giveaways g on g.id = ev.giveaway_id
        where ev.kind = 'participate' and ev.d >= today - 29
        group by g.id, g.title, g.account_name, g.post_url
        order by clicks desc limit 10
    ),
    split as (
        select 'lang' as dim, coalesce(lang, '?') as k, count(distinct visitor) as n from ev where kind = 'visit' and d >= today - 29 group by 2
        union all
        select 'device', coalesce(device, '?'), count(distinct visitor) from ev where kind = 'visit' and d >= today - 29 group by 2
        union all
        select 'referrer', coalesce(nullif(referrer, ''), 'direct'), count(distinct visitor) from ev where kind = 'visit' and d >= today - 29 group by 2
        union all
        select 'region', region, count(*) from ev where kind = 'participate' and d >= today - 29 and region is not null group by 2
    )
    select json_build_object(
        'totals', (select json_object_agg(name, json_build_object('visitors', visitors, 'visits', visits,
                    'participate', participate, 'joined', joined, 'shares', shares, 'notify', notify)) from totals),
        'daily', (select json_agg(json_build_object('d', d, 'visitors', visitors, 'participate', participate)) from daily),
        'top', (select coalesce(json_agg(top_g), '[]'::json) from top_g),
        'split', (select coalesce(json_agg(json_build_object('dim', dim, 'k', k, 'n', n) order by n desc), '[]'::json) from split),
        'subscribers', (select count(*) from push_subscriptions),
        'active_giveaways', (select count(*) from giveaways where is_active)
    ) into result;
    return result;
end;
$$;

revoke all on function public.log_event(text, text, text, text, text, text, uuid) from public;
revoke all on function public.get_stats(text) from public;
grant execute on function public.log_event(text, text, text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.get_stats(text) to anon, authenticated;

notify pgrst, 'reload schema';
