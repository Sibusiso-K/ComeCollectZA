# Impact method

How the app counts environmental and employment impact. The code is [lib/impact.ts](../lib/impact.ts). Every figure is calculated from weighed sales, never from scanner guesses.

## What we count

| Measure | Formula | Shown on |
|---|---|---|
| Kept from landfill | Sum of weighed kg | Money screen, PRO dashboard |
| CO2e avoided | kg of each material times its factor below | Money screen, PRO dashboard |
| Work days paid | Pay to reclaimers divided by one day at the national minimum wage (R30.23 an hour times 8 hours = R241.84) | Money screen, PRO dashboard |
| Youth share | Active reclaimers aged 18 to 34, divided by all active reclaimers | PRO dashboard |
| Service fees recovered | Fees paid divided by fees owed | Money screen, PRO dashboard |

## CO2e factors

Source: US EPA Waste Reduction Model (WARM) version 16, December 2023. Recycling factors from Exhibit 2-2 and landfill factors from Exhibit 6-17, both in metric tonnes of CO2e per short ton. Avoided emissions = landfill factor minus recycling factor, times 1.1023 to convert to metric tonnes.

| Material | Landfill | Recycling | Avoided per short ton | **kg CO2e avoided per kg** |
|---|---|---|---|---|
| Aluminium cans | 0.02 | -9.13 | 9.15 | **10.09** |
| PET | 0.02 | -1.04 | 1.06 | **1.17** |
| HDPE | 0.02 | -0.76 | 0.78 | **0.86** |
| Cardboard (corrugated containers) | 0.18 | -3.14 | 3.32 | **3.66** |
| Paper (mixed paper, general) | 0.07 | -3.55 | 3.62 | **3.99** |
| Glass | 0.02 | -0.28 | 0.30 | **0.33** |

Office paper would give 4.40 kg per kg. We use mixed paper because sorted white paper is rare in reclaimer loads.

**Limits.** WARM models US electricity and US landfills. South Africa's grid is mostly coal, so making virgin material emits more here, and the real saving is probably larger. The factors are therefore conservative. They also count one round of recycling only.

## Employment

- **Work days paid** turns income into something people understand: R5 500 earned in a month is about 23 days of minimum-wage work.
- **Youth share** needs an age band at registration (18 to 24, 25 to 34, 35 and over). We do not collect it yet, so the PRO dashboard shows an example figure and says so. South Africa's National Youth Policy defines youth as ages 15 to 34. Reclaimers on the app must be 18 or older.
- **New work** is not claimed. The app helps existing reclaimers earn more and get recognised. We will report income change per reclaimer over time, not jobs created.

## Over time

Each weighed sale is stored with material, weight, price, centre and time. Totals by week, month and year come from the same data, per reclaimer (their own only) and in aggregate for PROs (no names). The nightly job planned in [HANDOVER.md](HANDOVER.md) will write the monthly totals.

## Sources

- US EPA, WARM v16 Management Practices Chapters, Dec 2023: https://www.epa.gov/system/files/documents/2024-01/warm_management_practices_v16_dec.pdf
- National minimum wage, R30.23 an hour from 1 Mar 2026: https://www.ewn.co.za/2026/02/05/minimum-wage-rises-to-r3023-an-hour-from-1-march
