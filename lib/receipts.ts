import { createClient } from "@/lib/supabase/server";
import { DEMO_SALES } from "./demo";
import type { MaterialCode } from "./materials";

// Demo service fee rate, matching the sales route. 25 cents per kilogram.
const FEE_CENTS_PER_KG = 25;

export type FeeStatus = "owed" | "paid" | "missing";

export type Receipt = {
  id: string;
  material: MaterialCode;
  kg: number;
  cents: number;
  feeCents: number;
  feeStatus: FeeStatus;
  centre: string;
  when: string;
};

export type ReceiptSource = "live" | "sample";

export type Receipts = {
  source: ReceiptSource;
  receipts: Receipt[];
};

// Signed-in reclaimers see their own sales, with row level security applied by the database.
// Anyone else, or any read that fails, gets labelled sample receipts.
export async function getReceipts(): Promise<Receipts> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { source: "sample", receipts: sampleReceipts() };

    const { data, error } = await supabase
      .from("transactions")
      .select("id, material, weight_g, amount_cents, created_at, centres(name), service_fees(cents, status)")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error || !data) return { source: "sample", receipts: sampleReceipts() };

    return {
      source: "live",
      receipts: data.map((row) => {
        const centre = first(row.centres) as { name: string } | undefined;
        const fee = first(row.service_fees) as { cents: number; status: FeeStatus } | undefined;
        return {
          id: row.id,
          material: row.material as MaterialCode,
          kg: row.weight_g / 1000,
          cents: row.amount_cents,
          feeCents: fee?.cents ?? 0,
          feeStatus: fee?.status ?? "owed",
          centre: centre?.name ?? "Buy-back centre",
          when: formatWhen(row.created_at),
        };
      }),
    };
  } catch {
    return { source: "sample", receipts: sampleReceipts() };
  }
}

export function feeTotals(receipts: Receipt[]) {
  const totals = { paid: 0, owed: 0, missing: 0 };
  for (const receipt of receipts) totals[receipt.feeStatus] += receipt.feeCents;
  return totals;
}

function sampleReceipts(): Receipt[] {
  return DEMO_SALES.map((sale) => ({
    id: sale.id,
    material: sale.material,
    kg: sale.kg,
    cents: sale.cents,
    feeCents: Math.floor(sale.kg * FEE_CENTS_PER_KG),
    feeStatus: "owed" as const,
    centre: sale.centre,
    when: sale.when,
  }));
}

// Embedded relations come back as an object or an array depending on the relationship. Handle both.
function first<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
}
