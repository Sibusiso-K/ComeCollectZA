import { createClient } from "@supabase/supabase-js";
import { BOARD } from "./demo";
import type { MaterialCode } from "./materials";

export type BoardRow = {
  centre_name: string;
  area_id: string;
  material: MaterialCode;
  cents_per_kg: number;
};

export type Board = {
  source: "live" | "demo";
  rows: BoardRow[];
};

// Reads the public board_prices() function with the publishable key, so no sign-in is needed.
// Falls back to built-in sample prices when the database is not configured, cannot be reached, or is empty.
export async function getBoard(): Promise<Board> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return sampleBoard();

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc("board_prices");
    if (error || !data || data.length === 0) return sampleBoard();

    return {
      source: "live",
      rows: data.map((row: { centre_name: string; area_id: string; material: string; cents_per_kg: number }) => ({
        centre_name: row.centre_name,
        area_id: row.area_id,
        material: row.material as MaterialCode,
        cents_per_kg: row.cents_per_kg,
      })),
    };
  } catch {
    return sampleBoard();
  }
}

function sampleBoard(): Board {
  return {
    source: "demo",
    rows: BOARD.map((row) => ({
      centre_name: "Sample price",
      area_id: "",
      material: row.code,
      cents_per_kg: row.cents_per_kg,
    })),
  };
}

// Best (highest) row for each material across all centres.
export function bestRowByMaterial(rows: BoardRow[]): Partial<Record<MaterialCode, BoardRow>> {
  const best: Partial<Record<MaterialCode, BoardRow>> = {};
  for (const row of rows) {
    const current = best[row.material];
    if (!current || row.cents_per_kg > current.cents_per_kg) best[row.material] = row;
  }
  return best;
}

// Best price in cents for each material, as used by the sell estimate.
export function bestCentsByMaterial(rows: BoardRow[]): Partial<Record<MaterialCode, number>> {
  const best: Partial<Record<MaterialCode, number>> = {};
  for (const [code, row] of Object.entries(bestRowByMaterial(rows))) {
    best[code as MaterialCode] = row.cents_per_kg;
  }
  return best;
}
