# Security

Checked on 23 Oct 2026 against the SSDLC session's list of common findings (SCA, DAST, Penbot and SQL injection). Re-run the checks in the last section before each submission.

## Findings and status

| Finding (from the session) | Severity | What we found | Status |
|---|---|---|---|
| **SCA: Denial of service in a dependency** | High | `npm audit`: 0 vulnerabilities in 59 packages | Pass. CI now fails a pull request on any high or critical finding, and Dependabot opens weekly upgrade PRs |
| **SCA: Regular expression DoS** | High | No vulnerable regex libraries. Our own patterns (`lib/reclaimer-code.ts`) have no nested repeats and are length-capped before they run | Pass |
| **DAST: Cross-site scripting** | High | React escapes all output. No `dangerouslySetInnerHTML`, `innerHTML` or `eval`. Inputs are validated on the client and again on the server with zod. Scanned QR text is accepted only if it matches the reclaimer code pattern | Pass. A Content-Security-Policy now limits where scripts, data and frames can come from |
| **DAST: Weak ciphers** | Medium | `openssl s_client` against the live site: TLS 1.0 and 1.1 refused, TLS 1.2 uses ECDHE with AES-GCM, TLS 1.3 offered. HSTS is set for two years with preload | Pass (handled by Vercel) |
| **Penbot: not protected / no authentication on static files** | High | Static JS and images are public by design. A scan of the built bundles found no service-role key or secret. The only key in the browser is Supabase's publishable key, which is meant to be public, and every table is behind row level security. Anonymous REST reads of tables return nothing | Pass. Money and receipt data come only from signed-in, server-rendered pages and are never cached by the service worker |
| **SQL injection** | High | The app never builds SQL from strings. supabase-js sends parameters through PostgREST. All six database functions use static SQL (no `EXECUTE`), and each pins `search_path`. The sales route validates every field before calling `record_sale()` | Pass |
| **Least privilege** | n/a | Sales are written only by the server with the service role, after it checks the operator's session and centre. Policy helpers live in a private schema. Supabase advisors show only intended items: `board_prices()` is public on purpose, and `pro_material_summary()` checks the PRO role inside | Pass |

## Changes made in `feature/security-hardening`

- **Security headers** (`next.config.ts`): Content-Security-Policy, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (camera on this site only, no microphone or payment), `Cross-Origin-Opener-Policy`.
- **API responses** are `Cache-Control: no-store`, and cross-origin calls are allowed only from the app's own address.
- **Sales route input limits:** bodies over 4 KB are refused with 413. The Idempotency-Key must be 8 to 128 safe characters. The body schema is strict (unknown fields are refused), the reclaimer code must match the code pattern, and the price is capped. Validation errors return the field name, not the whole parser output.
- **QR scan:** a QR code that is not a ComeCollectZA reclaimer code (for example a link) is ignored with a message, so it never reaches the code field.
- **CI** (`.github/workflows/ci.yml`): `npm audit --audit-level=high`, typecheck, database policy tests and build on every pull request.
- **Dependabot** (`.github/dependabot.yml`): weekly npm and monthly Actions updates.

## Still open

- **Rate limiting** on the sales route and future upload routes. Plan: Vercel Firewall rate limit rules, plus a per-user counter in Postgres for uploads.
- **Script nonces.** The CSP still allows inline scripts because Next.js inlines its boot code. Nonces would make every page dynamic, which costs speed and data on slow phones. Revisit after the hackathon.
- **User verification.** See the trust design in [BUSINESS_MODEL.md](BUSINESS_MODEL.md). Phone OTP and centre vouching are not built yet.
- **A DAST scan** with OWASP ZAP baseline against the live site has not been run.

## How to re-check

```bash
npm audit --audit-level=high
npm run typecheck && npm run test:db && npm run build
grep -rlE "service_role|sb_secret|SUPABASE_SERVICE" .next/static   # must print nothing
curl -sI https://comecollectza.vercel.app/reclaimer                 # check the headers above
openssl s_client -connect comecollectza.vercel.app:443 -tls1_1      # must fail
```

## Changes with the MVP (23 Oct 2026, night)

| Area | What changed |
|---|---|
| Who can become what | The API no longer lets anyone register as an operator or PRO analyst. Only `reclaimer` and `business` are self-service. Administrators assign the rest in the dashboard. Found by review: the first version of the profile policy allowed `operator`. |
| New functions | `register_reclaimer`, `register_business`, `lookup_reclaimer`, `create_market_post`, `pro_overview` need a signed-in caller. `market_points` and `board_prices` are public on purpose. Each function that needs a role checks it inside. The Supabase advisor lists them as warnings. That is expected. |
| Location privacy | Post locations are snapped to about 250 m in the database. The exact point is never returned to other people. The form says so before posting. |
| Abuse limits | At most 20 open posts per person. Posts expire after 14 days. Text fields have length limits in the database. |
| Browser rules | The content security policy now allows map tiles from `tile.openstreetmap.org`, and nothing else new. Camera and location are allowed on this site only. |
| Sessions | Supabase sets the session cookie. The service key never reaches the browser. |
| Registration race | Two registrations for the same person at the same moment could loop until a timeout. Fixed in migration 0006. The client now shares one request. |
| iPhone | The status bar style is solid, so the header can never sit under the clock. |
| Personal data | Name, area and an age band, with consent in plain words at sign-up. The age band feeds only the programme's youth total. Programme screens show totals, never names. |

## Electronics (migration 0007)

| Area | What changed |
|---|---|
| Public places | `ewaste_points` is readable by everyone and writable by no API role. Only the dashboard or the service key can change it. |
| Phone numbers | A listing's number is stored in `ewaste_posts`, which only the owner can read. `ewaste_listings()` leaves it out. `ewaste_contact()` returns it to signed-in people only, and only for open listings. Anonymous callers cannot run it. |
| Listing limits | At most 10 open listings per person. They expire after 30 days. The number is checked in the database against a South African style pattern. |
| Location | Snapped to about 250 m in the database. The screens show only the area name. |
| Meeting people | The board shows a safety note: public place, daylight, test before paying, never share a PIN or one-time code. |

Still open: rate limits on the sales route, nonces for the content security policy, a DAST scan, and phone number verification.
