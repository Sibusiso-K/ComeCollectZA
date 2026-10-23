// Totals shown on the money and impact screens, worked out from a person's own sales.
// Days and months follow South African time (UTC+2, no daylight saving).
import { MATERIALS, co2Grams, type Material } from "./logic";
import type { MySale } from "./api";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const SAST = 2 * HOUR;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Milliseconds shifted so that the UTC fields read as South African local time. */
const local = (d: Date | string) => new Date((typeof d === "string" ? new Date(d) : d).getTime() + SAST);

export type MonthTotals = { cents: number; grams: number; byMaterial: Record<Material, { cents: number; grams: number }> };

export function monthTotals(sales: MySale[], now: Date = new Date()): MonthTotals {
  const n = local(now);
  const byMaterial = Object.fromEntries(MATERIALS.map((m) => [m, { cents: 0, grams: 0 }])) as MonthTotals["byMaterial"];
  let cents = 0;
  let grams = 0;
  for (const s of sales) {
    const d = local(s.createdAt);
    if (d.getUTCFullYear() !== n.getUTCFullYear() || d.getUTCMonth() !== n.getUTCMonth()) continue;
    cents += s.amountCents;
    grams += s.grams;
    byMaterial[s.material].cents += s.amountCents;
    byMaterial[s.material].grams += s.grams;
  }
  return { cents, grams, byMaterial };
}

export function feeTotals(sales: MySale[]) {
  const t = { paidCents: 0, owedCents: 0, missingCents: 0 };
  for (const s of sales) {
    if (!s.fee) continue;
    if (s.fee.status === "paid") t.paidCents += s.fee.cents;
    else if (s.fee.status === "owed") t.owedCents += s.fee.cents;
    else t.missingCents += s.fee.cents;
  }
  return t;
}

/** Share of service fees already paid, 0 to 100. Null when no fees have been raised yet. */
export function feeRecoveryPercent(sales: MySale[]): number | null {
  const t = feeTotals(sales);
  const all = t.paidCents + t.owedCents + t.missingCents;
  return all === 0 ? null : Math.round((t.paidCents * 100) / all);
}

export type Range = "week" | "month" | "year";
export type Series = { labels: string[]; grams: number[]; totalGrams: number; payCents: number; co2Grams: number };

export function impactSeries(sales: MySale[], range: Range, now: Date = new Date()): Series {
  const n = local(now);
  const startOfTomorrow = (Math.floor(n.getTime() / DAY) + 1) * DAY;
  let labels: string[];
  let bucketOf: (d: Date) => number;

  if (range === "week") {
    labels = Array.from({ length: 7 }, (_, i) => DAY_NAMES[new Date(startOfTomorrow - (7 - i) * DAY).getUTCDay()]);
    bucketOf = (d) => 6 - Math.floor((startOfTomorrow - d.getTime()) / DAY);
  } else if (range === "month") {
    labels = ["W1", "W2", "W3", "W4"];
    bucketOf = (d) => 3 - Math.floor((startOfTomorrow - d.getTime()) / (7 * DAY));
  } else {
    const thisMonth = n.getUTCFullYear() * 12 + n.getUTCMonth();
    labels = Array.from({ length: 12 }, (_, i) => MONTH_NAMES[(thisMonth - 11 + i) % 12]);
    bucketOf = (d) => 11 - (thisMonth - (d.getUTCFullYear() * 12 + d.getUTCMonth()));
  }

  const grams = labels.map(() => 0);
  let payCents = 0;
  let co2 = 0;
  for (const s of sales) {
    const idx = bucketOf(local(s.createdAt));
    if (idx < 0 || idx >= labels.length) continue;
    grams[idx] += s.grams;
    payCents += s.amountCents;
    co2 += co2Grams(s.grams, s.material);
  }
  return { labels, grams, totalGrams: grams.reduce((a, b) => a + b, 0), payCents, co2Grams: co2 };
}

export function allTimeImpact(sales: MySale[]): { grams: number; co2Grams: number; payCents: number } {
  let grams = 0;
  let co2 = 0;
  let payCents = 0;
  for (const s of sales) {
    grams += s.grams;
    co2 += co2Grams(s.grams, s.material);
    payCents += s.amountCents;
  }
  return { grams, co2Grams: co2, payCents };
}
