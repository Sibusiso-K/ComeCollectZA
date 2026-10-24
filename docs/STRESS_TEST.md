# Pre-production and stress test, 24 Oct 2026

Two passes. The morning pass ran on the code in `main` at commit `cc1a4ac`. The afternoon pass, first below, tested every feature, ran photos through the scanner inside the real app, and checked the live database against what the app expects. The scripts are in `tools/stress/` and can be run again.

## Afternoon pass: every feature, the scanner in the real app, and the database

### What was found and fixed

| # | Found | How | Fixed |
|---|---|---|---|
| 1 | **Signed-in people could rewrite columns of their own rows that the app never writes**: a post's expiry, date and place (outside South Africa), a reclaimer's payment code and consent time, a price's date (a price dated 2099 would stay the board price and the sale check for good), a centre's place, a flag's reasons | Compared every grant and policy on the live database with every call the app makes | Migration 0010 lets each role write only the columns the app writes, and caps prices at R1,000 a kg. Four new database checks try each write. Applied to the live project on 24 Oct with the owner's go-ahead, then checked there: each role can write only those columns, anonymous visitors none, and the public lists still load. Details in [SECURITY.md](SECURITY.md) |
| 2 | **The database tests could not see a revoke**: they granted table access after running the migrations | Reading the test setup while writing the checks for #1 | The tests now set Supabase's default grants first, like a real project (78 checks) |
| 3 | **A scan froze the screen for its whole length**, about 1.2 s on a laptop (median, up to 2.1 s), so several seconds on a cheap phone. The five passes of the model ran as one task | Measured the longest task per scan in the browser | The scanner gives the screen a turn between passes. Longest freeze: median 115 ms, worst 840 ms |
| 4 | **No way out while the scanner downloads or works.** On a slow connection the first scan downloads about 38 MB with no Cancel | Reading the scanner while testing | A Cancel button while it works. A cancelled scan's late result is ignored, and scans queue so two never share the model. Tested: cancelled mid-scan, the screen stayed put, the next photo got its own result |
| 5 | **An all-black photo read "Looks like Plastic"**, with confidence (a covered lens, a dark room) | Odd files fed to the scanner | Photos that are almost uniform, or near-black with no detail, now get "The photo is too dark or blank. Try again with more light." None of 10,653 real test photos is refused by the check |
| 6 | Prices over R1,000 a kg were accepted on the price board | Part of #1 | The form says "Prices go up to R1,000 a kg" before saving, and the database refuses it too |

### The scanner in the real app

144 photos, one after another, in one browser session on the `/home` screen, with `tools/stress/scan-app.mjs`: 55 held-out household and street photos (TrashBusters test split), 40 electronics (30 from the Kaggle test split, 10 from Commons), 36 real-world photos, and 13 odd files.

| Check | Result |
|---|---|
| Crashes, stuck scans, console errors | None from the app. The first run's 13 "file not found" errors came from the test folder's path being too long for Windows, and those files were rerun from a short path |
| Memory over 144 scans | Flat (renderer 330 to 370 MB after warm-up, JavaScript heap 8 MB) |
| Speed | First scan 2 to 3 s (loads the model). After that 0.5 to 2 s on this laptop, with no slowdown over the session |
| Electronics | 90% "Looks like electronics", 3% asked, 5% not sure, 3% wrong |
| Odd files | WebP, GIF, BMP, grey, see-through PNG and an 8,000 by 6,000 photo all scan. Broken, empty, text, SVG, 1 by 1 and 3-pixel-thin files get "Pick the material yourself". Black and blank photos get the new message. The next real photo always worked |

**Recycling photos are the weak spot, and it is the model, not the app.** Of the 91 recycling and "other" photos, 41% got a confident right answer, 22% a confident wrong one, 18% a question or a mixed-load answer, and 20% "Not sure". To check the app was not the cause, 120 held-out photos were embedded in a real browser the way the app does it and compared with the training pipeline:

