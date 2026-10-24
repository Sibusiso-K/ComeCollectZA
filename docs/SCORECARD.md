# Scorecard

The app scored against the seven Sonke judging criteria for the FNB App of the Year Hackathon 2026. Each criterion is scored 0 to 10 with equal weight, for 70 in total. We re-score after every feature that lands, and add a row to the history.

Scores are our own honest estimate, not the judges'. Where a score is low, the "To raise it" column is the plan.

## Current score: 46 / 70 (24 Oct 2026, afternoon)

Scored against the exact questions on Sonke's Criteria tab, which put more weight on traction and on forecasting than our earlier notes did. The afternoon's full test pass made the app safer and smoother (see [STRESS_TEST.md](STRESS_TEST.md)) but does not move a criterion on its own. Presentation rose because the video and the canvas are now on Sonke.

| Criterion | Score | Sonke's questions | Evidence today | To raise it |
|---|---|---|---|---|
| **Product** | 6 | Complete or far from completion? Polished? Does it do what it is meant to? Market need? Traction? | Real accounts, a live database with 78 passing checks, a scanner on the phone, prices, a marketplace map, electronics, a centre console, a programme dashboard, demo payouts and a SAWPRS record. Live and working. **Not complete:** no real sale yet, payouts are a labelled demo, and sign-up emails reach only our own address. **Traction: none.** One real account | Record one real sale. Get five real people on the app and count them. Verify an email domain so others can sign up |
| **Creativity** | 8 | New application? Creative approach? Improves society or business in a new way? Appealing? A better way to do something old? | A reclaimer-side app that plugs into the producer-responsibility system, an on-device scanner that explains itself, a market map linking buyers and sellers, and old electronics handled in the same app | Show the tavern to reclaimer pickup in the pitch |
| **Usability** | 7 | Easy to use? Clear, simple, intuitive, and does the user know what to do next? | One typeface, big controls, a first-time tour, light and dark, 11 languages offered (4 drafted, the electronics advice English only), works offline once saved, installable, about 281 KB on first load. **Never tested with a real reclaimer** | Ten minutes with one real reclaimer on a cheap phone. First-language readers for the translations |
| **Sustainability** | 6 | Potential of the app and the team? Can it go to the next level? A path to revenue? | A written business model with unit economics (programme bodies pay about R50 a verified tonne, buyers about 2%, reclaimers never pay). The Lean Business Canvas on Sonke is filled. **No outside check of the numbers yet.** One person on the team | One conversation with a programme body or centre to test the numbers |
| **Impact** | 7 | How much impact? A big or small problem? How indispensable? | A big problem (unpaid, unrecorded recycling work, and old electronics with nowhere to go). CO2e, landfill and work days are worked out from real sales. **No real sales behind the numbers yet** | Real sales and a before and after for one reclaimer |
| **Presentation** | 7 | How well was the idea communicated? Was the story told, with its importance and relevance? | A 20-second video with the problem, solution and value labelled, the team's own voice and captions, uploaded to Sonke. The Lean Business Canvas is filled. Five mockup boards. Clear docs. **No deck yet** | Build the ten-slide deck with a demo login and a 90-second demo |
| **Intelligence** | 5 | Can the app think for itself, forecast and predict the user's likely behaviour from data? | An on-device scanner that knows seven groups (81.6% on real recycling photos, 98.6% of held-out electronics, 94.3% on an independent Kaggle set), mixed-load detection, and an assistant that reads the live board. **No forecasting or prediction yet** | Sell-or-wait advice from price history. A forecast of next month's earnings from a person's own sales |

## Biggest gains for the least work

1. **Presentation +1:** build the deck with a demo login. The video and canvas are done.
2. **Intelligence +2:** sell-or-wait advice and an earnings forecast from a person's own sales. This is the criterion where Sonke asks most directly for prediction.
3. **Product +2:** record one real sale, get a few real people using it, and verify an email domain so they can sign up.
4. **Sustainability +1:** one real conversation with a programme body or a centre. The canvas is filled.
5. **Usability +1:** ten minutes with one real reclaimer, written up honestly.

## History

| When | Product | Creativity | Usability | Sustainability | Impact | Presentation | Intelligence | Total | What changed |
|---|---|---|---|---|---|---|---|---|---|
| 21 Oct | 4 | 7 | 5 | 4 | 4 | 2 | 2 | 28 | Scaffold, schema, live prices |
| 23 Oct, morning | 5 | 7 | 6 | 4 | 4 | 2 | 5 | 33 | Installable app, on-device scanner, QR scan |
| 23 Oct, evening | 6 | 8 | 6 | 6 | 7 | 3 | 6 | 42 | Security hardening, offline scanner, mixed loads, prices per tonne, impact, business model |
| 23 Oct, night | 7 | 8 | 7 | 6 | 7 | 5 | 6 | 46 | Real accounts and data, marketplace map, first-time tour, restyle, logo, mockup boards |
| 23 Oct, late | 7 | 9 | 7 | 6 | 7 | 5 | 6 | 47 | Electronics: guide, drop-off finder and a sell or give board |
| 23 Oct, late night | 7 | 9 | 7 | 6 | 7 | 5 | 7 | 48 | Scanner retrained to recognise electronics (version 3) and send people to the guide |
| 24 Oct, midday | 6 | 8 | 7 | 6 | 7 | 6 | 5 | 45 | Re-scored against Sonke's exact questions (traction and forecasting weigh more). Added pitch video, demo payouts, SAWPRS record, Kaggle check |
| 24 Oct, afternoon | 6 | 8 | 7 | 6 | 7 | 7 | 5 | 46 | Video and canvas on Sonke. Full test pass: a database write hole closed, the scanner no longer freezes the screen, can be cancelled and refuses blank photos |

The 21 Oct and morning rows were scored afterwards from the build log.

## Criteria source

Recorded from the Sonke event page and listed in [PLAN.md](PLAN.md#judging-criteria).
