-- Electronic waste: where to take it, and a board where people sell, give away or look for old electronics.
-- Run once, after 0006_register_race.sql.
--
-- 1. ewaste_points: public places that take or buy electronics. Anyone can read. Only an administrator writes
--    (SQL editor or service key), so every row carries its source and the date it was last checked.
-- 2. ewaste_posts: a person's own listing (sell, give away, or want for parts). Private rows. The map reads
--    ewaste_listings(), which snaps locations to about 250 m and never returns the contact number.
-- 3. ewaste_contact(): the poster's number, for signed-in people only.

-- 1. Places ------------------------------------------------------------------------------------------------------

create table if not exists ewaste_points (
  id          text primary key check (id ~ '^[a-z0-9-]{3,60}$'),
  name        text not null check (length(name) between 2 and 100),
  kind        text not null check (kind in ('retail_bin', 'municipal', 'recycler', 'buyer')),
  accepts     text[] not null default '{}'
    check (accepts <@ array['phone', 'computer', 'tv', 'large_appliance', 'small_appliance', 'battery', 'cables', 'lighting', 'printer', 'other']),
  area_label  text not null check (length(area_label) between 2 and 60),
  address     text check (address is null or length(address) <= 160),
  lat         double precision not null check (lat between -35 and -22),
  lng         double precision not null check (lng between 16 and 33),
  pin         text not null default 'area' check (pin in ('site', 'area')),
  phone       text check (phone is null or length(phone) <= 30),
  website     text check (website is null or website ~ '^https://'),
  hours       text check (hours is null or length(hours) <= 120),
  free        boolean not null default true,
  note        text check (note is null or length(note) <= 300),
  confidence  text not null default 'listed' check (confidence in ('confirmed', 'listed', 'unsure')),
  source_url  text not null check (source_url ~ '^https://'),
  checked_on  date not null,
  active      boolean not null default true
);
alter table ewaste_points enable row level security;
create policy ewaste_points_read on ewaste_points for select to anon, authenticated using (active);

