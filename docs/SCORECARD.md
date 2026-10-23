# Scorecard

The app scored against the seven Sonke judging criteria for the FNB App of the Year Hackathon 2026. Each criterion is scored 0 to 10 with equal weight, for 70 in total. We re-score after every feature that lands, and add a row to the history.

Scores are our own honest estimate, not the judges'. Where a score is low, the "To raise it" column is the plan.

## Current score: 48 / 70 (23 Oct 2026, late night)

| Criterion | Score | Evidence today | To raise it |
|---|---|---|---|
| **Product** | 7 | Real accounts, real prices, a scanner on the phone, a marketplace map, a centre console and a programme dashboard, all on a live database with role checks (63 database tests). Not yet a full loop with a real sale | Add the service key, create one centre account, and record one real sale from scan to receipt. Then payouts |
| **Creativity** | 9 | Reclaimer-side app that plugs into EPR rails. On-device scanner that spots mixed loads and lets you tap a part of the photo to see its reasoning. Taverns and bottle stores as a supply source on a map. A second problem solved in the same app: what to do with old electronics, with sourced drop-off points and a sell or give board | Show the tavern to reclaimer pickup in the demo |
| **Usability** | 7 | One typeface, big controls, a first-time tour, 11 languages offered (4 drafted), light and dark, works offline once saved, installable | Test with three real reclaimers on a cheap Android phone. Have first-language speakers check the translations |
| **Sustainability** | 6 | A business model with unit economics (about R220 a month per active reclaimer from PROs and buyers, reclaimers never pay) and a Lean Canvas | One conversation with a PRO or a centre to test the R50 per tonne and 2% assumptions. Put the numbers in the deck |
| **Impact** | 7 | CO2e avoided (EPA WARM v16), landfill kept, work days at minimum wage, service fees tracked, and a real youth share from an age band collected at sign-up. Sourced 2026 prices per tonne | Real sales to show real numbers. A before and after for one reclaimer |
| **Presentation** | 5 | Five mockup boards, a clear README, handover, admin guide and docs. No pitch video or deck yet | The 20-second pitch video by Saturday 13:30. The ten-slide deck with a demo login and a 90-second demo video |
| **Intelligence** | 7 | On-device scanner that knows seven groups, including electronics: 81% on held-out real recycling photos, 98% of held-out electronics photos found (97% on kinds of item it never saw), and 0.2% of recyclables wrongly called electronics. Mixed-load detection. A lookup assistant that reads the live board and your fees. The electronics numbers come from clean Commons photos, so they are an upper bound. No forecasts yet | Test on real phone photos of real loads and cluttered electronics. Sell-or-wait advice from price history. The duplicate photo check |

## How each score was checked (23 Oct 2026, late night)

- **Product 7:** all 14 routes on the live site return 200, the sales route now answers 401 to a bad login (the server key is set), the database has 71 passing checks, and a centre operator account exists. Held back: no real sale has been recorded, and no payouts.
- **Creativity 9:** two problems in one app (recycling income and what to do with old electronics), a scanner that explains itself, and a map that links buyers to sellers. Held back: nothing here is shown to judges yet.
- **Usability 7:** one typeface, big controls, a tour, 11 languages offered (4 drafted, the electronics advice texts English only), light and dark, and offline reading. Page weight is about 281 KB compressed on first load. Held back: no test with a real reclaimer on a cheap phone.
- **Sustainability 6:** a written business model and unit economics, with no conversation yet with a PRO or a centre to test them.
- **Impact 7:** CO2e, landfill and work days come from the person's own sales, and a youth share is collected. Held back: there are no real sales behind the numbers yet.
- **Presentation 5:** five mockup boards and clear docs. No pitch video (due Sat 24 Oct 13:30) or deck.
- **Intelligence 7:** see the row above.

## Biggest gains for the least work

1. **Presentation +4:** record the 20-second video and build the deck. Nothing else moves the total as much.
2. **Product +2:** switch on sale recording and show one real sale from start to finish.
3. **Usability +1:** a ten-minute test with one real reclaimer, written up honestly.
4. **Sustainability +1:** one real conversation with a PRO or a centre.

## History

| When | Product | Creativity | Usability | Sustainability | Impact | Presentation | Intelligence | Total | What changed |
|---|---|---|---|---|---|---|---|---|---|
| 21 Oct | 4 | 7 | 5 | 4 | 4 | 2 | 2 | 28 | Scaffold, schema, live prices |
| 23 Oct, morning | 5 | 7 | 6 | 4 | 4 | 2 | 5 | 33 | Installable app, on-device scanner, QR scan |
| 23 Oct, evening | 6 | 8 | 6 | 6 | 7 | 3 | 6 | 42 | Security hardening, offline scanner, mixed loads, prices per tonne, impact, business model |
| 23 Oct, night | 7 | 8 | 7 | 6 | 7 | 5 | 6 | 46 | Real accounts and data, marketplace map, first-time tour, restyle, logo, mockup boards |
| 23 Oct, late | 7 | 9 | 7 | 6 | 7 | 5 | 6 | 47 | Electronics: guide, drop-off finder and a sell or give board |
| 23 Oct, late night | 7 | 9 | 7 | 6 | 7 | 5 | 7 | 48 | Scanner retrained to recognise electronics (version 3) and send people to the guide |

The 21 Oct and morning rows were scored afterwards from the build log.

## Criteria source

Recorded from the Sonke event page and listed in [PLAN.md](PLAN.md#judging-criteria).
