-- MVP schema: one-call registration, age band for the youth figures, a business role for taverns and
-- bottle stores, marketplace posts with a public map function, operator code lookup and PRO totals.
-- Run once, after 0004_record_sale.sql.

-- 1. Age band (for the youth share) and a business role.
alter table reclaimers add column if not exists age_band text check (age_band in ('18-24', '25-34', '35+'));
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('reclaimer', 'operator', 'pro', 'business'));

-- Operators and PRO analysts are assigned by an administrator in the dashboard. Nobody can register as
-- one through the API. Reclaimers and businesses register through the functions below.
drop policy if exists profiles_insert_own on profiles;
create policy profiles_insert_own on profiles for insert to authenticated
  with check (id = auth.uid() and role in ('reclaimer', 'business'));

-- 2. Registration. Both functions are idempotent: calling again updates the name and area.
create or replace function public.register_reclaimer(p_name text, p_area text, p_age_band text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  token text;
  area text;
begin
  if uid is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_name is null or length(trim(p_name)) < 1 or length(p_name) > 60 then raise exception 'BAD_NAME'; end if;
  if p_area is null or length(trim(p_area)) < 2 or length(p_area) > 60 then raise exception 'BAD_AREA'; end if;
  if p_age_band is not null and p_age_band not in ('18-24', '25-34', '35+') then raise exception 'BAD_AGE_BAND'; end if;
  if exists (select 1 from profiles where id = uid and role <> 'reclaimer') then raise exception 'ROLE_LOCKED'; end if;

  area := trim(both '-' from lower(regexp_replace(trim(p_area), '[^a-zA-Z0-9]+', '-', 'g')));
  insert into profiles (id, role, display_name) values (uid, 'reclaimer', trim(p_name))
    on conflict (id) do update set display_name = excluded.display_name;

  select qr_token into token from reclaimers where profile_id = uid;
  if token is null then
    loop
      token := 'ccza_r_' || upper(substr(md5(random()::text || clock_timestamp()::text || uid::text), 1, 8));
      begin
        insert into reclaimers (profile_id, area_id, qr_token, age_band, consent_at)
          values (uid, area, token, p_age_band, now());
        exit;
      exception when unique_violation then
        -- Another reclaimer drew the same code. Draw again.
        null;
      end;
    end loop;
  else
    update reclaimers set area_id = area, age_band = coalesce(p_age_band, age_band) where profile_id = uid;
  end if;

  insert into audit_log (actor, action, target) values (uid, 'register_reclaimer', token);
  return token;
end $$;

create or replace function public.register_business(p_name text, p_area text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_name is null or length(trim(p_name)) < 1 or length(p_name) > 80 then raise exception 'BAD_NAME'; end if;
  if exists (select 1 from profiles where id = uid and role <> 'business') then raise exception 'ROLE_LOCKED'; end if;
  insert into profiles (id, role, display_name) values (uid, 'business', trim(p_name))
    on conflict (id) do update set display_name = excluded.display_name;
  insert into audit_log (actor, action, target) values (uid, 'register_business', trim(coalesce(p_area, '')));
end $$;

-- 3. Operators resolve a scanned code to a name. Anyone else gets no rows.
create or replace function public.lookup_reclaimer(p_qr text)
returns table (display_name text, area_id text)
language sql stable security definer set search_path = public as $$
  select p.display_name, r.area_id
  from reclaimers r
  join profiles p on p.id = r.profile_id
  where r.qr_token = p_qr and private.current_app_role() = 'operator'
$$;

-- 4. Marketplace posts. 'sell' is material for sale (a tavern's cans, a reclaimer's sorted load).
-- 'buy' is a wanted price per kg from a buyer. People see their own rows directly. Everyone else sees
-- open posts only through market_points(), which snaps the location to a grid of about 250 m.
create table if not exists market_posts (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references profiles(id) on delete cascade,
  kind          text not null check (kind in ('sell', 'buy')),
  org_name      text not null check (length(org_name) between 1 and 80),
  material      text not null references materials(code),
  kg            integer check (kg between 1 and 500000),
  cents_per_kg  integer check (cents_per_kg is null or cents_per_kg between 1 and 100000),
  area_label    text not null check (length(area_label) between 2 and 60),
  location      extensions.geography(point, 4326) not null,
  note          text check (note is null or length(note) <= 200),
  status        text not null default 'open' check (status in ('open', 'closed')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '14 days'
);
create index if not exists market_posts_open_idx on market_posts (status, expires_at);
alter table market_posts enable row level security;

create policy market_posts_read_own on market_posts for select to authenticated
  using (owner_id = auth.uid());
create policy market_posts_insert_own on market_posts for insert to authenticated
  with check (owner_id = auth.uid() and private.current_app_role() in ('reclaimer', 'operator', 'business'));
create policy market_posts_update_own on market_posts for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy market_posts_delete_own on market_posts for delete to authenticated
  using (owner_id = auth.uid());

-- At most 20 open posts per person.
create or replace function private.limit_open_posts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'open' and (select count(*) from market_posts where owner_id = new.owner_id and status = 'open' and id <> new.id) >= 20 then
    raise exception 'TOO_MANY_POSTS';
  end if;
  return new;
end $$;
drop trigger if exists market_posts_limit on market_posts;
create trigger market_posts_limit before insert or update on market_posts
  for each row execute function private.limit_open_posts();

create or replace function public.create_market_post(
  p_kind text, p_org text, p_material text, p_kg integer, p_cents_per_kg integer,
  p_area_label text, p_lat double precision, p_lng double precision, p_note text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then raise exception 'NOT_SIGNED_IN'; end if;
  if private.current_app_role() is null or private.current_app_role() not in ('reclaimer', 'operator', 'business') then
    raise exception 'ROLE_NOT_ALLOWED';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -35 and -22 or p_lng not between 16 and 33 then
    raise exception 'BAD_LOCATION';
  end if;
  insert into market_posts (owner_id, kind, org_name, material, kg, cents_per_kg, area_label, location, note)
  values (uid, p_kind, trim(p_org), p_material, p_kg, p_cents_per_kg, trim(p_area_label),
          extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography, nullif(trim(coalesce(p_note, '')), ''))
  returning id into new_id;
  return new_id;
end $$;

-- 5. The map: buy-back centres (public places, with their board price) plus open posts (snapped).
create or replace function public.market_points()
returns table (
  id text, kind text, source text, name text, material text,
  cents_per_kg integer, kg integer, area_label text, lat double precision, lng double precision, created_at timestamptz
)
language sql stable security definer set search_path = public, extensions as $$
  select 'c:' || c.id::text || ':' || b.material, 'buy'::text, 'centre'::text, c.name, b.material, b.cents_per_kg, null::integer,
         c.area_id, extensions.st_y(c.location::extensions.geometry), extensions.st_x(c.location::extensions.geometry), b.effective_at
  from public.board_prices() b
  join centres c on c.id = b.centre_id
  union all
  select 'p:' || m.id::text, m.kind, 'post'::text, m.org_name, m.material, m.cents_per_kg, m.kg, m.area_label,
         extensions.st_y(extensions.st_snaptogrid(m.location::extensions.geometry, 0.0025)),
         extensions.st_x(extensions.st_snaptogrid(m.location::extensions.geometry, 0.0025)),
         m.created_at
  from market_posts m
  where m.status = 'open' and m.expires_at > now()
$$;

-- 6. PRO totals for the dashboard. Returns no rows to anyone who is not a PRO analyst.
create or replace function public.pro_overview()
returns table (
  registered bigint, active_reclaimers bigint, youth_reclaimers bigint,
  tonnes_30d numeric, fees_owed_cents bigint, fees_paid_cents bigint
)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from reclaimers),
    (select count(distinct t.reclaimer_id) from transactions t where t.created_at > now() - interval '30 days'),
    (select count(distinct t.reclaimer_id) from transactions t join reclaimers r on r.profile_id = t.reclaimer_id
       where t.created_at > now() - interval '30 days' and r.age_band in ('18-24', '25-34')),
    coalesce((select sum(weight_g) / 1000000.0 from transactions where created_at > now() - interval '30 days'), 0),
    coalesce((select sum(cents) from service_fees where status in ('owed', 'missing')), 0)::bigint,
    coalesce((select sum(cents) from service_fees where status = 'paid'), 0)::bigint
  where private.current_app_role() = 'pro'
$$;

-- 7. Who may call what.
revoke execute on function public.register_reclaimer(text, text, text) from public, anon;
revoke execute on function public.register_business(text, text) from public, anon;
revoke execute on function public.lookup_reclaimer(text) from public, anon;
revoke execute on function public.create_market_post(text, text, text, integer, integer, text, double precision, double precision, text) from public, anon;
revoke execute on function public.pro_overview() from public, anon;
revoke execute on function public.market_points() from public;
grant execute on function public.register_reclaimer(text, text, text) to authenticated;
grant execute on function public.register_business(text, text) to authenticated;
grant execute on function public.lookup_reclaimer(text) to authenticated;
grant execute on function public.create_market_post(text, text, text, integer, integer, text, double precision, double precision, text) to authenticated;
grant execute on function public.pro_overview() to authenticated;
grant execute on function public.market_points() to anon, authenticated;
