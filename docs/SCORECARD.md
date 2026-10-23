# Scorecard

The app scored against the seven Sonke judging criteria for the FNB App of the Year Hackathon 2026. Each criterion is scored 0 to 10 with equal weight, for 70 in total. We re-score after every feature that lands, and add a row to the history.

Scores are our own honest estimate, not the judges'. Where a score is low, the "To raise it" column is the plan.

## Current score: 42 / 70 (23 Oct 2026, evening)

| Criterion | Score | Evidence today | To raise it |
|---|---|---|---|
| **Product** | 6 | Live site. Reclaimer home, live prices with R/t, sell flow with scanner and QR, money screen with receipts, fees and impact. Centre console scans codes. PRO dashboard. Database with role checks (54 tests) | Create demo accounts and set the service key so a sale goes end to end. Build pickup listings for taverns and bottle stores |
| **Creativity** | 8 | Reclaimer-side app that plugs into EPR rails. On-device scanner that also spots mixed loads, with no data. Taverns as a supply source | Show the pickup handshake in the demo |
| **Usability** | 6 | Big controls, icon-first, three taps to a sale, phone layout checked at 375 px, installable, works offline after first use | Test with three real reclaimers. Add isiZulu and Sesotho labels. Test on a cheap Android phone |
| **Sustainability** | 6 | Business model with unit economics: R220 a month per active reclaimer from PROs and buyers, reclaimers never pay. Lean Canvas drafted | One conversation with a PRO or centre to test the R50/t and 2% assumptions. Put the numbers in the deck |
| **Impact** | 7 | CO2e avoided (EPA WARM v16), landfill diverted, work days at minimum wage, service fees tracked. Sourced 2026 prices per tonne | Collect an age band at registration for real youth figures. Show a before and after for one reclaimer |
| **Presentation** | 3 | Docs are thorough. No deck or video yet | 20-second pitch video by Sat 13:30. Ten-slide deck and 90-second demo for Monday |
| **Intelligence** | 6 | On-device TinyCLIP scanner: 82% on held-out photos, 93% with quarter agreement, mixed loads flagged with 8% false alarms. Rule-based anomaly flags in the database | Sell-or-wait advice from price history. Duplicate-photo check. Measure the scanner on real loads |

## Biggest gains for the least work

1. **Presentation +4:** record the 20-second video and build the deck. Nothing else moves the total as much.
2. **Product +2:** demo accounts and the service key turn the sales route on, so judges can do a full sale.
3. **Usability +1:** a five-minute test with one real reclaimer, written up honestly.

## History

| When | Product | Creativity | Usability | Sustainability | Impact | Presentation | Intelligence | Total | What changed |
|---|---|---|---|---|---|---|---|---|---|
| 21 Oct | 4 | 7 | 5 | 4 | 4 | 2 | 2 | 28 | Scaffold, schema, live prices |
| 23 Oct, morning | 5 | 7 | 6 | 4 | 4 | 2 | 5 | 33 | Installable app, on-device scanner, QR scan |
| 23 Oct, evening | 6 | 8 | 6 | 6 | 7 | 3 | 6 | 42 | Security hardening, offline scanner, mixed loads, prices per tonne, impact, business model |

The 21 Oct and morning rows were scored afterwards from the build log.

## Criteria source

Recorded from the Sonke event page and listed in [PLAN.md](PLAN.md#judging-criteria).
