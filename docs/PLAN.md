# Product plan

## Problem

South Africa's recycling system depends on an estimated 60,000 to 90,000 reclaimers. In 2017 they recovered about half (51%) of all post-consumer paper and packaging, and their work was estimated to save municipalities R309 to R749 million in landfill space (2014 estimate). Reclaimers are paid by weight, in cash, with no record of what they sold or what the market paid. In 2026, reclaimers reported PET falling from about R7/kg to R3.50/kg within months, and aluminium cans from about R14/kg to about R10/kg. Buy-back centre prices are not regulated.

Producer responsibility rules (EPR) require producers to pay registered reclaimers a service fee. The PRO Alliance's BBC 200 project targets about 200 buy-back centres and 80,000 reclaimers on cashless, auditable payments by the end of 2026. Registration is lagging: the July 2026 phase 1 targets 10,000 reclaimers. Those systems serve buy-back centres and producers. Reclaimers still have no tool of their own.

## Solution

ComeCollectZA gives reclaimers their own app:

- **Sell smarter:** live and forecast prices across nearby buy-back centres, with a sell-now or wait recommendation.
- **Get registered, get paid:** a guided SAWPRS registration that unlocks the EPR service fee, and a check that every fee owed has arrived.
- **Proof of work:** every verified sale adds to a digital earnings record that the reclaimer can use to open an account, receive payouts or apply for credit.
- **For centres:** faster onboarding of registered reclaimers and fewer cash disputes.
- **For producers (PROs and brands):** more registered, active reclaimers and verified collection data by area.

## Users

| User | Device | What they do in the app |
|---|---|---|
| Reclaimer | Android phone, low data | Checks prices, sells loads, shows a code at the centre, tracks money and fees |
| Buy-back centre operator | Tablet or phone at the yard | Scans a reclaimer code, records a weighed sale, updates the price board |
| PRO or brand | Desktop | Views aggregate tonnage, fees paid and owed, and anomaly flags |

## Scope

**Must ship for the demo**
- Prices and best-centre advice, with the sell-or-wait recommendation.
- The sell flow, with a code and QR at the centre and a live money moment.
- The service fee tracker.
- Anomaly rules, including duplicate photos.
- The PRO dashboard, aggregates only.
- Three demo accounts, one per role.

**Stretch**
- isiZulu voice input.
- The assistant.
- Offline write queue.
- PDF statement.
- Bluetooth scale integration.
- Sesotho translation.

**Later**
- Live payments, which need a payment partner and the SAWPRS and BBC 200 integrations.
- Nightly ML jobs in production.
- Store listing or public launch.

## Judging criteria

Judges score each criterion from 0 to 10, with equal weight.

| Criterion | How the product answers it |
|---|---|
| Product | Works end to end for the three roles, with demo data clearly labelled |
| Creativity | A reclaimer-side app that plugs into the industry's own rails rather than competing with them |
| Usability | Icon-first, large controls, three taps or fewer to the main actions, low-data design |
| Sustainability | Revenue from PROs and brands, buy-back centres and recyclers; clear unit economics |
| Impact | Every kilogram tracked, fees recovered, reclaimers' income made visible |
| Presentation | Ten-slide deck with demo logins and a 90-second demo video |
| Intelligence | Price forecasts, sell-or-wait advice, best-centre scoring and anomaly detection |

The Sonke submission also needs an SSDLC form and a Lean Business Canvas.

## Positioning

ComeCollectZA is the reclaimer's side of the EPR system. SAWPRS and BBC 200 cover registration and payments for buy-back centres and producers. ComeCollectZA covers price transparency, guided registration, fee tracking and the reclaimer's own record. It is designed to plug into those systems through adapters, and the demo uses mocked adapters.

## Schedule

| When | Work |
|---|---|
| Tue 20 to Thu 22 Oct | Prep: repo, design tokens, screen shells, seed data, voice clips, one vision test |
| Fri 23 Oct | Kickoff 10:00. Schema, row level security, demo accounts, price board, sell flow |
| Sat 24 Oct | Pitch video due. Photo upload, duplicate check, material suggestion, fee tracker, forecasts |
| Sun 25 Oct | Mentors until 17:00. PRO dashboard, anomaly queue, CSV export, deploy |
| Mon 26 Oct | Demo video, deck, SSDLC and Lean Business Canvas. Submit by 23:59 |

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Free AI tiers throttle or fail | Cache results, use a fallback model, and let the user pick the material by hand |
| No public price history | Label forecasts as demo data built on the 2026 reported prices |
| isiZulu voice input is unreliable | Keep it as a stretch goal; the app works without it |
| Supabase free project pauses after 7 idle days | Keep-alive ping every 6 hours and a demo reset script |
| Partner integrations unavailable | Adapters with mocks, described honestly in the deck |
| Solo build | Must-ship list is short; stretch items are dropped first |
| Smartphone access among reclaimers is unverified | Voice prompts and an icon-led interface; we say so in the deck |