-- Every place below came from a public page (source_url) and has not been visited. "pin = area" means the pin
-- sits on the suburb, not the door. "confidence" says how sure we are the place still takes electronics.
insert into ewaste_points (id, name, kind, accepts, area_label, address, lat, lng, pin, phone, website, hours, free, note, confidence, source_url, checked_on) values
  ('marie-louise-ewaste', 'Marie Louise e-waste drop-off (Pikitup, eWASA and reclaimers)', 'municipal',
   array['phone', 'computer', 'tv', 'small_appliance', 'battery', 'cables', 'printer'],
   'Dobsonville, Soweto', 'Marie Louise landfill, Dobsonville', -26.19078, 27.88367, 'site', null, null, null, true,
   'Started in December 2024 with reclaimers on site. The landfill stopped taking household waste in September 2025 and had not reopened by December 2025. Phone Pikitup before you travel.',
   'unsure', 'https://joburg.org.za/media_/Newsroom/Pages/2024%20News%20Article/December/Pikitup-and-partners-launch-e-waste-recycling-programme-.aspx', '2026-10-23'),
  ('makro-crown-mines', 'Makro e-waste bin, Crown Mines', 'retail_bin',
   array['phone', 'computer', 'tv', 'small_appliance', 'large_appliance', 'printer', 'cables', 'battery'],
   'Crown Mines, Johannesburg', null, -26.21614, 28.00974, 'area', null, null, null, true,
   'Makro runs free e-waste bins with the E-Waste Recycling Authority and Desco. Look near the entrance or ask at customer service. Check that this store still has a bin.',
   'listed', 'https://whatsoninjoburg.com/?p=220913', '2026-10-23'),
  ('makro-woodmead', 'Makro e-waste bin, Woodmead', 'retail_bin',
   array['phone', 'computer', 'tv', 'small_appliance', 'large_appliance', 'printer', 'cables', 'battery'],
   'Woodmead, Sandton', null, -26.05934, 28.09224, 'area', null, null, null, true,
   'Makro runs free e-waste bins with the E-Waste Recycling Authority and Desco. Look near the entrance or ask at customer service. Check that this store still has a bin.',
   'listed', 'https://www.massmart.co.za/news/2026/06/-worldenvironmentday-massmart-continues-to-tackle-south-africa-s', '2026-10-23'),
  ('pnp-roodepoort', 'Pick n Pay e-waste bin, Roodepoort', 'retail_bin',
   array['phone', 'small_appliance', 'large_appliance', 'cables', 'battery', 'lighting'],
   'Roodepoort', null, -26.15747, 27.92806, 'area', null, null, null, true,
   'Pick n Pay planned bins in 210 stores with EWaste Africa and the E-Waste Recycling Authority. This area is listed, the exact store is not. Ask at the store.',
   'unsure', 'https://iol.co.za/business-report/companies/2024-06-17-pick-n-pay-empowers-shoppers-in-the-fight-against-e-waste-while-supporting-job-creation/', '2026-10-23'),
  ('pnp-kensington', 'Pick n Pay e-waste bin, Kensington', 'retail_bin',
   array['phone', 'small_appliance', 'large_appliance', 'cables', 'battery', 'lighting'],
   'Kensington, Johannesburg', null, -26.19611, 28.09694, 'area', null, null, null, true,
   'Pick n Pay planned bins in 210 stores with EWaste Africa and the E-Waste Recycling Authority. This area is listed, the exact store is not. Ask at the store.',
   'unsure', 'https://iol.co.za/business-report/companies/2024-06-17-pick-n-pay-empowers-shoppers-in-the-fight-against-e-waste-while-supporting-job-creation/', '2026-10-23'),
  ('pnp-fourways', 'Pick n Pay e-waste bin, Fourways', 'retail_bin',
   array['phone', 'small_appliance', 'large_appliance', 'cables', 'battery', 'lighting'],
   'Fourways, Johannesburg', null, -26.00447, 28.00424, 'area', null, null, null, true,
   'Pick n Pay planned bins in 210 stores with EWaste Africa and the E-Waste Recycling Authority. This area is listed, the exact store is not. Ask at the store.',
   'unsure', 'https://iol.co.za/business-report/companies/2024-06-17-pick-n-pay-empowers-shoppers-in-the-fight-against-e-waste-while-supporting-job-creation/', '2026-10-23'),
  ('desco-kempton-park', 'Desco Electronic Recyclers', 'recycler',
   array['phone', 'computer', 'tv', 'printer', 'small_appliance', 'cables'],
   'Pomona, Kempton Park', 'c/o West St and Elgin Rd, Pomona Ext 159, Kempton Park', -26.11543, 28.22861, 'area', '+27 11 979 3017', 'https://desco.co.za', null, true,
   'A certified recycler. Free collection for one tonne or one cubic metre or more. Ask if they buy from collectors.',
   'listed', 'https://desco.co.za', '2026-10-23'),
  ('ewaste-africa-boksburg', 'EWaste Africa', 'recycler',
   array['phone', 'computer', 'tv', 'large_appliance', 'small_appliance', 'lighting', 'printer', 'cables', 'other'],
   'Boksburg East', 'Unit 78H Van Dyk Secure Business Park, Boksburg East', -26.21801, 28.26063, 'area', null, 'https://ewasa.org/recycle_map/', null, true,
   'Runs a lamp and light bulb recycling plant and collects for the Pick n Pay bins. Phone to ask whether they take drop-offs from the public.',
   'listed', 'https://ewasa.org/recycle_map/', '2026-10-23')
on conflict (id) do nothing;

-- 2. Listings ----------------------------------------------------------------------------------------------------

