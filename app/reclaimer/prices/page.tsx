import { BoardNotice } from "@/components/board-notice";
import { getBoard } from "@/lib/board";
import { MATERIALS, type MaterialCode } from "@/lib/materials";
import { formatPricePerKg } from "@/lib/money";

export const revalidate = 300;

export default async function PricesPage() {
  const board = await getBoard();
  const rows = [...board.rows].sort(
    (a, b) => a.material.localeCompare(b.material) || b.cents_per_kg - a.cents_per_kg,
  );

  return (
    <>
      <BoardNotice source={board.source} />
      <h1 className="font-display text-2xl font-extrabold">Board prices</h1>
      <ul className="grid gap-2">
        {rows.map((row) => {
          const material = MATERIALS[row.material as Exclude<MaterialCode, "OTHER">];
          return (
            <li
              key={row.material + row.centre_name}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"
            >
              <span className="h-10 w-1.5 rounded-full" style={{ background: "var(--" + material.token + ")" }} aria-hidden="true" />
              <div className="flex flex-1 flex-col">
                <span className="font-bold">{material.label}</span>
                <span className="text-xs text-muted">{row.centre_name}</span>
              </div>
              <span className="font-mono tabular-nums">{formatPricePerKg(row.cents_per_kg)}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
