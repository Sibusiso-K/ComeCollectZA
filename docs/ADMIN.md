# Admin guide

Things only the project owner can do. None of them needs code changes. Use the Supabase dashboard (SQL editor and Authentication) and the Vercel dashboard. Never paste a secret key into chat, a document or git.

## 1. Switch on sale recording

Recording a sale writes to protected tables, so it runs on the server with the service role key.

1. In Supabase, open Project Settings, then API Keys, and copy the **service role** key.
2. In Vercel, open the `comecollectza` project, then Settings, then Environment Variables. Add `SUPABASE_SERVICE_ROLE_KEY` for Production and Preview.
3. Redeploy. Until this is set, the centre console says "Sales saving is not switched on", and the route returns 501.

## 2. Sign-in settings

The app signs people up with email and password through Supabase Auth.

- **Confirm email:** Authentication, then Sign In / Providers, then Email. For a pilot, either keep confirmation on or switch it off.
- **Email sending:** the built-in sender allows only a few emails an hour. Before real users sign up, add a custom SMTP service under Authentication, then SMTP Settings. Confirmation emails stop arriving when the limit is hit.
- **Phone number sign-in** needs an SMS service (for example Twilio or an African SMS gateway). It is not set up. When it is, the sign-in screen can add a phone option.

## 3. Make a centre account (operator)

1. The centre manager signs up in the app as **Business** and confirms their email.
2. Find them: `select id, email from auth.users where email = 'manager@example.com';`
3. Run:
```sql
update profiles set role = 'operator' where id = '<their id>';
update centres set operator_id = '<their id>' where id = '<centre id>';
```
4. They open `/centre`. They can set the price board, look up a reclaimer's code and record weighed sales.

Operators cannot be created from the app. This is on purpose.

## 4. Add a real centre

```sql
insert into centres (name, area_id, location, hours, operator_id)
values (
  'Example Buy-Back, Dobsonville', 'dobsonville',
  extensions.st_setsrid(extensions.st_makepoint(27.85, -26.27), 4326)::extensions.geography,
  'Mon to Sat 07:00 to 17:00', '<operator id>'
);
```
The longitude comes first, then the latitude. The centre then shows on the market map once it has a price.

## 5. Make a programme analyst (PRO)

The analyst signs up as Business, then:
```sql
update profiles set role = 'pro' where id = '<their id>';
```
They open `/pro`. They see totals only, never names.

## 6. Remove the demo centres

The three seeded centres ("Demo Centre Orlando East", "Klipspruit", "Alexandra") hold demo prices. Once real centres post prices, remove them:
```sql
delete from prices where centre_id in (select id from centres where name like 'Demo Centre%');
delete from centres where name like 'Demo Centre%' and not exists (select 1 from transactions t where t.centre_id = centres.id);
```

## 7. Electronics drop-off points

The finder reads the `ewaste_points` table. Eight places are seeded from public pages and none has been visited. Every row has a `source_url`, a `checked_on` date and a `confidence` of `confirmed`, `listed` or `unsure`. The app shows all three, and tells people to phone first.

Add or fix a place in the Supabase SQL editor (nobody else can write to this table):
```sql
insert into ewaste_points (id, name, kind, accepts, area_label, address, lat, lng, pin, phone, website, hours, free, note, confidence, source_url, checked_on)
values ('makro-example', 'Makro e-waste bin, Example', 'retail_bin', array['phone','computer','tv','battery'], 'Example, Johannesburg',
        null, -26.2, 28.0, 'area', null, null, null, true, 'Bin near the entrance.', 'confirmed', 'https://example.com/page-that-says-so', current_date);
```
- `kind` is `retail_bin`, `municipal`, `recycler` or `buyer`. `accepts` uses: phone, computer, tv, large_appliance, small_appliance, battery, cables, lighting, printer, other.
- Use `pin = 'site'` only when the coordinates are the door. Use `'area'` when they are the suburb.
- After you visit or phone a place, set `confidence = 'confirmed'` and `checked_on = current_date`.
- To hide a place, set `active = false`. Do not delete rows, so the history stays.
- The first places to add are the ones near Soweto that reclaimers can reach. Only one seeded place is in Soweto, and it needs checking: the Marie Louise landfill stopped taking household waste in September 2025.

## 8. Payouts and SAWPRS

- Payouts are **demo payouts** until a payment partner is connected. Each sale writes a `payouts` row on channel `ewallet_mock` with status `sent`. No money moves.
- To go live, put the real rail's call in the sales route after `record_sale()` returns, write the real channel (`ewallet` or `payshap`) and update the row to `paid` or `failed` from the rail's answer. Keep the same reference.
- SAWPRS status is set by the centre operator on the sale screen, from what the reclaimer shows. To correct one: `select public.set_sawprs_status` needs an operator session, so in the SQL editor use `update reclaimers set sawprs_status = 'registered', sawprs_ref = '...' where qr_token = '...';`. The editor runs as an administrator, so the guard trigger does not block it.

## 9. Checks

- `select count(*) from market_points();` returns the map pins.
- `select channel, status, count(*) from payouts group by 1, 2;` shows the demo payouts.
- `select count(*) from ewaste_points;` returns the electronics places, and `select * from ewaste_listings();` the open listings (without phone numbers).
- `select * from pro_overview();` run as a PRO user returns totals. Anyone else gets no rows.
- Supabase, then Advisors. The warnings about `board_prices`, `market_points` and the sign-in functions are expected: each checks the caller inside.
