// What South African buy-back centres paid reclaimers in 2026, per material. These are public ranges, not offers:
// each centre sets its own board price by grade, cleanliness and volume. Checked 23 Oct 2026.
// Amounts are in cents per kg. Per tonne is the same number times 1000 (R1/kg = R1 000/t).
import type { MaterialCode } from "./materials";

export type MarketSource = { name: string; url: string; date: string };

export type MarketRange = {
  material: Exclude<MaterialCode, "OTHER">;
  lowCentsPerKg: number;
  highCentsPerKg: number;
  note: string;
  sources: MarketSource[];
};

export const MARKET_CHECKED = "23 Oct 2026";

const SUNDAY_TIMES: MarketSource = {
  name: "Sunday Times, waste picking economy",
  url: "https://www.sundaytimes.timeslive.co.za/news/2026-09-21-from-your-bin-to-cash-the-hidden-economy-of-waste-picking/",
  date: "Sep 2026",
};
const SCANWORTH: MarketSource = { name: "ScanWorth depot averages", url: "https://scanworth.co.za/live-prices", date: "Apr 2026" };
const SCRAP_RATES: MarketSource = {
  name: "ScrapMetalPrices.co.za yard rate cards",
  url: "https://scrapmetalprices.co.za/aluminium/",
  date: "Aug 2026",
};
const IDEASPOTS: MarketSource = {
  name: "IdeaSpots plastic bottle price guide",
  url: "https://ideaspots.com/plastic-bottle-recycling-prices-south-africa/",
  date: "Aug 2026",
};

export const MARKET_RANGES: MarketRange[] = [
  {
    material: "CAN_AL",
    lowCentsPerKg: 1000,
    highCentsPerKg: 1500,
    note: "About R14/kg earlier in 2026, then near R10/kg. Scrap yards quote R18 to R23/kg for large, clean lots.",
    sources: [SUNDAY_TIMES, SCANWORTH, SCRAP_RATES],
  },
  {
    material: "PET",
    lowCentsPerKg: 250,
    highCentsPerKg: 500,
    note: "Clear bottles. About R3.50/kg in Sep 2026, half the R7/kg of early 2026. Coloured PET pays less.",
    sources: [SUNDAY_TIMES, SCANWORTH, IDEASPOTS],
  },
  {
    material: "HDPE",
    lowCentsPerKg: 200,
    highCentsPerKg: 500,
    note: "Milk bottles and drums, clean.",
    sources: [SCANWORTH, IDEASPOTS],
  },
  {
    material: "CARDBOARD",
    lowCentsPerKg: 60,
    highCentsPerKg: 120,
    note: "Dry, flat, baled.",
    sources: [SCANWORTH],
  },
  {
    material: "PAPER_WHITE",
    lowCentsPerKg: 40,
    highCentsPerKg: 90,
    note: "Mixed paper range. No 2026 public price for sorted white paper was found. It usually pays more.",
    sources: [SCANWORTH],
  },
  {
    material: "GLASS",
    lowCentsPerKg: 40,
    highCentsPerKg: 80,
    note: "Sorted by colour. Glass recyclers on the Money4Glass platform add R150/t for reclaimers.",
    sources: [SCANWORTH, { name: "Money4Glass incentives", url: "https://www.money4glass.co.za/subsidies-and-incentives", date: "2026" }],
  },
];

// The EPR service fee the industry agreed to pay reclaimers on top of the price: 15c/kg, which is R150/t.
export const SERVICE_FEE_CENTS_PER_KG = 15;
