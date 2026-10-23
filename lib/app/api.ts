// Small API layer. Every call is local demo data today; swap the bodies for real calls later.
// The sales route in app/api/v1/centre/transactions is the real backend for recording a sale.
import {
  BOARD_PRICES,
  FEES,
  IMPACT_SERIES,
  DEMO_MIX,
  MONTH_BY_MATERIAL,
  RECENT_SALES,
  type BoardPrice,
  type Centre,
} from "./demo-data";
import { feeCents, saleCents, type Material } from "./logic";

const PRICE_CACHE = "ccza.prices";

export async function getBoardPrices(): Promise<{ prices: BoardPrice[]; updated: string }> {
  if (typeof navigator !== "undefined" && !navigator.onLine && typeof localStorage !== "undefined") {
    const cached = localStorage.getItem(PRICE_CACHE);
    if (cached) return JSON.parse(cached);
  }
  const data = { prices: BOARD_PRICES, updated: "2026-10-23" };
  if (typeof localStorage !== "undefined") localStorage.setItem(PRICE_CACHE, JSON.stringify(data));
  return data;
}

export function bestPrice(prices: BoardPrice[], m: Material): BoardPrice {
  return prices.filter((p) => p.material === m).sort((a, b) => b.centsPerKg - a.centsPerKg)[0];
}

export async function getMyMoney() {
  const monthCents = Object.values(MONTH_BY_MATERIAL).reduce((s, v) => s + v.cents, 0);
  return { monthCents, byMaterial: MONTH_BY_MATERIAL, fees: FEES, sales: RECENT_SALES };
}

export async function getImpact(range: "week" | "month" | "year") {
  const s = IMPACT_SERIES[range];
  const grams = s.grams.reduce((a, b) => a + b, 0);
  const payCents = Math.round((grams * DEMO_MIX.centsPerKg) / 1000);
  const co2 = Math.round((grams * DEMO_MIX.co2HundredthsPerKg) / 100);
  return { ...s, totalGrams: grams, payCents, co2Grams: co2 };
}

export type SaleInput = { code: string; material: Material; grams: number; centsPerKg: number; centre: Centre };
export type Receipt = { amountCents: number; feeCents: number; time: string; key: string };

const recorded = new Set<string>();
/** Demo recorder. Refuses a price that is not the board price, and refuses the same sale twice. */
export async function recordSale(s: SaleInput): Promise<{ ok: true; receipt: Receipt } | { ok: false; error: "duplicate" | "price" }> {
  const board = BOARD_PRICES.find((p) => p.material === s.material && p.centre === s.centre);
  if (!board || board.centsPerKg !== s.centsPerKg) return { ok: false, error: "price" };
  const key = `${s.code}|${s.material}|${s.grams}|${s.centsPerKg}|${s.centre}`;
  if (recorded.has(key)) return { ok: false, error: "duplicate" };
  recorded.add(key);
  return {
    ok: true,
    receipt: {
      amountCents: saleCents(s.grams, s.centsPerKg),
      feeCents: feeCents(s.grams),
      time: new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
      key,
    },
  };
}
