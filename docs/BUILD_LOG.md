# Build log

Dated record of decisions and work. Newest entries go at the top.

## 24 Oct 2026 (hackathon day 2)

- **Payouts and SAWPRS, as a demo.** Every recorded sale now queues a payout for the full amount on a mock rail. It is marked sent and no money moves, and the app says so on every screen that shows it. Operators can record a reclaimer's SAWPRS status by hand, and the programme dashboard counts the registered ones. Migration 0008, applied live. 74 database checks pass.
- **A hole found by writing the test.** A reclaimer can update their own row, so they could have marked themselves SAWPRS-registered. A trigger now rejects that, and a test tries it.
- **Not done:** a real payout rail and a live SAWPRS check. Both need outside access: a payment partner with credentials, and the registry's data.

## 23 Oct 2026, late night (hackathon day 1)

- **Admin steps.** Supabase Site URL changed from localhost to the live site, with a redirect URL, so confirmation emails stop landing on a dead page. The first real account was promoted to centre operator and linked to the Orlando East demo centre. The Vercel server key is set and the sales route now checks logins.
- **Scanner version 3.** The head learned a seventh group, electronics, from 1,391 openly licensed Wikimedia Commons photos. A contact sheet check showed the "pile of e-waste" searches returned cityscapes, fields and bins, so those 144 photos were dropped. Results are in [MODELS.md](MODELS.md): 98.2% of held-out electronics photos found, 97.0% when whole kinds of item were held out, 0.2% of recyclables wrongly called electronics, and no loss on the recycling groups (81.4% on real photos, was 81.7%). The clean Commons style may flatter these numbers, and big appliances are barely covered.
- **In the app.** When the scanner sees electronics it says they are not paid for by the kilogram and links to the electronics guide. Electronics never count towards a mixed load. Checked in headless Chrome on four electronics photos and one cardboard photo.
- **Credits.** Every training photo's author, licence and page is in [ELECTRONICS_PHOTO_CREDITS.md](ELECTRONICS_PHOTO_CREDITS.md).
- **Re-scored** to 48 of 70.

## 23 Oct 2026, late (hackathon day 1)

The product owner has old electronics and does not know where to sell them or take them. The app now covers that too.

- **Research.** South Africa has had extended producer responsibility rules for electrical and electronic equipment since November 2021. eWASA and the E-Waste Recycling Authority are the producer bodies. Makro and Pick n Pay run drop-off bins, Desco and EWaste Africa are certified recyclers, and Pikitup started an e-waste programme with reclaimers at Marie Louise in Soweto in December 2024. Most sources are 2024 and 2025 news pages, so no address or opening hour could be confirmed.
- **Honest data.** Eight places are seeded, each with a source link, a check date and a confidence of confirmed, listed or unsure. The app says "Check first" on weak ones and tells people to phone before they travel. A scrap price of "R20 to R200 per kg for mixed e-waste" from earlier notes could not be traced to a source, so it was left out. The guide gives no Rand figures it cannot source.
- **Schema, applied live** (migrations 0006 and 0007): the registration race fix, `ewaste_points`, `ewaste_posts`, `ewaste_listings()` and `ewaste_contact()`. 71 database checks pass.
- **App.** A new Electronics screen with three tabs: what to do, drop-off, and sell or give. The guide orders reuse, then repair, then recycling, with care notes for data, batteries, screens and lamps. Phone trade-in offers link to Cell C, iStore and Cellucity. The board shows a safety note, and the poster's number is shown only to signed-in people, as a call or WhatsApp link.
- **Not done:** listings on the map, a report button, translations of the advice texts (headings and labels are drafted in Afrikaans, isiZulu and isiXhosa), and any visit to the seeded places.

## 23 Oct 2026, night (hackathon day 1)

New direction from the product owner: match the Digital Agriculture mockup (font and theme), a first-time tour, the scanner on the home screen and interactive, Soweto overview photos, a simple logo, a marketplace map, and a real app instead of a demo. Plus a UI mockup at the end.

