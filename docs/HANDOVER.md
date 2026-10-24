# Handover

Read this first if you are picking the project up.

## What the project is

ComeCollectZA is an app for South Africa's informal recyclers (reclaimers), built by team JBB for the FNB App of the Year Hackathon 2026. See [PLAN.md](PLAN.md) for the problem and scope, [ARCHITECTURE.md](ARCHITECTURE.md) for the design, and [ADMIN.md](ADMIN.md) for what the owner has to set up.

## Where things stand (23 Oct 2026, night)

| Area | State | Notes |
|---|---|---|
| Live app | https://comecollectza.vercel.app | Deployed from `main` on every merge |
| Scanner | Built, tested in a browser | On-device TinyCLIP, works with no data after one 38 MB download, spots mixed loads, tap a part of the photo to see what it thought. Head v5 is 82% on held-out real landfill photos, 71% on mixed household photos (62% real-world), and recognises electronics. Not tested on a real phone. See [MODELS.md](MODELS.md) |
| Accounts | Built, not yet used by real people | Email and password through Supabase Auth. Reclaimer and business sign-up. One call creates the profile and the reclaimer's code |
| Prices | Live from the database | Public ranges for 2026 with sources. Seeded centres are demo centres until real ones post prices |
| Sell flow | Built | Choose centre, weigh, show a QR code |
| My money and impact | Built, from the person's own sales | Fees paid, owed, missing. CO2e, landfill, work days. Needs a signed-in reclaimer with recorded sales |
| Marketplace | Built | Map and list of centres and posts. Reclaimers and businesses can post. Posts have no contact method yet |
| Electronics | Built | Guide, drop-off finder (8 places, none visited), and a sell, give or ask board with contact shown to signed-in people. Only one seeded place is in Soweto, and it needs a phone call. See [ADMIN.md](ADMIN.md) section 7 |
| Centre console | Built | Sets the price board, looks up codes. Recording a sale needs `SUPABASE_SERVICE_ROLE_KEY` on the server |
| Programme dashboard | Built | Totals only. Needs a PRO account |
| First-time tour, languages, light and dark | Built | 11 languages offered. English, Afrikaans, isiZulu and isiXhosa are drafts that need a first-language reader |
| PWA | Built | Installs. Saved pages and the scanner open with no signal |
| Payouts and SAWPRS | Demo only | Each sale queues a demo payout (no money moves) and operators record a reclaimer's SAWPRS status by hand. A real payout rail and a live registry check are not connected. See [ADMIN.md](ADMIN.md) section 8 |
| Phone number sign-in | Not started | Needs an SMS service |
| Offline write queue | Not started | Reading works offline. Writing needs a signal |
| Tests | 74 database checks, 14 app checks | `npm run test:db`, `npm run test:app`. Both run in CI with typecheck and build |

## Set up on a new machine

1. Install Node 24 LTS (20.9 or newer works).
2. Clone over HTTPS: `git clone https://github.com/Sibusiso-K/ComeCollectZA.git`
3. On Windows, run `git config core.longpaths true` in the repo. Keep branch names short.
4. `npm install`
5. `cp .env.example .env.local` and fill in the public Supabase values.
6. `npm run dev` and open http://localhost:3000. The first run downloads the scanner model once.

## Supabase

Project `comecollectza` (ref `roiwontybdbhkuitffll`, region eu-west-2). Migrations run in this order. All ten are applied live (0010 on 24 Oct, see the note at the end of [SECURITY.md](SECURITY.md)).

1. `0001_init.sql`
2. `0002_harden_helpers.sql`
3. `0003_board_prices.sql`
4. `0004_record_sale.sql`
5. `0005_mvp.sql` (registration, marketplace posts, map function, lookup, PRO totals)
6. `0006_register_race.sql` (a fix to registration)
7. `0007_ewaste.sql` (electronics places, listings and contact)
8. `0008_payouts.sql` (demo payouts and SAWPRS status)
9. `0009_guard_search_path.sql` (pins the search path of the SAWPRS guard)
10. `0010_column_writes.sql` (signed-in people can write only the columns the app writes)

Seed (`supabase/seed.sql`) is applied. Do not run it again, it adds duplicate prices. For a fresh project, run the migrations in order, then the seed.

## Checks before asking for review

```bash
npm run typecheck
npm run test:app
npm run test:db
npm run build
```

The database tests run the real migrations against an in-process PostgreSQL 17 with PostGIS, and check what each role can see and do.

## Open tasks, in priority order

Each item gets its own branch and pull request.

1. **Owner setup** ([ADMIN.md](ADMIN.md)): the service key in Vercel, a custom email sender, a centre account, a programme account, and real centres replacing the demo ones. Without these, nobody can record a real sale.
2. **Test on a real phone** ([PHONE_TEST.md](PHONE_TEST.md)): the camera, install, offline use, and the scanner on real loads.
3. **Electronics data:** phone or visit the seeded places and set them to `confirmed`, add places near Soweto, add a report button, and put listings on the map.
4. **Contact on the market:** a post has no way to reach the poster. Add an optional WhatsApp number shown only to signed-in people, and a report button.
5. **Payouts and SAWPRS:** adapters for a payout rail and the registration check. The FNB options are in the research notes in the build log.
6. **Phone number sign-in:** connect an SMS service, then add a phone option to the sign-in screen.
7. **Translations:** have first-language speakers check the four drafts and write the other seven.
8. **Offline queue:** keep sales lookups and market posts and send them when a signal returns.
9. **Sell-or-wait advice** from price history, and the duplicate photo check.
10. **Sonke submission:** the 20-second pitch video, the deck with a demo login, the SSDLC form and the Lean Canvas. The canvas text is in [BUSINESS_MODEL.md](BUSINESS_MODEL.md).

## Known issues

- **The first scan needs a signal.** The model and runtime (about 38 MB) download once, then work with no data. Open the scanner once on Wi-Fi before a demo.
- **The scanner is cautious on clean studio photos.** Head v2 was trained on real landfill photos, so it scores 79% on tidy TrashNet photos and asks for a tap more often. Real loads are the target.
- **Email limits.** Supabase's built-in email sender allows only a few emails an hour, so sign-up confirmations stop when the limit is hit. Add a custom sender before real users arrive.
- **Map tiles** come from OpenStreetMap's public servers, which is fine for a pilot. For a launch, use a tile provider or host tiles.
- **The seeded centres are demo centres.** Their prices are demo values, and the app says "Demo Centre" in their names.
- **Windows path length.** The repo path is long. If git says "Filename too long", set `core.longpaths` and shorten branch names.
- The GitHub SSH key is not set up. Use HTTPS.
- `npm run build` prints a warning that Next has no fallback metrics for one font. It is harmless.

## Rules

- One branch per feature, `feature/<area>-<short-name>`, and a pull request into `main`. Ask before merging.
- Money is whole cents and weight is whole grams. Convert only for display.
- Free, open-source models only in the product.
- No secrets in git, chat or documents.
- Anything shown as an example must say so.

## Who to ask

- **Product, scope and submission:** Sibusiso Khumalo (product owner).
- **Hackathon rules and the Sonke platform:** support@geekulcha.dev.

## Hackathon dates

- Hackathon: Fri 23 Oct 08:30 to Sun 25 Oct 17:00, virtual.
- Pitch video due: Sat 24 Oct.
- Final submission: Mon 26 Oct, 23:59.
