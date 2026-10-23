// Environmental and work impact of recycled material. Method and sources: docs/IMPACT.md.
import type { MaterialCode } from "./materials";

// kg of CO2e avoided per kg recycled instead of landfilled. US EPA WARM v16 (Dec 2023), Exhibits 2-2 and 6-17:
// (landfill factor minus recycling factor) in MTCO2E per short ton, times 1.1023 for metric tonnes.
// WARM uses US grid and landfill assumptions. South Africa's coal-heavy grid likely makes the real saving larger,
// so these figures are conservative.
export const CO2E_AVOIDED_KG_PER_KG: Record<Exclude<MaterialCode, "OTHER">, number> = {
  CAN_AL: 10.09, // landfill 0.02, recycling -9.13
  PET: 1.17, // 0.02, -1.04
  HDPE: 0.86, // 0.02, -0.76
  CARDBOARD: 3.66, // corrugated containers 0.18, -3.14
  PAPER_WHITE: 3.99, // mixed paper (general) 0.07, -3.55. Office paper would give 4.40
  GLASS: 0.33, // 0.02, -0.28
};

// National minimum wage from 1 March 2026: R30.23 an hour. One work day is 8 hours.
export const MIN_WAGE_CENTS_PER_HOUR = 3023;
export const WORK_DAY_CENTS = MIN_WAGE_CENTS_PER_HOUR * 8;

// South Africa counts people aged 15 to 34 as youth (National Youth Policy). Reclaimers must be 18 or older.
export const YOUTH_MAX_AGE = 34;

export type Haul = { material: MaterialCode; kg: number; cents?: number };

export type Impact = {
  kg: number;
  co2eKg: number;
  // Earnings expressed as days of work at the national minimum wage.
  workDays: number;
};

export function impactOf(hauls: Haul[]): Impact {
  let kg = 0;
  let co2eKg = 0;
  let cents = 0;
  for (const haul of hauls) {
    kg += haul.kg;
    cents += haul.cents ?? 0;
    if (haul.material !== "OTHER") co2eKg += haul.kg * CO2E_AVOIDED_KG_PER_KG[haul.material];
  }
  return { kg, co2eKg, workDays: cents / WORK_DAY_CENTS };
}

export function formatCo2e(kg: number): string {
  if (kg >= 1000) return (kg / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 }) + " t CO2e";
  return Math.round(kg).toLocaleString("en-US") + " kg CO2e";
}
