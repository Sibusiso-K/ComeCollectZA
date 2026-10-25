// Sell-or-wait advice and the earnings forecast. Both are plain rules over public 2026 prices and a person's own sales,
// not a trained model, and the screens say so. Money is whole cents and weight is whole grams.
import { MARKET_RANGES, MARKET_TRENDS } from "../market-prices";
import { CODE_BY_MATERIAL, type Material } from "./logic";
import type { MySale } from "./api";

export type Advice =
  | { verdict: "compare"; centre: string; centsPerKg: number }
  | { verdict: "sell"; reason: "falling"; dropPercent: number }
  | { verdict: "sell"; reason: "high" }
  | { verdict: "wait" }
  | { verdict: "fair" };

/** A centre has to pay at least this much more before the advice sends the person there first. */
const BETTER_CENTRE = 1.1;
/** A reported fall of at least this share counts as a falling price. */
const FALLING_SHARE = 0.15;
const LOW_END = 0.34;
const HIGH_END = 0.66;

/**
 * What to do with this material at this price, given every centre's board price for it.
 * Order matters: a better centre nearby beats everything, then a falling market, then where the price sits in the usual range.
 */
export function adviceFor(material: Material, centsPerKg: number, board: { centre: string; centsPerKg: number }[]): Advice {
  const code = CODE_BY_MATERIAL[material];
  const range = MARKET_RANGES.find((r) => r.material === code);
  const trend = MARKET_TRENDS[code as keyof typeof MARKET_TRENDS];

  const best = board.reduce<{ centre: string; centsPerKg: number } | null>((b, c) => (b === null || c.centsPerKg > b.centsPerKg ? c : b), null);
  if (best && best.centsPerKg >= centsPerKg * BETTER_CENTRE) return { verdict: "compare", centre: best.centre, centsPerKg: best.centsPerKg };

  const fall = trend ? (trend.earlierCentsPerKg - trend.nowCentsPerKg) / trend.earlierCentsPerKg : 0;
  if (fall >= FALLING_SHARE) return { verdict: "sell", reason: "falling", dropPercent: Math.round(fall * 100) };

  if (!range) return { verdict: "fair" };
  const pos = (centsPerKg - range.lowCentsPerKg) / (range.highCentsPerKg - range.lowCentsPerKg);
  if (pos > HIGH_END) return { verdict: "sell", reason: "high" };
  if (pos < LOW_END) return { verdict: "wait" };
  return { verdict: "fair" };
}

export type Forecast = { cents: number; lowCents: number; highCents: number; sales: number; days: number };

const DAY = 24 * 3600 * 1000;
const WINDOW_DAYS = 28;
const MIN_SALES = 3;
const MIN_DAYS = 7;

/**
 * About what the person may earn in the next 30 days, from their own sales in the last 28 days.
 * Needs at least 3 sales that span a week, so a single sale never produces a forecast. The range is plus or minus a quarter.
 */
export function forecastNext30(sales: MySale[], now: Date = new Date()): Forecast | null {
  const since = now.getTime() - WINDOW_DAYS * DAY;
  const recent = sales.filter((s) => {
    const t = new Date(s.createdAt).getTime();
    return t >= since && t <= now.getTime();
  });
  if (recent.length < MIN_SALES) return null;
  const first = Math.min(...recent.map((s) => new Date(s.createdAt).getTime()));
  const days = Math.min(WINDOW_DAYS, Math.ceil((now.getTime() - first) / DAY));
  if (days < MIN_DAYS) return null;
  const total = recent.reduce((sum, s) => sum + s.amountCents, 0);
  const cents = Math.round((total / days) * 30);
  return { cents, lowCents: Math.round(cents * 0.75), highCents: Math.round(cents * 1.25), sales: recent.length, days };
}
