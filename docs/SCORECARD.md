# Scorecard

The app scored against the seven Sonke judging criteria for the FNB App of the Year Hackathon 2026. Each criterion is scored 0 to 10 with equal weight, for 70 in total. We re-score after every feature that lands, and add a row to the history.

Scores are our own honest estimate, not the judges'. Where a score is low, the "To raise it" column is the plan.

## Round check: app, deck and demo video (25 Oct 2026, afternoon)

A check of the three things judges will see, against the way this hackathon says apps are judged. The deck is the reworked 14-slide draft (not yet saved in Canva), the video is the 84.6 s demo in [pitch/DEMO_SCRIPT.md](pitch/DEMO_SCRIPT.md), and the app is the live site, used signed out in a phone-sized browser.

### The three questions

| Question | Answer today | Gap |
|---|---|---|
| **What problem is solved, and how big is it?** | Clear and sized in the deck and the video: 60,000 to 90,000 reclaimers recover half or more of what South Africa recycles, PET fell from R7 to R3.50/kg in 2026, the 15c/kg service fee goes unpaid, and reclaimers save cities R300 to R750 million a year in landfill costs. Sources are on the slide | The headcount and share are estimates (NWMS, Regenize). Say "estimated" if asked |
| **Is it a complete MVP of the core user story, and does it work well?** | Scan, best price, weigh and a running total work live for anyone, with no account. Prices, market map and electronics work. Fast: a scan takes under 3 s once the model is cached | **No real sale has been recorded.** A judge who signs in with the demo account sees an empty My money. Steps 4 and 5 of the journey (code at the centre, money recorded) are shown with example data. The scanner misread cans in today's photo check |
| **Does it look good: simple and beautiful?** | Yes. One look across app, deck and video: dark green and lime, big controls, a first-time tour, light and dark, 11 languages offered. Every screen checked at 320 to 412 px | The new deck slides use Canva's default font, not the deck's headline font. Four translations are drafts |

### Against what judges look for

| Criterion | Score | Evidence | Raise it before Mon 23:59 |
|---|---|---|---|
| Product functionality and usability | 6 | The public journey works end to end on the live app. Big controls, plain words, works offline once saved | Record one real test sale on the demo account, then re-record steps 4 and 5 of the video live |
| Creativity and innovation | 8 | A reclaimer-side app that plugs into the EPR rails, an on-device scanner that explains itself, electronics in the same app. The competitors slide shows the gap | Nothing urgent |
| Viability | 7 | Who pays and why (PROs R50 a verified tonne, buyers 2%), partners and how each one benefits, a costed ask | One real conversation with a PRO or centre. The R120,000 ask is an estimate the team should confirm |
| Sustainability | 7 | Costs near zero (free tiers, AI on the phone), revenue from those who benefit, the EPR law keeps the need, a 3 and 12 month plan. Uptime through judging is handled (keep-alive PR) | Merge the keep-alive PR and run it once |
| Impact | 7 | Income made visible, fees recovered, CO2e and landfill worked out from weighed sales. At 1,000 reclaimers: about 26,400 t a year kept from landfill (assumption) | Real sales behind the numbers |
| Presentation | 8 | The deck covers everything on the checklist: problem with stats, users, solution and journey, architecture, competitors, business model, partners, sustainability, the ask, live link and demo login. The video is under 90 s and follows the demo guidance | Type the demo password on the last slide, add the video link, record the voice |
| Intelligence | 6 | On-device scanner (79.8% right on real photos it never saw), mixed-load detection, explains what it saw. Today it named PET right on 2 of 2 photos but misread 3 of 3 can photos | Do not demo a can scan. Sell-or-wait advice from price history remains the biggest gain here |

**Round check total: 49 / 70.** The single biggest step up is one real sale on the demo account: it moves Product, Impact and the video at once.

### Hosting and a native app

- **No native app is needed.** The checklist accepts an app build or a URL in the slides. The web app installs from the browser, opens offline and has the scanner on the phone. An APK would add signing, a download for judges and new risk for no extra marks.
- **Free hosting:** Vercel Hobby for the app and Supabase Free for the database. The one risk is Supabase pausing a free project after 7 idle days. The keep-alive workflow pings a database-backed health route every six hours, and a failed run emails the repo owner.
- **During judging:** keep "Confirm email" off so judges can sign up without waiting for an email (switch it back on after judging), keep the demo account's password unchanged, and do not merge risky changes to `main`.

