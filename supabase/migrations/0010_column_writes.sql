-- Signed-in people may write only the columns the app writes.
--
-- Row level security already keeps each person to their own rows, but the table-wide grants let them rewrite any
-- column of those rows straight through the API, around the checks in the post and sign-up functions:
--   * a market or electronics post could be moved outside South Africa, kept up for ever (expires_at) or kept at the
--     top of the list (created_at), and both public lists trust those columns;
--   * a reclaimer could change the payment code a centre scans, or their consent time;
--   * an operator could date a price in 2099. board_prices() and the sales route both take the latest price, so it
--     would stay the board price, and the price every sale is checked against, for good.
-- The app itself only closes posts and adds prices. Everything else goes through the security definer functions,
-- which run as their owner and are not affected by these grants. The service role is not changed.

-- Posts: the owner can close or reopen a post. New posts go through create_market_post() and create_ewaste_post(),
-- which check the place. Reopening is still limited by the open-post triggers.
revoke insert, update on public.market_posts from anon, authenticated;
grant update (status) on public.market_posts to authenticated;
revoke insert, update on public.ewaste_posts from anon, authenticated;
grant update (status) on public.ewaste_posts to authenticated;

-- Reclaimers and profiles: register_reclaimer() and register_business() make the rows. The payment code, consent
-- time, role and SAWPRS fields are not the person's to edit.
revoke insert, update on public.reclaimers from anon, authenticated;
grant update (area_id, age_band) on public.reclaimers to authenticated;
revoke insert, update on public.profiles from anon, authenticated;
grant update (display_name, language, avatar_key) on public.profiles to authenticated;

-- Prices: an operator adds a price for their own centre (the policy checks that), always dated now. The cap of
-- R1,000 a kg matches the cap on market posts and catches a mistyped price.
revoke insert, update on public.prices from anon, authenticated;
grant insert (centre_id, material, cents_per_kg) on public.prices to authenticated;
alter table public.prices add constraint prices_cents_per_kg_max check (cents_per_kg <= 100000);

-- Centres: the operator can rename theirs and set its hours. Moving it or handing it over is an admin job.
revoke insert, update on public.centres from anon, authenticated;
grant update (name, hours) on public.centres to authenticated;

-- Anomalies: an analyst sets the status of a flag. The reasons and score are the system's record.
revoke insert, update on public.anomalies from anon, authenticated;
grant update (status) on public.anomalies to authenticated;
