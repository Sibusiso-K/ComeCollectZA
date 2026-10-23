// Pure money, impact and scan rules. Ported from the Lovable skeleton.
// All money is whole cents, all weight is whole grams.

export type Material = "cans" | "pet" | "hdpe" | "cardboard" | "paper" | "glass";
export type Group = "cardboard" | "glass" | "metal" | "paper" | "plastic" | "trash" | "electronics";

export const MATERIALS: Material[] = ["cans", "pet", "hdpe", "cardboard", "paper", "glass"];

export const MATERIAL_LABEL: Record<Material, string> = {
  cans: "Cans",
  pet: "PET bottles",
  hdpe: "HDPE",
  cardboard: "Cardboard",
  paper: "Paper",
  glass: "Glass",
};

export const GROUP_TO_MATERIALS: Record<Group, Material[]> = {
  metal: ["cans"],
  plastic: ["pet", "hdpe"],
  cardboard: ["cardboard"],
  paper: ["paper"],
  glass: ["glass"],
  trash: [],
  electronics: [],
};

/** Groups that are not sold by the kilogram at a buy-back centre. They never count towards a mixed load. */
const NOT_A_MATERIAL: Group[] = ["trash", "electronics"];

/** kg CO2e avoided per kg, in hundredths (US EPA WARM v16, see docs/IMPACT.md). */
export const CO2_HUNDREDTHS: Record<Material, number> = {
  cans: 1009,
  pet: 117,
  hdpe: 86,
  cardboard: 366,
  paper: 399,
  glass: 33,
};

export const HOURLY_WAGE_CENTS = 3023;
export const DAY_WAGE_CENTS = HOURLY_WAGE_CENTS * 8;
export const FEE_CENTS_PER_KG = 15; // R150 per tonne

function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatRand(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error("Money must be whole cents");
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const rands = Math.floor(abs / 100);
  const c = abs % 100;
  return `${sign}R${groupThousands(rands)}.${String(c).padStart(2, "0")}`;
}

/** Rand per tonne = cents per kg x 1000, in whole Rand. */
export function randPerTonne(centsPerKg: number): number {
  return Math.round((centsPerKg * 1000) / 100);
}
export const formatPerTonne = (cpk: number) => `R${groupThousands(randPerTonne(cpk))}/t`;
export const formatPerKg = (cpk: number) => `${formatRand(cpk)}/kg`;
export const formatWholeRand = (r: number) => `R${groupThousands(r)}`;

