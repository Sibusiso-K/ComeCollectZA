-- Board prices for the reclaimer app, readable without signing in.
--
-- The prices table is only readable by signed-in users. Board prices are public information, so this
-- function returns the latest price for each centre and material. It exposes the centre's name and area,
-- but never the operator id or any other personal data. Run once, after 0002_harden_helpers.sql.

create or replace function public.board_prices()
returns table (
  centre_id uuid,
  centre_name text,
  area_id text,
  material text,
  cents_per_kg integer,
  effective_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select distinct on (p.centre_id, p.material)
    c.id, c.name, c.area_id, p.material, p.cents_per_kg, p.effective_at
  from prices p
  join centres c on c.id = p.centre_id
  order by p.centre_id, p.material, p.effective_at desc
$$;

revoke execute on function public.board_prices() from public;
grant execute on function public.board_prices() to anon, authenticated;
