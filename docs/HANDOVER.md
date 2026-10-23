# Handover

Read this first if you are picking the project up.

## What the project is

ComeCollectZA is a reclaimer-side app for South Africa's informal recyclers, built by team JBB for the FNB App of the Year Hackathon 2026. See [PLAN.md](PLAN.md) for the problem and scope, and [ARCHITECTURE.md](ARCHITECTURE.md) for the design.

## Where things stand (23 Oct 2026)

| Area | State | Notes |
|---|---|---|
| Reclaimer home, prices and sell estimate | Live board prices | Read through `board_prices()`. Sample prices are shown, and labelled, if the database cannot be reached |
| Reclaimer money screen | Signed-in receipts, with a labelled sample fallback | Reads the reclaimer's own transactions and fees under row level security. Shows sample receipts until someone signs in |
| Centre and PRO screens | Done as shells | Run on demo data, labelled as such |
| Sell flow | Works in the browser | Estimate, keypad, code and QR. Does not save a sale |
| Money moment | Works | Count-up ends on the real amount |
| Design tokens and components | Done | Light and dark themes |
| Database schema and policies | Applied to Supabase project `comecollectza` (ref `roiwontybdbhkuitffll`, eu-west-2) | Migrations 0001 and 0002 applied. 40 local checks pass. Role checks pass on the live project |
| Seed data | Applied | 3 demo centres, 12 prices, 7 materials |
| Sales API | Records sales through `record_sale()` (migration 0004), with session and price checks | Returns 501 until `SUPABASE_SERVICE_ROLE_KEY` is set and migration 0004 is applied to the live project |
| Health route | Done | Does not check the database yet |
| Authentication | Not started | Demo accounts not created |
| Payouts and SAWPRS | Not started | Adapters are planned as mocks |
| On-device material scanner | Built and deployed | Camera or photo, suggestion with confidence, tap to confirm. 82% on held-out TrashNet photos, 93% with quarter agreement. Not yet tested on a real phone camera or real loads. See [MODELS.md](MODELS.md) |
| Offline scanner | Built, in PR #10 | Model and runtime served by the app and kept by the service worker. Scans with no data after one 38 MB download. Verified with the server stopped |
| Mixed loads | Built, in PR #11 | Whole photo plus four quarters. 8% false alarms, both materials found in 64% of mixed mosaics |
| Prices per tonne | Built, in PR #12 | R/t on the board and sourced 2026 market ranges. HDPE and paper added to the live board. Service fee set to the agreed 15c/kg |
| Impact | Built, in PR #13 | CO2e (EPA WARM v16), landfill diverted, work days at minimum wage, youth share (example until an age band is collected). See [IMPACT.md](IMPACT.md) |
| Security hardening | Built, in PR #9 | Headers, API input limits, QR validation, CI with npm audit, Dependabot. See [SECURITY.md](SECURITY.md) |
| Business model, trust levels, marketplace | Designed | See [BUSINESS_MODEL.md](BUSINESS_MODEL.md). Pickup listings, marketplace, phone PIN and business checks are not built |
| Score against judging criteria | 42 / 70 | See [SCORECARD.md](SCORECARD.md) |
| Installable app (PWA) | Built and deployed | Manifest, icons and service worker. Checked in a desktop browser. Install on a phone is untested, see [PHONE_TEST.md](PHONE_TEST.md) |
| QR scan at the centre | Built and deployed | Fills the reclaimer code field. Looking up the reclaimer is not wired to the sales route yet |
| Forecasts, speech and assistant models | Not started | See [MODELS.md](MODELS.md) |
| Live site | https://comecollectza.vercel.app | Deployed from `main` on every merge |
| Tests | 54 database checks, vision tests | `npm run test:db`; scanner tests in `tools/vision/` |
| CI | Added in PR #9 | npm audit, typecheck, database checks and build on every pull request |
| Sonke submission | Team profile saved | SSDLC and Lean Business Canvas not started. Deck and video not started |

## Set up on a new machine

1. Install Node 24 LTS (20.9 or newer works).
2. Clone the repo over HTTPS: `git clone https://github.com/Sibusiso-K/ComeCollectZA.git`
3. `npm install`
4. `cp .env.example .env.local` and fill in the values. Ask the product owner for the Supabase and OpenRouter keys. Never commit them.
5. `npm run dev` and open http://localhost:3000.

## Supabase

