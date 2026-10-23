// Demo data for the screen shells. Every value here is invented and is labelled as demo data in the UI.
import type { MaterialCode } from "./materials";

export const DEMO_QR_TOKEN = "ccza_r_7Q2KX9";

export const DEMO_RECLAIMER = {
  name: "Thandi Mokoena",
  initials: "TM",
  area: "Orlando East",
  status: "registered" as const,
};

export const DEMO_BEST = {
  material: "CAN_AL" as MaterialCode,
  cents_per_kg: 1020,
  centre: "Demo Centre Orlando East",
  distance_km: 1.8,
  decision: "sell_now" as const,
};

export const BOARD: { code: MaterialCode; cents_per_kg: number; trend: "up" | "down" | "flat" }[] = [
  { code: "PET", cents_per_kg: 380, trend: "down" },
  { code: "CAN_AL", cents_per_kg: 1020, trend: "down" },
  { code: "CARDBOARD", cents_per_kg: 90, trend: "flat" },
  { code: "GLASS", cents_per_kg: 40, trend: "flat" },
  { code: "PAPER_WHITE", cents_per_kg: 220, trend: "up" },
  { code: "HDPE", cents_per_kg: 250, trend: "flat" },
];

export const DEMO_MONTH = {
  earned_cents: 218450,
  kg: 612,
  sales: 19,
  fees_paid_cents: 3840,
  fees_owed_cents: 1490,
  fees_missing_cents: 320,
};

export const DEMO_SALES = [
  { id: "t_5d2", material: "CAN_AL" as MaterialCode, kg: 6.4, cents: 6400, centre: "Demo Centre Orlando East", when: "Today, 09:12" },
  { id: "t_5c9", material: "PET" as MaterialCode, kg: 12.0, cents: 4560, centre: "Demo Centre Klipspruit", when: "Yesterday, 16:40" },
  { id: "t_5b1", material: "CARDBOARD" as MaterialCode, kg: 25.5, cents: 2295, centre: "Demo Centre Orlando East", when: "Mon, 08:05" },
];

export const PRO_SUMMARY = {
  active_reclaimers: 1240,
  // Reclaimers aged 18 to 34. Needs an age band at registration, which is not collected yet.
  youth_reclaimers: 610,
  paid_to_reclaimers_cents: 19480000,
  tonnes_total: 38.6,
  fees_paid_cents: 1842000,
  fees_owed_cents: 412000,
  by_material: [
    { code: "PET" as MaterialCode, tonnes: 14.2 },
    { code: "CAN_AL" as MaterialCode, tonnes: 3.1 },
    { code: "CARDBOARD" as MaterialCode, tonnes: 16.8 },
    { code: "GLASS" as MaterialCode, tonnes: 4.5 },
  ],
};

export const PRO_ANOMALIES = [
  { id: "a_1", transaction: "t_5d2", reason: "Weight is 3x this reclaimer's 30-day high", status: "open" },
  { id: "a_2", transaction: "t_5b8", reason: "Photo matches an earlier load", status: "open" },
];