## Current score: 47 / 70 (25 Oct 2026, morning)

25 Oct: Intelligence rose to 6 with scanner head version 7 (see the history). The table below is otherwise the 24 Oct afternoon scoring. The afternoon round check above scores 49 once the reworked deck is saved.

Scored against the exact questions on Sonke's Criteria tab, which put more weight on traction and on forecasting than our earlier notes did. The afternoon's full test pass made the app safer and smoother (see [STRESS_TEST.md](STRESS_TEST.md)) but does not move a criterion on its own. Presentation rose because the video and the canvas are now on Sonke.

| Criterion | Score | Sonke's questions | Evidence today | To raise it |
|---|---|---|---|---|
| **Product** | 6 | Complete or far from completion? Polished? Does it do what it is meant to? Market need? Traction? | Real accounts, a live database with 78 passing checks, a scanner on the phone, prices, a marketplace map, electronics, a centre console, a programme dashboard, demo payouts and a SAWPRS record. Live and working. **Not complete:** no real sale yet, payouts are a labelled demo, and sign-up emails reach only our own address. **Traction: none.** One real account | Record one real sale. Get five real people on the app and count them. Verify an email domain so others can sign up |
| **Creativity** | 8 | New application? Creative approach? Improves society or business in a new way? Appealing? A better way to do something old? | A reclaimer-side app that plugs into the producer-responsibility system, an on-device scanner that explains itself, a market map linking buyers and sellers, and old electronics handled in the same app | Show the tavern to reclaimer pickup in the pitch |
| **Usability** | 7 | Easy to use? Clear, simple, intuitive, and does the user know what to do next? | One typeface, big controls, a first-time tour, light and dark, 11 languages offered (4 drafted, the electronics advice English only), works offline once saved, installable, about 281 KB on first load. **Never tested with a real reclaimer** | Ten minutes with one real reclaimer on a cheap phone. First-language readers for the translations |
| **Sustainability** | 6 | Potential of the app and the team? Can it go to the next level? A path to revenue? | A written business model with unit economics (programme bodies pay about R50 a verified tonne, buyers about 2%, reclaimers never pay). The Lean Business Canvas on Sonke is filled. **No outside check of the numbers yet.** One person on the team | One conversation with a programme body or centre to test the numbers |
| **Impact** | 7 | How much impact? A big or small problem? How indispensable? | A big problem (unpaid, unrecorded recycling work, and old electronics with nowhere to go). CO2e, landfill and work days are worked out from real sales. **No real sales behind the numbers yet** | Real sales and a before and after for one reclaimer |
| **Presentation** | 7 | How well was the idea communicated? Was the story told, with its importance and relevance? | A 20-second video with the problem, solution and value labelled, the team's own voice and captions, uploaded to Sonke. The Lean Business Canvas is filled. Five mockup boards. Clear docs. **No deck yet** | Build the ten-slide deck with a demo login and a 90-second demo |
| **Intelligence** | 6 | Can the app think for itself, forecast and predict the user's likely behaviour from data? | An on-device scanner that knows seven groups (version 7: 79.8% on real-world photos it never saw a copy of, wrong only 8.7% of the times it names a material, 99.2% of independent Kaggle electronics), mixed-load detection, and an assistant that reads the live board. **No forecasting or prediction yet** | Sell-or-wait advice from price history. A forecast of next month's earnings from a person's own sales |

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
| 25 Oct, morning | 6 | 8 | 7 | 6 | 7 | 7 | 6 | 47 | Scanner head version 7, measured fairly: real-world photos 60.6% to 79.8%, wrong answers at the 70% bar 19.8% to 8.7%. Every screen checked at 320 to 412 px in 11 languages, 0 layout problems. Usability stays at 7 until a real reclaimer tries it |
| 25 Oct, afternoon | 6 | 8 | 7 | 7 | 7 | 8 | 6 | 49 | Round check. Deck reworked to 14 slides (competitors, partners, sustainability, the ask), an 84.6 s demo video of the live app, keep-alive for judging. Scanner misread 3 of 3 can photos in the check. Counts once the deck is saved |

The 21 Oct and morning rows were scored afterwards from the build log.

## Criteria source

Recorded from the Sonke event page and listed in [PLAN.md](PLAN.md#judging-criteria).
