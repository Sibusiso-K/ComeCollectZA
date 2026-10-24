-- Payouts and SAWPRS status. Run once, after 0007_ewaste.sql.
--
-- 1. Every recorded sale now queues a payout row in the same transaction. The only channel wired up is
--    'ewallet_mock': it marks the payout as sent and moves no money. A real rail (an FNB eWallet or a bank
--    API) replaces it later by writing a different channel. Nothing else in the app has to change.
-- 2. reclaimers.sawprs_status records whether a reclaimer is registered with SAWPRS. It is entered by the
--    centre operator by hand. It is a record, not a live lookup of the registry.
-- 3. lookup_reclaimer() and pro_overview() return the new fields.

alter table reclaimers
  add column if not exists sawprs_status text not null default 'unknown' check (sawprs_status in ('unknown', 'pending', 'registered')),
  add column if not exists sawprs_ref text check (sawprs_ref is null or length(sawprs_ref) between 1 and 40),
  add column if not exists sawprs_updated_at timestamptz;

-- A reclaimer may update their own row (area, age band), but never their SAWPRS fields. Only set_sawprs_status()
-- changes them, and it runs as the function owner, not as the signed-in role.
create or replace function private.guard_sawprs() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and (new.sawprs_status <> 'unknown' or new.sawprs_ref is not null) then
      raise exception 'SAWPRS_LOCKED';
    end if;
    if tg_op = 'UPDATE' and (new.sawprs_status is distinct from old.sawprs_status or new.sawprs_ref is distinct from old.sawprs_ref
        or new.sawprs_updated_at is distinct from old.sawprs_updated_at) then
      raise exception 'SAWPRS_LOCKED';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists reclaimers_guard_sawprs on reclaimers;
create trigger reclaimers_guard_sawprs before insert or update on reclaimers
  for each row execute function private.guard_sawprs();

-- 1. A sale queues its payout. Same signature as before, so the grants stay.
create or replace function public.record_sale(
  p_idempotency_key text,
  p_operator uuid,
  p_centre uuid,
  p_reclaimer_qr text,
  p_material text,
  p_weight_g integer,
  p_cents_per_kg integer,
  p_load_id uuid default null,
  p_rate_cents_per_kg integer default 25
)
returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  existing transactions%rowtype;
  v_reclaimer uuid;
  v_reasons text[];
  v_tx uuid;
  v_amount integer;
  v_fee integer;
  v_payout payouts%rowtype;
begin
  if not exists (select 1 from centres where id = p_centre and operator_id = p_operator) then
    raise exception 'NOT_OPERATOR' using errcode = '42501';
  end if;

  -- The same key with the same body returns the original sale. The same key with a different body is refused.
  select * into existing from transactions where idempotency_key = p_idempotency_key;
  if found then
    if existing.centre_id <> p_centre or existing.material <> p_material
       or existing.weight_g <> p_weight_g or existing.cents_per_kg <> p_cents_per_kg then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    select * into v_payout from payouts where transaction_id = existing.id;
    return jsonb_build_object(
      'transaction_id', existing.id,
      'replayed', true,
      'amount_cents', existing.amount_cents,
      'payout', case when v_payout.id is null then null else
        jsonb_build_object('status', v_payout.status, 'reference', v_payout.reference, 'channel', v_payout.channel) end
    );
  end if;

  select profile_id into v_reclaimer from reclaimers where qr_token = p_reclaimer_qr;
  if v_reclaimer is null then
    raise exception 'UNKNOWN_CODE';
  end if;

  if p_load_id is not null and not exists (
    select 1 from loads where id = p_load_id and reclaimer_id = v_reclaimer
  ) then
    raise exception 'UNKNOWN_LOAD';
  end if;

  v_reasons := private.sale_reasons(v_reclaimer, p_centre, p_weight_g, p_load_id);

  insert into transactions (reclaimer_id, centre_id, material, weight_g, cents_per_kg, load_id, idempotency_key, recorded_by)
  values (v_reclaimer, p_centre, p_material, p_weight_g, p_cents_per_kg, p_load_id, p_idempotency_key, p_operator)
  returning id, amount_cents into v_tx, v_amount;

  v_fee := floor(p_weight_g::numeric * p_rate_cents_per_kg / 1000)::integer;
  insert into service_fees (transaction_id, cents, rate_cents_per_kg, status)
  values (v_tx, v_fee, p_rate_cents_per_kg, 'owed');

  -- The reclaimer is paid the full sale amount. The service fee is billed to buyers and programmes, never taken from them.
  insert into payouts (reclaimer_id, transaction_id, channel, reference, amount_cents, status)
  values (v_reclaimer, v_tx, 'ewallet_mock', 'PO-' || upper(substr(replace(v_tx::text, '-', ''), 1, 10)), v_amount, 'sent')
  returning * into v_payout;

  if array_length(v_reasons, 1) > 0 then
    insert into anomalies (transaction_id, source, score, reasons)
    values (v_tx, 'rule', least(1, 0.4 * array_length(v_reasons, 1)), v_reasons);
  end if;

  insert into audit_log (actor, action, target)
  values (p_operator, 'record_sale', v_tx::text);

  return jsonb_build_object(
    'transaction_id', v_tx,
    'replayed', false,
    'amount_cents', v_amount,
    'service_fee_cents', v_fee,
    'flags', to_jsonb(coalesce(v_reasons, '{}'::text[])),
    'payout', jsonb_build_object('status', v_payout.status, 'reference', v_payout.reference, 'channel', v_payout.channel)
  );