The project `comecollectza` (ref `roiwontybdbhkuitffll`, region eu-west-2, organisation Sibusiso-K's Org) already has both migrations and the seed applied, in this order:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_harden_helpers.sql`
3. `supabase/seed.sql`

Do not run the seed again. It adds duplicate price rows.

To set up a fresh project, run the three files in that order in the SQL editor. Then copy the project URL and the publishable key into `.env.local`. The service role key stays on the server and must never reach the browser.

Demo auth users are not created yet. Create them, then link them to `profiles`, `reclaimers` and `centres.operator_id`.

## Checks before asking for review

```bash
npm run typecheck
npm run build
npm run test:db
```

`npm run test:db` applies the migration and seed to an in-process PostgreSQL 17 with PostGIS, then checks row level security for each role (anon, reclaimer, operator, PRO) and the table constraints. It stubs Supabase's `auth` schema and `auth.uid()`. It does not replace a check against a real Supabase project.

Then start the built app with `npm run start` and check the routes. Check the screens at phone width (375 px) for horizontal scrolling.

## Open tasks in priority order

Work each item on its own branch. See the branch convention in the README.

1. **`feature/supabase-schema`** (nearly done): migrations and seed are live, and the local and live role checks pass. Still to do: create demo auth users and repeat the role checks with real sign-ins.
2. **`feature/reclaimer-prices`** (done, not yet merged): the home, prices and sell screens read live board prices. Still to do: the centre console should write prices through the API once the sales route is built.
3. **`feature/centre-sales-api`** (built, not yet merged or live): `POST /api/v1/centre/transactions` checks the operator's session, the centre and the board price, then calls `record_sale()`. Still to do: apply migration 0004 to the live project, set `SUPABASE_SERVICE_ROLE_KEY` on the server, and test a real operator sign-in end to end.
4. **`feature/sell-receipts`** (built, not yet merged): the reclaimer money screen shows their last ten sales, each with its service fee and status, and totals for the fees. It shows sample receipts until someone signs in. Still to do: sign-in for reclaimers, and a live update when a centre records a sale.
5. **`feature/demo-accounts`:** create the three demo accounts and link them to their roles.
6. **`feature/recommendations`:** build the sell-or-wait and best-centre logic on cached forecasts.
7. **`feature/service-fees`:** fee tracker and the mock SAWPRS registration.
8. **`feature/pro-dashboard`:** connect the dashboard to `pro_material_summary`.
9. **`feature/ai-gateway`:** OpenRouter and Hugging Face calls with timeouts, caching and fallbacks.
10. **`feature/photo-upload`:** load photo upload, dHash duplicate check, material suggestion.
11. **`feature/nightly-jobs`:** GitHub Actions for forecasts and anomaly scores, plus the keep-alive ping.
12. **`feature/pickups`:** pickup listings for taverns and bottle stores, claim by a nearby reclaimer, QR handshake. See [BUSINESS_MODEL.md](BUSINESS_MODEL.md).
13. **`feature/verification`:** phone PIN sign-in, seen-in-person check at the centre, age band at registration, business checks.
14. **`feature/marketplace`:** wanted prices per tonne from buyers and business lots for sale.
15. **`feature/offline-queue`:** queue sales and pickup claims offline and send them later.
16. **Stretch:** isiZulu voice input, the assistant, PDF statement.

## Known issues

- **First scan needs a signal.** The first time the scanner opens, the phone downloads about 38 MB (model and runtime) from the app itself. After that it works with no data. Open the scanner once on Wi-Fi before demoing.
- **Five passes per scan.** Mixed-load detection runs the model five times, about 2 seconds in a desktop browser. A cheap phone may take longer. Time it during the phone test.
- **Builds download the model.** `npm run build` and `npm run dev` fetch the model from Hugging Face the first time (checked by SHA-256). The build machine needs internet access.
- **The scanner is trained on clean photos.** Real loads will score lower than the 82% measured on TrashNet. The app asks for a tap every time, so a wrong guess costs one tap, not a wrong sale.
- **Camera access needs HTTPS and a tap on Allow.** It works on the live site. It will not work from a plain `http://` address other than localhost.
- **Reclaimer lookup from a scanned code is not wired up.** The code lands in the field, and the Find reclaimer button is still disabled.

- The GitHub SSH key is not configured on the current machine. Use HTTPS, or add a key before pushing over SSH.
- `npm run build` prints two warnings that Next has no fallback metrics for the Atkinson Hyperlegible fonts. They are harmless.
- The fonts load from Google at build time, so the build needs internet access.
- Next.js rewrites `tsconfig.json` on build. The changes it makes are expected.
- Screenshot checks were limited. Phone-width layout was checked by script and by one screenshot of the sell screen.
- The sales route accepts a request and returns 501. It does not record anything.

## Rules

- Work on feature branches. Ask before any push to `main`.
- Keep money in integer cents and weight in integer grams.
- Use only free, open-source models in the product.
- Label every demo value as demo data.
- No secrets in git.

## Who to ask

- **Product, scope and submission:** Sibusiso Khumalo (product owner).
- **Hackathon rules and Sonke platform:** support@geekulcha.dev (support address from the Sonke guidelines).

## Hackathon dates

- Hackathon: Fri 23 Oct 08:30 to Sun 25 Oct 17:00, virtual.
- Pitch video due: Sat 24 Oct.
- Final submission: Mon 26 Oct, 23:59.
- Mentors are available only during the hackathon weekend.