| Path | Top guess right | 70%+ sure and right | 70%+ sure and wrong |
|---|---|---|---|
| Training pipeline (Node) | 75.0% | 64.2% | 12.5% |
| The app's own path (browser, original photos) | 74.2% | 60.8% | 12.5% |
| The app's own path, photos enlarged to 4,000 px like a phone camera | 72.5% | 60.8% | 12.5% |

The two runtimes agree (cosine 0.99), so the head sees in the app what it was trained on. Smoother resizing ("high" canvas quality) made no consistent difference and was not added.

**A choice for the team:** the scanner says "Looks like X" at 70% sure. On the 8,433 held-out photos that answer is wrong 16.6% of the time. At 85% it would be wrong 11.6% of the time, but it would ask the person to tap the material for 35% of photos instead of 19%. Not changed: it trades trust against taps, and v6 (PR 37) may move both numbers.

### Every screen and backend function

- **Screens:** 36 screenshots across welcome, tour, sign-up, home, scanner, sell, prices, market, posting, money, impact, settings, assistant, centre console, programme dashboard, the three electronics tabs and light mode, with example signed-in data. No page errors.
- **App to database:** every table, column and function the app calls exists live with matching argument names (13 functions, 58 columns).
- **Database functions:** all 13 run in the 78 database checks against the real migrations.
- **Pre-production probes:** 81 of 82 pass, as in the morning. The one miss is HSTS on a local build, which Vercel adds.
- **Load:** no errors at any stage, including a 200-user spike, and instant recovery. Throughput was about 300 pages a second, against 1,400 in the morning, because the laptop was on battery: even the one-line health route fell by the same amount. The pages are still served as static files.
- **Lint:** the repo has no linter set up. A one-off run of the Next.js rules found 11 notes and no bugs: 9 are React performance hints (setting state inside an effect), and the other 2 are patterns that only matter with the React Compiler, which is off.

### Not done in this pass

- No real phone. The freeze fix is measured on a laptop. A cheap phone will be slower per pass, but it can now respond between passes.
- The model itself was not changed. See [MODELS.md](MODELS.md) and PR 37.

## Morning pass: result

**No blocking problem found.** 81 of 82 probe checks pass, and the one that does not is the local HSTS header, which Vercel adds in production (it was seen live as `max-age=63072000; includeSubDomains; preload`). The app served 1,400 pages a second on one laptop with no errors, and a sudden jump to 200 users at once raised response times but caused no failures and recovered at once.

**What was not tested, and why, is listed at the end.** Read that before relying on these numbers.

## 1. Pre-production checks

| Check | Result |
|---|---|
| Typecheck | Passes |
| Build | Passes |
| Database tests | 74 of 74 pass (PostgreSQL 17 with PostGIS) |
| App tests | 14 of 14 pass |
| `npm audit` on production dependencies | 0 vulnerabilities |
| Security headers | Content security policy (own site, own Supabase, map tiles only), no framing, no objects, https upgrades, `nosniff`, referrer policy, permissions policy (camera and location for our own site only), HSTS on Vercel, no framework version announced |

## 2. Live security probes (anonymous visitor)

Run against the live Supabase project with the public key, before Vercel's checkpoint began challenging this machine.

| Probe | Result |
|---|---|
| Read profiles, reclaimers, transactions, fees, payouts, anomalies, audit log, load photos, material posts, electronics listings, forecasts | Refused, or no rows, for all 11 tables |
| Call lookup, programme totals, register, create posts, electronics contact, SAWPRS status, record a sale | Refused (HTTP 401) for all 9 functions |
| Public prices, map points, electronics listings, electronics places | Work. The listings never include a phone number |
| Add or edit an electronics place, or insert a price, as anonymous | Refused, and no rows changed |
| Service-role key in the browser code (10 scripts, 893 KB scanned) | None. The key in the browser is the public key |
| `/.env`, `/.env.local`, `/.git/config`, `/package.json`, `/supabase/seed.sql` | Not served (404) |

## 3. The sales route