end $$;

revoke execute on function public.record_sale(text, uuid, uuid, text, text, integer, integer, uuid, integer) from public, anon, authenticated;
grant execute on function public.record_sale(text, uuid, uuid, text, text, integer, integer, uuid, integer) to service_role;

-- 2. Operators set a reclaimer's SAWPRS status by their code.
create or replace function public.set_sawprs_status(p_qr text, p_status text, p_ref text default null)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_reclaimer uuid;
begin
  if uid is null then raise exception 'NOT_SIGNED_IN'; end if;
  if private.current_app_role() is distinct from 'operator' then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if p_status not in ('unknown', 'pending', 'registered') then raise exception 'BAD_STATUS'; end if;
  if p_ref is not null and length(trim(p_ref)) not between 1 and 40 then raise exception 'BAD_REF'; end if;
  if p_status = 'registered' and nullif(trim(coalesce(p_ref, '')), '') is null then raise exception 'REF_REQUIRED'; end if;

  select profile_id into v_reclaimer from reclaimers where qr_token = p_qr;
  if v_reclaimer is null then raise exception 'UNKNOWN_CODE'; end if;

  update reclaimers
     set sawprs_status = p_status,
         sawprs_ref = case when p_status = 'unknown' then null else nullif(trim(coalesce(p_ref, '')), '') end,
         sawprs_updated_at = now()
   where profile_id = v_reclaimer;
  insert into audit_log (actor, action, target) values (uid, 'set_sawprs_status', v_reclaimer::text || ':' || p_status);
  return true;
end $$;

-- 3. Return the new fields. The return type changes, so the old functions are dropped first.
drop function if exists public.lookup_reclaimer(text);
create function public.lookup_reclaimer(p_qr text)
returns table (display_name text, area_id text, sawprs_status text, sawprs_ref text)
language sql stable security definer set search_path = public as $$
  select p.display_name, r.area_id, r.sawprs_status, r.sawprs_ref
  from reclaimers r
  join profiles p on p.id = r.profile_id
  where r.qr_token = p_qr and private.current_app_role() = 'operator'
$$;

drop function if exists public.pro_overview();
create function public.pro_overview()
returns table (
  registered bigint, active_reclaimers bigint, youth_reclaimers bigint,
  tonnes_30d numeric, fees_owed_cents bigint, fees_paid_cents bigint,
  sawprs_registered bigint, payouts_sent_cents bigint
)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from reclaimers),
    (select count(distinct t.reclaimer_id) from transactions t where t.created_at > now() - interval '30 days'),
    (select count(distinct t.reclaimer_id) from transactions t join reclaimers r on r.profile_id = t.reclaimer_id
       where t.created_at > now() - interval '30 days' and r.age_band in ('18-24', '25-34')),
    coalesce((select sum(weight_g) / 1000000.0 from transactions where created_at > now() - interval '30 days'), 0),
    coalesce((select sum(cents) from service_fees where status in ('owed', 'missing')), 0)::bigint,
    coalesce((select sum(cents) from service_fees where status = 'paid'), 0)::bigint,
    (select count(*) from reclaimers where sawprs_status = 'registered'),
    coalesce((select sum(amount_cents) from payouts where status in ('sent', 'paid')), 0)::bigint
  where private.current_app_role() = 'pro'
$$;

revoke execute on function public.set_sawprs_status(text, text, text) from public, anon;
revoke execute on function public.lookup_reclaimer(text) from public, anon;
revoke execute on function public.pro_overview() from public, anon;
grant execute on function public.set_sawprs_status(text, text, text) to authenticated;
grant execute on function public.lookup_reclaimer(text) to authenticated;
grant execute on function public.pro_overview() to authenticated;
