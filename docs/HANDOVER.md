# Handover

Read this first if you are picking the project up.

## What the project is

ComeCollectZA is a reclaimer-side app for South Africa's informal recyclers, built by team JBB for the FNB App of the Year Hackathon 2026. See [PLAN.md](PLAN.md) for the problem and scope, and [ARCHITECTURE.md](ARCHITECTURE.md) for the design.

## Where things stand (21 Oct 2026)

| Area | State | Notes |
|---|---|---|
| Screens (reclaimer, centre, PRO) | Done as shells | Run on demo data, labelled as such |
| Sell flow | Works in the browser | Estimate, keypad, code and QR. Does not save a sale |
| Money moment | Works | Count-up ends on the real amount |
| Design tokens and components | Done | Light and dark themes |
| Database schema and policies | Tested locally: 40 checks pass | Run on PostgreSQL 17 with PostGIS (PGlite) with stubbed Supabase auth. Not yet applied to a Supabase project |
| Seed data | Written | Demo centres and prices. Not yet run |
| Sales API | Validates | Returns 501 until storage is connected |
| Health route | Done | Does not check the database yet |
| Authentication | Not started | Demo accounts not created |
| Payouts and SAWPRS | Not started | Adapters are planned as mocks |
| AI models | Not started | See [MODELS.md](MODELS.md) |
| Deployment | Not started | Vercel project not created |
| Tests | Not started | Only typecheck and build run |
| CI | Not started | No automated checks on pull requests |
| Sonke submission | Team profile saved | SSDLC and Lean Business Canvas not started. Deck and video not started |

## Set up on a new machine

1. Install Node 24 LTS (20.9 or newer works).
2. Clone the repo over HTTPS: `git clone https://github.com/Sibusiso-K/ComeCollectZA.git`
3. `npm install`
4. `cp .env.example .env.local` and fill in the values. Ask the product owner for the Supabase and OpenRouter keys. Never commit them.
5. `npm run dev` and open http://localhost:3000.

## Connect Supabase

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
3. Run `supabase/seed.sql` once. Re-running it adds duplicate price rows.
4. Copy the project URL and anon key into `.env.local`. The service role key stays on the server and must never reach the browser.
5. Create demo auth users, then link them to `profiles`, `reclaimers` and `centres.operator_id`.

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

1. **`feature/supabase-schema`** (in progress): local tests pass (`npm run test:db`). Still to do: apply the migration and seed to a real Supabase project, then repeat the role checks there with real sign-ins. Needs the product owner to create the project or share access.
2. **`feature/reclaimer-prices`:** connect the home screen and the prices screen to the `prices` table.
3. **`feature/centre-sales-api`:** store sales in `POST /api/v1/centre/transactions`, with the idempotency key, the service fee and the audit row.
4. **`feature/sell-flow-save`:** save the sale from the reclaimer side and show the receipt.
5. **`feature/demo-accounts`:** create the three demo accounts and link them to their roles.
6. **`feature/recommendations`:** build the sell-or-wait and best-centre logic on cached forecasts.
7. **`feature/service-fees`:** fee tracker and the mock SAWPRS registration.
8. **`feature/pro-dashboard`:** connect the dashboard to `pro_material_summary`.
9. **`feature/ai-gateway`:** OpenRouter and Hugging Face calls with timeouts, caching and fallbacks.
10. **`feature/photo-upload`:** load photo upload, dHash duplicate check, material suggestion.
11. **`feature/nightly-jobs`:** GitHub Actions for forecasts and anomaly scores, plus the keep-alive ping.
12. **`feature/deploy`:** Vercel project, environment variables and a demo reset script.
13. **Stretch:** isiZulu voice input, the assistant, offline queue, PDF statement.

## Known issues

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
