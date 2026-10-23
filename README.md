# ComeCollectZA

Get paid fairly for every kilogram you collect.

ComeCollectZA is a reclaimer-side app for South Africa's informal recyclers. It shows where and when to sell, guides registration for the EPR service fee, records each sale, and builds a proof-of-work history that reclaimers can use. It plugs into the national registration system (SAWPRS) and the PRO Alliance's BBC 200 cashless rollout rather than competing with them.

Built by team JBB for the FNB App of the Year Hackathon 2026 (virtual, 23 to 25 October 2026). Challenge: Climate resilience and essential services.

## Status

Scaffold. The screens run on demo data. The database schema and seed are applied to the `comecollectza` Supabase project, and the role checks pass. The sales API validates requests and returns 501 until storage is connected. See [docs/HANDOVER.md](docs/HANDOVER.md) for the full state.

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

## Quick start

Requires Node 20.9 or newer. Node 24 LTS is recommended.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The app redirects to the reclaimer home screen.

Checks:

```bash
npm run typecheck
npm run build
```

## Try it on a phone

Open **https://comecollectza.vercel.app/reclaimer** in Chrome on Android or Safari on iPhone.

- **Install it.** Android: tap the browser menu, then Install app. iPhone: tap Share, then Add to Home Screen.
- **Scan a load.** Open Sell, tap Open camera, point it at a pile of cans, bottles, cardboard, paper or glass, and tap Scan this load. The scan runs on the phone and the photo is not uploaded. A mixed pile is called out so you can sort it first.
- **No data needed after the first scan.** The first scan downloads about 38 MB once, so use Wi-Fi. After that the scanner, the sell page and the prices page work in flight mode.
- **Check the steps in [docs/PHONE_TEST.md](docs/PHONE_TEST.md).**

## Repository layout

| Path | Contents |
|---|---|
| `app/` | Next.js routes: reclaimer, centre console, PRO dashboard, API |
| `components/` | Shared UI components and the sell flow |
| `lib/` | Contracts (zod), materials, money formatting, demo data, Supabase clients |
| `supabase/migrations/` | Database schema, row level security and PRO aggregate function |
| `supabase/seed.sql` | Demo centres and prices |
| `tools/vision/` | Scripts that trained and checked the on-device scanner |
| `docs/` | Plan, architecture, models, agent roles, build log, handover, phone test steps |

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
