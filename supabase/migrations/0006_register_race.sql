-- Fixes a race in register_reclaimer(). If the same person asked to register twice at the same moment, the
-- second insert hit the "profile already has a row" rule, which the function mistook for a clash between two
-- people's codes. It then drew new codes and failed again, until the request timed out.
--
-- A repeat for the same person now does nothing and returns the code that is already there. Only a real clash
-- between two codes draws a new one. Run once, after 0005_mvp.sql.

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
          values (uid, area, token, p_age_band, now())
          on conflict (profile_id) do nothing;
        exit;
      exception when unique_violation then
        -- Someone else already has this code. Draw again.
        null;
      end;
    end loop;
    -- Read the code back, so a repeat call returns the one that was saved first.
    select qr_token into token from reclaimers where profile_id = uid;
  else
    update reclaimers set area_id = area, age_band = coalesce(p_age_band, age_band) where profile_id = uid;
  end if;

  insert into audit_log (actor, action, target) values (uid, 'register_reclaimer', token);
  return token;
end $$;

revoke execute on function public.register_reclaimer(text, text, text) from public, anon;
grant execute on function public.register_reclaimer(text, text, text) to authenticated;
