-- Hardening after the first live apply (project comecollectza, 21 Oct 2026). Run once, after 0001_init.sql.
--
-- 1. PostGIS moves to the extensions schema, which the API does not expose. PostGIS cannot change
--    schema with ALTER EXTENSION, so it is dropped and recreated. Centre coordinates are kept in
--    plain columns while the extension is down, then the geography column is rebuilt from them.
-- 2. Policy helpers move to the private schema, and only authenticated may execute them.
-- 3. The PRO summary calls the helper by its new name.

create schema if not exists extensions;
create schema if not exists private;
grant usage on schema private to authenticated;

alter table centres add column lng double precision, add column lat double precision;
update centres set lng = st_x(location::geometry), lat = st_y(location::geometry);
drop index if exists centres_location_idx;
alter table centres drop column location;
drop extension postgis;
create extension postgis with schema extensions;
alter table centres add column location extensions.geography(point, 4326);
update centres set location = extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography;
alter table centres alter column location set not null;
alter table centres drop column lng, drop column lat;
create index centres_location_idx on centres using gist (location);

alter function current_app_role() set schema private;
alter function operates_centre(uuid) set schema private;

revoke execute on function private.current_app_role() from public, anon;
revoke execute on function private.operates_centre(uuid) from public, anon;
grant execute on function private.current_app_role() to authenticated;
grant execute on function private.operates_centre(uuid) to authenticated;

create or replace function pro_material_summary(from_date date, to_date date)
returns table (material text, area_id text, kg numeric, sales bigint, value_cents bigint)
language sql stable security definer set search_path = public as $$
  select t.material, r.area_id, sum(t.weight_g) / 1000.0, count(*), sum(t.amount_cents)
  from transactions t
  join reclaimers r on r.profile_id = t.reclaimer_id
  where private.current_app_role() = 'pro'
    and t.created_at::date between from_date and to_date
  group by t.material, r.area_id
$$;

-- Table grants. Supabase grants these by default; kept here so a fresh project matches.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
