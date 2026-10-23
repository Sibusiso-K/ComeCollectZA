# ComeCollectZA

Get paid fairly for every kilogram you collect.

ComeCollectZA is a reclaimer-side app for South Africa's informal recyclers. It shows where and when to sell, guides registration for the EPR service fee, records each sale, and builds a proof-of-work history that reclaimers can use. It plugs into the national registration system (SAWPRS) and the PRO Alliance's BBC 200 cashless rollout rather than competing with them.

Built by team JBB for the FNB App of the Year Hackathon 2026 (virtual, 23 to 25 October 2026). Challenge: Climate resilience and essential services.

## What works today

**Live app:** https://comecollectza.vercel.app

- **Scan a load.** The camera or a photo is read by a model that runs on the phone. Nothing is uploaded, and it works with no data after one download of about 38 MB. It spots mixed loads, and you can tap any part of the photo to see what it thought.
- **Prices.** Live board prices from each centre, per kilogram and per tonne, and the public 2026 ranges with their sources.
- **Sell.** Pick the centre, type the weight, and show your code as a QR for the centre to scan.
- **Accounts.** Email sign-up for reclaimers and for businesses. Each reclaimer gets one code. Eleven official languages, light and dark themes, and a first-time tour.
- **My money and impact.** Sales, service fees paid, owed and missing, kilograms kept from landfill, CO2e avoided, and work days paid. All of it is worked out from the person's own sales.
- **Electronics.** Old phones, laptops, TVs, fridges and batteries. A guide says what to do with each item and state, a finder lists shop bins, recyclers and municipal sites with their source and the date they were checked, and a board lets people sell, give away or ask for electronics, with a call or WhatsApp link shown only to signed-in people.
- **Marketplace.** A map of buy-back centres, buyers and sellers, with a list view. Reclaimers and businesses can post material for sale or a price they will pay.
- **Centre console.** A centre account sets its price board, looks up a code and records the weighed sale.
- **Programme dashboard.** Totals only: tonnes, impact, youth share, fees owed and a review queue.
- **Installable.** Works as an app on the home screen, and saved pages open with no signal.

## What is not done

- Recording a sale needs the server's service key, and centre and programme accounts are created by an administrator. See [docs/ADMIN.md](docs/ADMIN.md).
- No payouts and no SAWPRS link yet. The database has room for them.
- Sign-in is by email. Phone number sign-in needs an SMS service.
- Only English, Afrikaans, isiZulu and isiXhosa have translations, and they are drafts that need a first-language reader. The other seven languages show English.
- The scanner has not been tested on a real phone camera or on real loads. See [docs/MODELS.md](docs/MODELS.md) for the measured accuracy.
- The three seeded centres are demo centres with demo prices, until real centres post their own.

## Documentation

| Document | What it covers |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Problem, users, scope, schedule, judging criteria, risks |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, sell flow, data model, API contracts, security |
| [docs/MODELS.md](docs/MODELS.md) | AI and ML models, licences, free-tier limits, fallbacks |
| [docs/AGENTS.md](docs/AGENTS.md) | Roles of people and AI agents in the build |
| [docs/BUILD_LOG.md](docs/BUILD_LOG.md) | Dated record of decisions and work |
| [docs/HANDOVER.md](docs/HANDOVER.md) | How to pick the project up, open tasks, known issues |
| [docs/BUSINESS_MODEL.md](docs/BUSINESS_MODEL.md) | Revenue, value chain, taverns and bottle stores, trust levels, Lean Canvas |
| [docs/IMPACT.md](docs/IMPACT.md) | How CO2e, landfill diverted, work days and youth share are counted |
| [docs/SCORECARD.md](docs/SCORECARD.md) | Score against the seven judging criteria, with history |
| [docs/SECURITY.md](docs/SECURITY.md) | Security review against SCA, DAST, Penbot and SQL injection findings |
| [docs/PHONE_TEST.md](docs/PHONE_TEST.md) | Steps to test the app on a real phone |
| [docs/ADMIN.md](docs/ADMIN.md) | What the project owner must set up: service key, sign-in settings, centre and programme accounts |
| [docs/mockups/](docs/mockups) | The current UI mockup boards |

## Quick start

Requires Node 20.9 or newer. Node 24 LTS is recommended.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Fill `.env.local` with the project's Supabase URL and public key (see `.env.example`). The server-only service key is described in [docs/ADMIN.md](docs/ADMIN.md).

The first `npm run dev` or `npm run build` downloads the scanner model (24 MB, checked by SHA-256) into `public/`. It needs internet once.

Checks, which also run on every pull request:

```bash
npm run typecheck
npm run test:app   # money, fee and impact maths
npm run test:db    # row level security and the database functions
npm run build
```

## Try it on a phone

Open **https://comecollectza.vercel.app** in Chrome on Android or Safari on iPhone.

- **Install it.** Android: tap the browser menu, then Install app. iPhone: tap Share, then Add to Home Screen.
- **Scan a load.** Home is the scanner. Tap the camera, point it at a pile of cans, bottles, cardboard, paper or glass, and tap Scan this load. The scan runs on the phone and the photo is not uploaded. A mixed pile is called out so you can sort it first.
- **No data needed after the first scan.** The first scan downloads about 38 MB once, so use Wi-Fi. After that the scanner, the sell page and the prices page work in flight mode.
- **Check the steps in [docs/PHONE_TEST.md](docs/PHONE_TEST.md).**

## Repository layout

| Path | Contents |
|---|---|
| `app/` | Next.js routes: welcome, tour, sign in, home, sell, prices, market, money, impact, settings, assistant, centre, pro, and the sales API |
| `components/app/` | The app's shell, shared pieces, scanner, QR reader, map and assistant |
| `lib/app/` | Money and scan rules, Supabase data layer, sign-in, preferences, translations, summaries |
| `lib/vision/` | The on-device scanner (model, classifier head and result rules) |
| `lib/` | Contracts (zod), materials and sourced market prices, Supabase clients |
| `supabase/migrations/` | Database schema, row level security and functions |
| `supabase/seed.sql` | Demo centres and prices |
| `tools/vision/` | Scripts that trained and checked the on-device scanner |
| `tools/tests/` | Checks for the money, fee and impact maths |
| `docs/` | Plan, architecture, models, security, business model, impact, scorecard, admin guide, handover and mockups |

## Working in this repo

- `main` is the release branch. Work lands on it through pull requests.
- Create one branch per feature: `feature/<area>-<short-name>`, for example `feature/supabase-schema`, `feature/sell-flow` or `feature/ai-gateway`.
- Keep each pull request to one feature and link it to the matching item in [docs/HANDOVER.md](docs/HANDOVER.md).
- Commit messages start with a type: `feat:`, `fix:`, `docs:`, `chore:` or `test:`.

## Ground rules

- Free, open-source models only in the product. No paid model APIs. See [docs/MODELS.md](docs/MODELS.md).
- Money is stored as integer cents and weight as integer grams. Convert only for display.
- Every screen that uses demo data says so.
- No secrets in git. Environment values go in `.env.local`, which is ignored.

## Licence

Not yet decided. The team will choose a licence before any public release.