export function saleCents(grams: number, centsPerKg: number): number {
  return Math.round((grams * centsPerKg) / 1000);
}
export function feeCents(grams: number): number {
  return Math.round((grams * FEE_CENTS_PER_KG) / 1000);
}
export function co2Grams(grams: number, m: Material): number {
  return Math.round((grams * CO2_HUNDREDTHS[m]) / 100);
}
/** Work days in hundredths (1993 = 19.93 days). */
export function workDaysHundredths(cents: number): number {
  return Math.round((cents * 100) / DAY_WAGE_CENTS);
}
export function formatHundredths(h: number): string {
  return `${Math.floor(h / 100)}.${String(h % 100).padStart(2, "0")}`;
}
export function formatKg(grams: number): string {
  const tenths = Math.round(grams / 100);
  return `${groupThousands(Math.floor(tenths / 10))}.${tenths % 10} kg`;
}
export function formatTonnes(grams: number): string {
  const tenths = Math.round(grams / 100000);
  return `${groupThousands(Math.floor(tenths / 10))}.${tenths % 10} t`;
}
/** Parse "6.4" into 6400 grams with no float maths. Returns null if invalid. */
export function parseKgToGrams(input: string): number | null {
  const s = input.trim().replace(",", ".");
  if (!/^\d{1,5}(\.\d{0,3})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 1000 + Number(frac.padEnd(3, "0"));
}

// ---------- Scan rules ----------
export type Guess = { group: Group; confidence: number };
export type ScanResult = { whole: Guess; quarters: Guess[]; ms: number };
export type Interpretation =
  | { kind: "fact"; group: Group; confidence: number; viaQuarters: boolean }
  | { kind: "question"; options: Group[]; confidence: number }
  | { kind: "mixed"; parts: { group: Group; share: number }[] }
  | { kind: "notBuy"; confidence: number }
  | { kind: "electronics"; confidence: number; sure: boolean }
  | { kind: "unsure" };

export const FACT_AT = 0.7;
export const QUESTION_AT = 0.5;
export const SECOND_MATERIAL_AT = 0.85;

export function interpretScan(r: ScanResult): Interpretation {
  const counting = r.quarters.filter((q) => q.confidence >= FACT_AT && !NOT_A_MATERIAL.includes(q.group));
  const byGroup = new Map<Group, { count: number; max: number }>();
  for (const q of counting) {
    const g = byGroup.get(q.group) ?? { count: 0, max: 0 };
    g.count += 1;
    g.max = Math.max(g.max, q.confidence);
    byGroup.set(q.group, g);
  }
  const ranked = [...byGroup.entries()].sort((a, b) => b[1].count - a[1].count || b[1].max - a[1].max);
  const materials = ranked.filter(([, v], i) => i === 0 || v.max >= SECOND_MATERIAL_AT);
  if (materials.length >= 2) {
    return { kind: "mixed", parts: materials.map(([group, v]) => ({ group, share: v.count })) };
  }

  let group = r.whole.group;
  let confidence = r.whole.confidence;
  let viaQuarters = false;
  if (confidence < FACT_AT) {
    const agree = new Map<Group, number[]>();
    for (const q of r.quarters) {
      if (q.confidence >= FACT_AT) agree.set(q.group, [...(agree.get(q.group) ?? []), q.confidence]);
    }
    for (const [g, list] of agree) {
      if (list.length >= 3) {
        group = g;
        confidence = Math.min(...list);
        viaQuarters = true;
      }
    }
  }

  // Electronics are not weighed and sold at a centre. Point the person to the electronics guide instead.
  if (group === "electronics" && confidence >= QUESTION_AT) {
    return { kind: "electronics", confidence, sure: confidence >= FACT_AT };
  }
  if (confidence >= FACT_AT) {
    if (group === "trash") return { kind: "notBuy", confidence };
    return { kind: "fact", group, confidence, viaQuarters };
  }
  if (confidence >= QUESTION_AT && group !== "trash") {
    const second =
      [...r.quarters].filter((q) => q.group !== group && !NOT_A_MATERIAL.includes(q.group)).sort((a, b) => b.confidence - a.confidence)[0]
        ?.group ?? (group === "cardboard" ? "paper" : "cardboard");
    return { kind: "question", options: [group, second], confidence };
  }
  return { kind: "unsure" };
}

/** CO2e in grams, shown as kg below a tonne and as tonnes above. */
export function formatCo2Grams(grams: number): string {
  if (grams >= 1_000_000) return `${(grams / 1_000_000).toFixed(1)} t CO2e`;
  return `${Math.round(grams / 1000)} kg CO2e`;
}

// ---------- Database codes ----------
/** The app's material names against the codes stored in the database. */
export const CODE_BY_MATERIAL: Record<Material, string> = {
  cans: "CAN_AL",
  pet: "PET",
  hdpe: "HDPE",
  cardboard: "CARDBOARD",
  paper: "PAPER_WHITE",
  glass: "GLASS",
};
export const MATERIAL_BY_CODE: Record<string, Material> = Object.fromEntries(
  (Object.entries(CODE_BY_MATERIAL) as [Material, string][]).map(([m, c]) => [c, m]),
);

/** Parse "3.50" into 350 cents with no float maths. Returns null if invalid or zero. */
export function parseRandToCents(input: string): number | null {
  const s = input.trim().replace(",", ".");
  if (!/^\d{1,4}(\.\d{0,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return cents > 0 ? cents : null;
}

/** "orlando-east" becomes "Orlando East". Text that already has spaces or capitals is left alone. */
export function prettyArea(s: string): string {
  if (/[\s]|[A-Z]/.test(s)) return s;
  return s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