| Request | Answer |
|---|---|
| No Idempotency-Key | 422 |
| Key shorter than 8 characters | 422 |
| Valid body, no login | 401 live (501 locally, which has no server key) |
| Fake login, or the public key as a login | Refused |
| Broken JSON, negative weight, a fraction, an extra field | 422 each |
| Body over 4 KB | 413 |
| Oversized key | 422, no crash |
| GET | 405 |

## 4. Smoke test

All 21 routes and files answer 200 locally (every screen, the install manifest, the service worker, the icons, the scanner head, the health route and a photo). An unknown page gives a proper 404. The install manifest has a name, icons and a start page. The service worker saves the main screens. The scanner head is a valid 7-group model, version 5.

## 5. Load test

One laptop running a production build of the app, with the test running on the same machine, so both compete for the same processor. Real hosting will differ.

| Test | Workers | Requests | Per second | Median | 95th percentile | Errors |
|---|---|---|---|---|---|---|
| Pages (mixed) | 10 | 15,082 | 1,005 | 9 ms | 19 ms | 0 |
| Pages (mixed) | 25 | 19,418 | 1,293 | 18 ms | 31 ms | 0 |
| Pages (mixed) | 50 | 21,291 | 1,418 | 34 ms | 49 ms | 0 |
| Pages (mixed) | 100 | 21,431 | 1,424 | 68 ms | 90 ms | 0 |
| Health route (runs code) | 50 | 11,641 | 1,153 | 35 ms | 81 ms | 0 |
| Scanner head (34 KB) | 50 | 6,123 | 609 | 81 ms | 97 ms | 0 |
| Sales route, bad body | 50 | 7,023 | 698 | 67 ms | 97 ms | 0 (all 422) |
| **Spike, 200 at once** | 200 | 6,292 | 774 | 252 ms | 316 ms | 0 |
| Recovery after the spike | 10 | 5,794 | 722 | 13 ms | 20 ms | 0 |

The app reached its limit at about 1,400 requests a second, after which more users only meant longer waits, not failures. For the hackathon and a pilot of a few hundred people that is far more than needed.

**Database (live Supabase, free tier, gentle on purpose):**

| Workers | Requests | Per second | Median | 95th percentile | Errors |
|---|---|---|---|---|---|
| 5 | 178 | 18 | 203 ms | 577 ms | 0 |
| 10 | 497 | 49 | 192 ms | 228 ms | 0 |
| 20 | 1,010 | 97 | 190 ms | 213 ms | 0 |
| Electronics places, 10 | 418 | 51 | 191 ms | 209 ms | 0 |

The first few requests to a quiet database were slower (up to 1.7 s at the 99th percentile), which looks like a cold start. After that, responses held steady near 200 ms.

## 6. What Vercel did, and what it means

About 100 quick requests from this machine made Vercel's own bot protection show a security checkpoint (HTTP 403, `X-Vercel-Mitigated: challenge`) for this machine's address. No setting of ours caused it: the project has no custom firewall rules and attack mode is off. Normal browsers pass this check without the visitor seeing it, so judges using the app as usual should not be affected. A judge running a fast automated scan from one address might be.

I did not try to get around the checkpoint. That is also why the live site could not be load-tested from here.

## Not tested

- **The live site under load.** Blocked as above. The local numbers show the app's code, not Vercel's hosting.
- **Writes under load.** Recording sales needs the server key and real operator accounts. The database tests prove one sale per key and one payout per sale, but not 100 centres selling at once.
- **Sign-up and email.** Supabase allows 30 emails an hour with our sender, and the test sender reaches only the team's own address.
- **A cheap phone.** The scanner's first download and its speed on a low-end phone are unmeasured.
- **A dynamic security scan** (DAST) and rate limits of our own, which are listed as open in the security notes.
- **The map tiles** come from OpenStreetMap, which has its own usage rules. At pilot size this is fine, but a launch would need a tile provider.

## Recommendations

1. Re-run `node tools/stress/preprod.mjs https://comecollectza.vercel.app <env file>` from a different network once the checkpoint has cleared, to repeat the live checks.
2. Add per-user rate limits to the sales route and the post functions before real use.
3. Before launch, test writes with several operators at once, on a staging project.
4. Use a tile provider with a proper plan once there are real users.
