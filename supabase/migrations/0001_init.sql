-- ComeCollectZA schema. Run in the Supabase SQL editor before seed.sql.
-- Money is stored in integer cents and weight in integer grams.

create extension if not exists postgis;

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('reclaimer', 'operator', 'pro')),
  display_name text not null,
  language     text not null default 'en',
  avatar_key   text,
  created_at   timestamptz not null default now()
);

create table if not exists materials (
  code  text primary key,
  label text not null,
  token text not null
);

create table if not exists centres (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  area_id     text not null,
  location    geography(point, 4326) not null,
  hours       text,
  operator_id uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists centres_location_idx on centres using gist (location);

create table if not exists reclaimers (
  profile_id  uuid primary key references profiles(id) on delete cascade,
  area_id     text not null,
  qr_token    text not null unique,
  sawpras_ref text,
  consent_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists prices (
  id            bigint generated always as identity primary key,
  centre_id     uuid not null references centres(id) on delete cascade,
  material      text not null references materials(code),
  cents_per_kg  integer not null check (cents_per_kg > 0),
  effective_at  timestamptz not null default now()
);
create index if not exists prices_lookup_idx on prices (centre_id, material, effective_at desc);

create table if not exists loads (
  id                    uuid primary key default gen_random_uuid(),
  reclaimer_id          uuid not null references reclaimers(profile_id) on delete cascade,
  photo_path            text not null,
  dhash                 bit(64) not null,
  suggested_material    text references materials(code),
  suggestion_confidence real,
  created_at            timestamptz not null default now()
);

create table if not exists transactions (
  id               uuid primary key default gen_random_uuid(),
  reclaimer_id     uuid not null references reclaimers(profile_id),
  centre_id        uuid not null references centres(id),
  material         text not null references materials(code),
  weight_g         integer not null check (weight_g between 1 and 500000),
  cents_per_kg     integer not null check (cents_per_kg > 0),
  amount_cents     integer generated always as (weight_g * cents_per_kg / 1000) stored,
  load_id          uuid references loads(id),
  idempotency_key  text unique,
  recorded_by      uuid not null references profiles(id),
  created_at       timestamptz not null default now()
);
create index if not exists transactions_reclaimer_idx on transactions (reclaimer_id, created_at desc);
create index if not exists transactions_centre_idx on transactions (centre_id, created_at desc);

create table if not exists service_fees (
  id                 uuid primary key default gen_random_uuid(),
  transaction_id     uuid not null unique references transactions(id) on delete cascade,
  cents              integer not null check (cents >= 0),
  rate_cents_per_kg  integer not null,
  status             text not null default 'owed' check (status in ('owed', 'paid', 'missing')),
  updated_at         timestamptz not null default now()
);

create table if not exists payouts (
  id              uuid primary key default gen_random_uuid(),
  reclaimer_id    uuid not null references reclaimers(profile_id),
  transaction_id  uuid references transactions(id),
  channel         text not null check (channel in ('ewallet_mock', 'payshap_mock', 'ewallet', 'payshap')),
  reference       text not null unique,
  amount_cents    integer not null check (amount_cents >= 0),
  status          text not null check (status in ('queued', 'sent', 'failed', 'paid')),
  created_at      timestamptz not null default now()
);

create table if not exists anomalies (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references transactions(id) on delete cascade,
  source          text not null check (source in ('rule', 'model')),
  score           real not null default 0,
  reasons         text[] not null default '{}',
  status          text not null default 'open' check (status in ('open', 'cleared', 'confirmed')),
  created_at      timestamptz not null default now()
);

create table if not exists forecasts (
  material      text not null references materials(code),
  area_id       text not null,
  target_date   date not null,
  p10_cents     integer,
  p50_cents     integer,
  p90_cents     integer,
  model         text not null,
  generated_at  timestamptz not null default now(),
  primary key (material, area_id, target_date)
);

create table if not exists audit_log (
  id      bigint generated always as identity primary key,
  actor   uuid,
  action  text not null,
  target  text,
  at      timestamptz not null default now()
);

-- Helpers used by policies. Security definer avoids recursive RLS checks on profiles.
create or replace function current_app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function operates_centre(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from centres where id = c and operator_id = auth.uid())
$$;

-- Row level security. Sales are written only by the server (service role), after it checks the session.
alter table profiles      enable row level security;
alter table materials     enable row level security;
alter table centres       enable row level security;
alter table reclaimers    enable row level security;
alter table prices        enable row level security;
alter table loads         enable row level security;
alter table transactions  enable row level security;
alter table service_fees  enable row level security;
alter table payouts       enable row level security;
alter table anomalies     enable row level security;
alter table forecasts     enable row level security;
alter table audit_log     enable row level security;

create policy profiles_read_own on profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_insert_own on profiles for insert to authenticated
  with check (id = auth.uid() and role in ('reclaimer', 'operator'));
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = current_app_role());

create policy materials_read on materials for select to authenticated
  using (true);

create policy centres_read on centres for select to authenticated
  using (true);
create policy centres_update_operator on centres for update to authenticated
  using (operator_id = auth.uid()) with check (operator_id = auth.uid());

create policy reclaimers_read_own on reclaimers for select to authenticated
  using (profile_id = auth.uid());
create policy reclaimers_insert_own on reclaimers for insert to authenticated
  with check (profile_id = auth.uid() and current_app_role() = 'reclaimer');
create policy reclaimers_update_own on reclaimers for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy prices_read on prices for select to authenticated
  using (true);
create policy prices_insert_operator on prices for insert to authenticated
  with check (operates_centre(centre_id));

create policy loads_own on loads for all to authenticated
  using (reclaimer_id = auth.uid()) with check (reclaimer_id = auth.uid());

create policy transactions_read on transactions for select to authenticated
  using (reclaimer_id = auth.uid() or operates_centre(centre_id));

create policy service_fees_read on service_fees for select to authenticated
  using (exists (
    select 1 from transactions t
    where t.id = transaction_id and (t.reclaimer_id = auth.uid() or operates_centre(t.centre_id))
  ));

create policy payouts_read_own on payouts for select to authenticated
  using (reclaimer_id = auth.uid());

create policy anomalies_read_pro on anomalies for select to authenticated
  using (current_app_role() = 'pro');
create policy anomalies_update_pro on anomalies for update to authenticated
  using (current_app_role() = 'pro') with check (current_app_role() = 'pro');

create policy forecasts_read on forecasts for select to authenticated
  using (true);

-- audit_log has no policies, so only the service role can read or write it.

-- PRO view: aggregates by material and area, with no names and no individual sales.
create or replace function pro_material_summary(from_date date, to_date date)
returns table (material text, area_id text, kg numeric, sales bigint, value_cents bigint)
language sql stable security definer set search_path = public as $$
  select t.material, r.area_id, sum(t.weight_g) / 1000.0, count(*), sum(t.amount_cents)
  from transactions t
  join reclaimers r on r.profile_id = t.reclaimer_id
  where current_app_role() = 'pro'
    and t.created_at::date between from_date and to_date
  group by t.material, r.area_id
$$;

revoke execute on function pro_material_summary(date, date) from public, anon;
grant execute on function pro_material_summary(date, date) to authenticated;
revoke execute on function current_app_role() from anon;