- **Lovable.** The one-shot prompt produced a skeleton: shell, welcome screen, logic, translations. It stopped with build errors and the free plan ran out of credits. Its source (TanStack Start) was read through the Lovable connector and the useful parts were ported into the Next.js app. It had also invented source names for the price ranges ("PETCO, Feb 2026" and others that were never in the research). Those were replaced with the real, linked sources.
- **Restyle.** Manrope as the one typeface, frosted glass cards over Soweto photos, deep forest green in dark mode and a pale leaf wash in light mode, the red-to-green gauge from the reference, and a range bar on prices.
- **Logo.** A "C" that cups a coin, with a leaf. One SVG makes the app icons, the favicon and the header mark.
- **Photos.** Five overview photos of Soweto from Wikimedia Commons under open licences, compressed to 60 to 100 KB each. One had an aircraft wing in the corner and was cropped. Credits are in the app and in `public/images/soweto/CREDITS.md`.
- **Home is the scanner.** A shutter, a viewfinder with a sweeping line, and after a scan the photo is split into four tappable parts that show what the model thought.
- **First-time tour.** Five slides after sign-in, replayable from Settings.
- **Real data.** Every screen reads Supabase. The demo data module was deleted. A made-up "today's score" became a real measure: the share of service fees paid.
- **Schema, applied live** (migrations 0005 and 0006): one-call registration, age band, business role, marketplace posts, a map function, operator code lookup and programme totals. 63 database checks pass.
- **A race found in review.** Two registrations for the same person at once could loop until a timeout, and the client could lose a good profile. Fixed in the database (0006) and the client.
- **Marketplace.** A Leaflet map on OpenStreetMap tiles with one pin per centre, a list view that works offline, filters by area, buyers, sellers and material, and a post form with location only on request.
- **Mockup, and what it found.** Screens were captured in a headless Chrome at 375 by 812 at 2x, with example data on signed-in screens. Reading the captures found real bugs: the impact chart drew no bars, the content security policy blocked map tiles (the wildcard does not match the bare host), the centre price inputs overlapped their labels, and a missing favicon. All fixed.
- **Not done:** payouts, the SAWPRS check, phone sign-in, a way to contact a poster, an offline write queue. Nothing was tested on a real phone.

## 23 Oct 2026, afternoon and evening (hackathon day 1)

New notes from the product owner: tell recyclables and combinations apart, serve taverns and bottle stores, add a marketplace and the chain of flow, track environmental and youth employment impact over time, use accurate prices per tonne, keep the model on the phone with no data, verify users, score against the Sonke criteria, write the business model, and review security against the SSDLC session slides.

- **Security review** (PR #9): 0 npm audit findings, TLS 1.0 and 1.1 refused on the live site, no secrets in client bundles, no dynamic SQL in any database function, all functions pin `search_path`. Added a Content-Security-Policy and other headers, no-store and own-origin CORS on the API, a 4 KB body limit, strict body schema, idempotency key and reclaimer code patterns, rejection of foreign QR codes, CI with npm audit, and Dependabot. The first CSP broke the scanner (onnxruntime loads code from a blob: URL); found in the browser and fixed before commit.
- **Offline scanner** (PR #10): the model (pinned, SHA-256 checked) and the 14 MB runtime are now served by the app, and the tokenizer is no longer needed. The service worker saves the reclaimer pages and their scripts at install. Found and fixed: on a first visit the page's scripts were never cached, so it would not open offline. Verified with the server stopped: the sell page opened and scanned cardboard at 100% in 714 ms, and the prices page opened. The worker now revalidates pages online so a new deploy shows at once.
- **Mixed loads** (PR #11): five passes per scan. Built a test on 2x2 mosaics of held-out photos. The first run gave nonsense (18% on single photos) because the mosaic had an alpha channel; a sanity check caught it. Compared four rules and chose 70% and 85%: 8% false alarms, both materials found in 64% of mixed loads. Added a quarter-agreement rule: single-load accuracy 89% to 93%.
- **Prices per tonne** (PR #12): sourced 2026 ranges (Sunday Times Sep 2026, ScanWorth Apr 2026, scrap yard rate cards Aug 2026, IdeaSpots Aug 2026, Money4Glass). PET fell from about R7/kg to R3.50/kg during 2026. HDPE and paper added to the live board. The service fee placeholder of 25c/kg replaced by the agreed 15c/kg.
- **Impact** (PR #13): CO2e factors from EPA WARM v16 tables, extracted from the PDF, minimum wage R30.23 an hour. Checked by hand against the PRO example.
- **Business model, impact method and scorecard** written: reclaimers never pay; revenue from PROs (R50 per verified tonne) and buyers (2% of sale value); about R220 a month per active reclaimer. Score 42 of 70.
- **Not done:** pickup listings, marketplace, phone sign-in and business checks are designed only. Nothing was tested on a real phone. The youth share is an example figure.

## 23 Oct 2026, morning (hackathon day 1)

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
