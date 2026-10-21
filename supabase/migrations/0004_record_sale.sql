-- Recording a weighed sale at a buy-back centre. Run once, after 0003_board_prices.sql.
--
-- record_sale() does everything in one transaction: idempotency check, reclaimer lookup, rule flags,
-- the sale, the service fee, the anomaly row and the audit row. Only the service role may call it.
-- The API route checks the operator's session and the board price before it calls this function.

-- Rule flags for a sale, computed before the sale is inserted so the sale is not part of its own history.
create or replace function private.sale_reasons(p_reclaimer uuid, p_centre uuid, p_weight_g integer, p_load uuid)
returns text[]
language plpgsql stable security definer set search_path = public as $$
declare
  reasons text[] := '{}';
  history_count integer;
  p95 double precision;
begin
  -- Rule 1: weight over three times the reclaimer's 95th percentile over 30 days. Needs five earlier sales.
  select count(*), percentile_cont(0.95) within group (order by weight_g)
    into history_count, p95
  from transactions
  where reclaimer_id = p_reclaimer and created_at > now() - interval '30 days';

  if history_count >= 5 and p_weight_g > 3 * p95 then
    reasons := array_append(reasons, 'weight over 3x 30-day 95th percentile');
  end if;

  -- Rule 2: the load photo is a near-duplicate (Hamming distance of 6 or less) of a load from the last 30 days.
  if p_load is not null and exists (
    select 1
    from loads this_load
    join loads other on other.id <> this_load.id
    where this_load.id = p_load
      and other.created_at > now() - interval '30 days'
      and bit_count(this_load.dhash # other.dhash) <= 6
  ) then
    reasons := array_append(reasons, 'photo matches an earlier load');
  end if;

  -- Rule 3: the reclaimer's first sale at this centre, and the centre is outside their home area.
  if not exists (select 1 from transactions where reclaimer_id = p_reclaimer and centre_id = p_centre)
     and (select area_id from centres where id = p_centre) <> (select area_id from reclaimers where profile_id = p_reclaimer)
  then
    reasons := array_append(reasons, 'first sale at a centre outside home area');
  end if;

  return reasons;
end $$;

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
    return jsonb_build_object(
      'transaction_id', existing.id,
      'replayed', true,
      'amount_cents', existing.amount_cents
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
    'flags', to_jsonb(coalesce(v_reasons, '{}'::text[]))
  );
end $$;

-- Only the server, using the service role, may record sales or run the rule helper.
revoke execute on function public.record_sale(text, uuid, uuid, text, text, integer, integer, uuid, integer) from public, anon, authenticated;
grant execute on function public.record_sale(text, uuid, uuid, text, text, integer, integer, uuid, integer) to service_role;
revoke execute on function private.sale_reasons(uuid, uuid, integer, uuid) from public, anon, authenticated;
