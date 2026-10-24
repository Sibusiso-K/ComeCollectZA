# Pre-production and stress test, 24 Oct 2026

Run on the code in `main` at commit `cc1a4ac` (before the later documentation merges). The scripts are in `tools/stress/` and can be run again.

## Result

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