create table if not exists ewaste_posts (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  kind        text not null check (kind in ('sell', 'give', 'want')),
  category    text not null check (category in ('phone', 'computer', 'tv', 'large_appliance', 'small_appliance', 'battery', 'cables', 'lighting', 'printer', 'other')),
  title       text not null check (length(title) between 2 and 80),
  condition   text not null check (condition in ('works', 'repair', 'parts')),
  price_cents integer check (price_cents is null or price_cents between 0 and 10000000),
  seller      text not null check (length(seller) between 1 and 80),
  contact     text not null check (contact ~ '^\+?[0-9 ()-]{9,20}$'),
  area_label  text not null check (length(area_label) between 2 and 60),
  location    extensions.geography(point, 4326) not null,
  note        text check (note is null or length(note) <= 200),
  status      text not null default 'open' check (status in ('open', 'closed')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days'
);
create index if not exists ewaste_posts_open_idx on ewaste_posts (status, expires_at);
alter table ewaste_posts enable row level security;

create policy ewaste_posts_read_own on ewaste_posts for select to authenticated using (owner_id = auth.uid());
create policy ewaste_posts_insert_own on ewaste_posts for insert to authenticated
  with check (owner_id = auth.uid() and private.current_app_role() in ('reclaimer', 'operator', 'business'));
create policy ewaste_posts_update_own on ewaste_posts for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy ewaste_posts_delete_own on ewaste_posts for delete to authenticated using (owner_id = auth.uid());

-- At most 10 open electronics listings per person.
create or replace function private.limit_open_ewaste() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'open' and (select count(*) from ewaste_posts where owner_id = new.owner_id and status = 'open' and id <> new.id) >= 10 then
    raise exception 'TOO_MANY_POSTS';
  end if;
  return new;
end $$;
drop trigger if exists ewaste_posts_limit on ewaste_posts;
create trigger ewaste_posts_limit before insert or update on ewaste_posts
  for each row execute function private.limit_open_ewaste();

create or replace function public.create_ewaste_post(
  p_kind text, p_category text, p_title text, p_condition text, p_price_cents integer,
  p_seller text, p_contact text, p_area_label text, p_lat double precision, p_lng double precision, p_note text default null
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
  if p_contact is null or trim(p_contact) !~ '^\+?[0-9 ()-]{9,20}$' then raise exception 'BAD_CONTACT'; end if;
  if p_kind = 'give' and coalesce(p_price_cents, 0) <> 0 then raise exception 'GIVE_IS_FREE'; end if;
  insert into ewaste_posts (owner_id, kind, category, title, condition, price_cents, seller, contact, area_label, location, note)
  values (uid, p_kind, p_category, trim(p_title), p_condition, case when p_kind = 'give' then 0 else p_price_cents end,
          trim(p_seller), trim(p_contact), trim(p_area_label),
          extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography, nullif(trim(coalesce(p_note, '')), ''))
  returning id into new_id;
  return new_id;
end $$;

-- What the map and list read. Locations are snapped and the contact number is left out.
create or replace function public.ewaste_listings()
returns table (
  id uuid, kind text, category text, title text, condition text, price_cents integer, seller text,
  area_label text, lat double precision, lng double precision, note text, created_at timestamptz
)
language sql stable security definer set search_path = public, extensions as $$
  select m.id, m.kind, m.category, m.title, m.condition, m.price_cents, m.seller, m.area_label,
         extensions.st_y(extensions.st_snaptogrid(m.location::extensions.geometry, 0.0025)),
         extensions.st_x(extensions.st_snaptogrid(m.location::extensions.geometry, 0.0025)),
         m.note, m.created_at
  from ewaste_posts m
  where m.status = 'open' and m.expires_at > now()
  order by m.created_at desc
$$;

-- The poster's number, for people who are signed in.
create or replace function public.ewaste_contact(p_id uuid)
returns text
language sql stable security definer set search_path = public as $$
  select m.contact from ewaste_posts m
  where m.id = p_id and m.status = 'open' and m.expires_at > now() and auth.uid() is not null
$$;

revoke execute on function public.create_ewaste_post(text, text, text, text, integer, text, text, text, double precision, double precision, text) from public, anon;
revoke execute on function public.ewaste_listings() from public;
revoke execute on function public.ewaste_contact(uuid) from public, anon;
grant execute on function public.create_ewaste_post(text, text, text, text, integer, text, text, text, double precision, double precision, text) to authenticated;
grant execute on function public.ewaste_listings() to anon, authenticated;
grant execute on function public.ewaste_contact(uuid) to authenticated;
