// Demo data for the app screens. Replace with the real backend behind lib/app/api.ts.
import type { Group, Material } from "./logic";

export type Centre = "Orlando East" | "Klipspruit" | "Alexandra";
export const CENTRES: Centre[] = ["Orlando East", "Klipspruit", "Alexandra"];

export type BoardPrice = { material: Material; centre: Centre; centsPerKg: number };

const RAW: Record<Material, [number, number, number]> = {
  cans: [1020, 1000, 990],
  pet: [380, 350, 365],
  hdpe: [300, 280, 320],
  cardboard: [90, 85, 95],
  paper: [70, 60, 75],
  glass: [40, 40, 35],
};

export const BOARD_PRICES: BoardPrice[] = (Object.keys(RAW) as Material[]).flatMap((m) =>
  CENTRES.map((centre, i) => ({ material: m, centre, centsPerKg: RAW[m][i] })),
);

export type NationalRange = { material: Material; minRandT: number; maxRandT: number; note: string; sources: string };
export const NATIONAL_RANGES: NationalRange[] = [
  { material: "cans", minRandT: 10000, maxRandT: 15000, note: "Clean, flattened cans fetch the top of the range.", sources: "Collect-a-Can, Mar 2026; buy-back survey, Jun 2026" },
  { material: "pet", minRandT: 2500, maxRandT: 5000, note: "Clear bottles pay more than coloured ones.", sources: "PETCO, Feb 2026; buy-back survey, Jun 2026" },
  { material: "hdpe", minRandT: 2000, maxRandT: 5000, note: "Milk and cleaning bottles. Remove lids if asked.", sources: "Polyco, Feb 2026; buy-back survey, Jun 2026" },
  { material: "cardboard", minRandT: 600, maxRandT: 1200, note: "Keep it dry. Wet cardboard is weighed down.", sources: "Fibre Circle, Apr 2026; buy-back survey, Jun 2026" },
  { material: "paper", minRandT: 400, maxRandT: 900, note: "White office paper pays more than mixed paper.", sources: "Fibre Circle, Apr 2026" },
  { material: "glass", minRandT: 400, maxRandT: 800, note: "Sort by colour where the centre asks.", sources: "The Glass Recycling Company, May 2026" },
];

export type Sale = {
  id: string;
  material: Material;
  grams: number;
  centsPerKg: number;
  centre: Centre;
  date: string;
  fee: "paid" | "owed" | "missing";
};

export const RECENT_SALES: Sale[] = [
  { id: "s-1007", material: "cans", grams: 6400, centsPerKg: 1000, centre: "Orlando East", date: "2026-10-22", fee: "owed" },
  { id: "s-1006", material: "cardboard", grams: 84200, centsPerKg: 95, centre: "Alexandra", date: "2026-10-21", fee: "paid" },
  { id: "s-1005", material: "pet", grams: 21500, centsPerKg: 380, centre: "Orlando East", date: "2026-10-19", fee: "paid" },
  { id: "s-1004", material: "glass", grams: 52000, centsPerKg: 40, centre: "Klipspruit", date: "2026-10-17", fee: "missing" },
  { id: "s-1003", material: "hdpe", grams: 13800, centsPerKg: 320, centre: "Alexandra", date: "2026-10-15", fee: "paid" },
];

export const MONTH_BY_MATERIAL: Record<Material, { cents: number; grams: number }> = {
  cans: { cents: 248000, grams: 245000 },
  pet: { cents: 96550, grams: 262000 },
  hdpe: { cents: 51200, grams: 170000 },
  cardboard: { cents: 42300, grams: 470000 },
  paper: { cents: 24000, grams: 340000 },
  glass: { cents: 20000, grams: 520000 },
};

export const FEES = { paidCents: 3840, owedCents: 1275, missingCents: 360 };
export const SCORE = { today: 82, deltaVsLastWeek: 4 };

export const IMPACT_SERIES = {
  week: { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], grams: [42000, 61000, 38000, 75000, 54000, 88000, 12000] },
  month: { labels: ["W1", "W2", "W3", "W4"], grams: [410000, 455000, 520000, 622000] },
  year: {
    labels: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
    grams: [1610000, 1420000, 1550000, 1690000, 1720000, 1810000, 1760000, 1840000, 1905000, 1950000, 1880000, 2007000],
  },
};
/** Average pay per kg in cents and CO2e per kg in hundredths for the demo mix. */
export const DEMO_MIX = { centsPerKg: 240, co2HundredthsPerKg: 290 };

export const PICKUPS = [
  { id: "p1", place: "Mama Joy's Tavern, Orlando West", items: "Cans and one-way glass", amount: "About 40 kg", when: "Today, 16:00" },
  { id: "p2", place: "Corner Bottle Store, Klipspruit", items: "Cardboard and PET", amount: "About 120 kg", when: "Tomorrow, 09:00" },
];

export const PRO = {
  activeReclaimers: 1240,
  tonnesThisMonthGrams: 38_600_000,
  feesOwedCents: 412000,
  tonnesByMaterialGrams: { cans: 3_200_000, pet: 6_800_000, hdpe: 4_100_000, cardboard: 12_900_000, paper: 7_400_000, glass: 4_200_000 } as Record<Material, number>,
  co2Tenths: 1109,
  workDaysTenths: 8055,
  youth: { count: 610, total: 1240 },
  reviewQueue: [
    { id: "#4821", text: "48.0 kg cans at Alexandra", reason: "Price above the board" },
    { id: "#4817", text: "Two sales from one code in 3 minutes", reason: "Possible repeat" },
    { id: "#4802", text: "310.0 kg glass at Klipspruit", reason: "Weight far above average" },
  ],
};

export const DEMO_RECLAIMER_CODE = "ccza_r_7Q2KX9";
export const DEMO_FIRST_NAME = "Thandi";

export type GroupLabel = Record<Group, string>;
