# Build log

Dated record of decisions and work. Newest entries go at the top.

## 23 Oct 2026 (hackathon day 1)

- **Live database:** migration 0004 (`record_sale`) applied to the live Supabase project and checked inside a rolled-back transaction. Pull requests #1 to #4 merged into `main`.
- **Deployed:** the app is on Vercel, linked to the GitHub repo, at https://comecollectza.vercel.app. The public Supabase settings are set as environment variables. A rebuild after setting them shows live prices.
- **Vision model chosen:** surveyed small image models for waste. Dropped MobileCLIP (Apple research-use weights) and hobby fine-tunes with no evidence. Chose TinyCLIP ViT-8M (MIT, 23 MB int8). Plain zero-shot matching gave 49% on held-out TrashNet photos. A 30 KB head trained on TrashNet features gave 82%, and 91% when 70% or more sure.
- **Test set problem found:** the first test set, from web searches, was mostly mislabelled. A contact sheet showed cars, trees and the same cardboard photos filed under other materials. Its numbers were set aside.
- **Scanner built** (`feature/vision-scan`, PR #6): camera or photo, on-device classification, suggestion with confidence, tap to confirm. Checked in the browser: five sample photos gave the expected suggestions in 130 to 250 ms, and confirming selects the material in the sell flow.
- **Installable app built** (`feature/pwa-install`, PR #5): manifest, generated icons, service worker. Checked: manifest valid, icons 200, service worker active, static cache created.
- **QR scanning built** (`feature/qr-scan`, PR #7): BarcodeDetector with a jsQR fallback. 18 of 18 decoder checks pass after fixing a bug in the test, which had painted white modules black. With the camera blocked, the scanner shows a clear message.
- **Merged and verified:** `main` passes a clean install, typecheck, build and 54 database checks. The live site shows live prices, the scanner, the scan button, the manifest and the icons.
- **Not tested:** a real phone camera, install on a phone, and the scanner on real loads.

## 21 Oct 2026

- **`feature/sell-receipts` (from the centre sales branch):** the reclaimer money screen reads the signed-in reclaimer's last ten sales and their service fees, using the same row level security the database tests cover. Without a signed-in user it shows labelled sample receipts. Typecheck and build pass. The page renders the samples and settles the money count-up on the right amount at phone width. The signed-in path is untested until reclaimer accounts exist.
- **`feature/centre-sales-api` (from the reclaimer prices branch):** migration 0004 adds `record_sale()`, which writes a sale, its fee, any anomaly row and the audit row in one transaction. It is idempotent, refuses a reused key with a different body, and is callable only by the service role. The route checks the operator's session, the centre and the board price before calling it. Local checks: 54 pass, including sale, replay, conflict, operator, flag and audit cases. Typecheck and build pass. The route returns 422 for missing keys and bad bodies, and 501 while the service key is unset. Not yet applied to the live project, and the operator sign-in path is untested.
- **`feature/reclaimer-prices` (from the schema branch):** migration 0003 adds `board_prices()`, which returns the latest price per centre and material to anonymous callers, with no operator ids. Applied live. A plain REST call with the publishable key returns 12 rows, and a direct read of `prices` returns none. The advisors now flag `board_prices()` as a security definer function that anonymous clients can call. That is intended: it returns only non-sensitive columns and cannot read the tables directly. The home, prices and sell screens now read these prices, and each one says whether the prices are live or sample. The sell estimate uses the live cans price: 6.4 kg gives R65.28. Typecheck, build, and 43 local checks pass. The sample fallback was not exercised in the browser.
- **Supabase project created:** `comecollectza` (ref `roiwontybdbhkuitffll`) in Sibusiso-K's Org, region eu-west-2, at $0 a month. Connected through the Supabase MCP.
- **Migration 0001 applied** through the MCP. The applied version also contained table grants that the repo file did not have, so 0002 repeats them.
- **Seed applied:** 3 demo centres, 12 prices, 7 materials.
- **Security advisors found** one ERROR (RLS off on PostGIS's `spatial_ref_sys`), warnings for PostGIS in `public`, and helper functions callable through the API by `anon`.
- **Migration 0002 applied:** PostGIS moved to the `extensions` schema, which needed a drop and recreate because PostGIS cannot change schema in place. Centre coordinates were preserved. Policy helpers moved to a private schema, and only `authenticated` can run them. Advisors now show one INFO (`audit_log` has no policies, which is intended) and one WARN (`pro_material_summary` is callable by signed-in users, which is intended because it checks the PRO role inside).
- **Local test found a real bug:** the PRO summary still called the helper by its old name after the move. Fixed in 0002 before the live apply.
- **Live role checks passed**, inside a transaction that was rolled back. Anon sees nothing, a reclaimer sees only their own sales, an operator sees only their centre, a PRO sees aggregates and anomalies but no individual sales, and a forged sale is refused. No test rows remain.
- **Local config:** `.env.local` holds the project URL and the publishable key. The service role key is not stored anywhere.
- **Not done:** the stokup and stoko projects were not deleted. The connected Supabase tools can pause projects but cannot delete them, and deletion must be done in the dashboard after confirmation.

- **`feature/supabase-schema` started.** Added `supabase/tests/rls.test.mjs` (`npm run test:db`). It applies the migration and seed to PostgreSQL 17 with PostGIS (PGlite) and stubs Supabase's auth schema. It checks row level security for anon, reclaimer, operator and PRO, plus the table constraints. All 40 checks pass.
- **Negative check:** with transactions readable by everyone, 3 checks fail, so the suite detects a broken policy.
- **Not done:** the migration has not been applied to a real Supabase project. That needs the product owner's account or access.
- Connected the local project to `Sibusiso-K/ComeCollectZA` (private). The remote `main` held only a README with the title. Local history was attached on top of it, and the README was replaced.
- The SSH key for GitHub is not set up on this machine. The remote uses HTTPS through the GitHub CLI credential helper.
- Set a repo-local git identity for this project only.
- Added this documentation: README, plan, architecture, models, agent roles, build log and handover.
- Branch convention set: `main` for releases, `feature/<area>-<short-name>` for work.

## 20 Oct 2026

- **Sonke team profile saved** as team JBB, project ComeCollectZA, challenge Climate resilience and essential services. The team had one member at this point.
- **Build plan published** as a private page. It covers architecture, data model, API contracts, AI and ML models, UI design, feasibility and a six-day schedule.
- **Free-tier limits checked** for OpenRouter, Hugging Face ZeroGPU and Supabase. Non-commercial speech and translation models excluded.
- **Scaffold written:** Next.js 16.4.2 app with reclaimer, centre and PRO screens on demo data, design tokens, shared components, Supabase schema with row level security, demo seed, health route and sales route.
- **Node 24.20.0 installed** with winget. Dependencies installed with 59 packages and no vulnerabilities.
- **Verified:** typecheck passes. The production build compiles and prerenders all routes. A local server returns 200 for each screen and the health route. The sales route returns 501 for a valid request and 422 for an invalid one.
- **Fixed:** the money screen showed R0.00 at rest in hidden tabs. A timer now always shows the final amount.
- **Sell flow tested:** 6.4 kg of cans gives an estimate of R65.28, and the code and QR appear.
- **Known:** two build warnings about font fallback metrics. They are harmless.

## 19 Oct 2026

- **Final idea chosen:** Kasi Cycle, a waste-picker traceability and payments app. Renamed **ComeCollectZA** the same day.
- **Positioning changed:** the app serves reclaimers and plugs into SAWPRS and the PRO Alliance's BBC 200 cashless rollout. It does not compete with them on payments or traceability.
- **Models decided:** free, open-source models only. No Claude APIs in the product.

## 18 Oct 2026

- **Hackathon research:** challenge, judging criteria, judges, sponsor needs and FNB's direction recorded from the official site, Sonke and public news.
- **Idea rounds:** eight rounds of brainstorming, narrowed each round by the product owner.
- **Scoring:** the shortlist was scored against the seven judging criteria (out of 70) and against technical and business feasibility (out of 20).
- **Calendar:** six hackathon events added to the product owner's Google Calendar, covering team profile deadline, event, pitch video, war rooms and final submission.
- **Related repo:** the SONAR hackathon tracker was updated with confirmed FNB dates in pull request [#18](https://github.com/Sibusiso-K/SONAR/pull/18).

## Key dates

| Date | Event |
|---|---|
| Tue 20 Oct | Create or profile team on Sonke (done) |
| Fri 23 Oct, 08:30 to Sun 25 Oct, 17:00 | Hackathon, virtual. Kickoff livestream 10:00 |
| Sat 24 Oct | 20-second pitch video due. War rooms 14:00 to 17:00 |
| Mon 26 Oct, 23:59 | Final submission on Sonke |
