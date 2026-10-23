import { BoardNotice } from "@/components/board-notice";
import { getBoard } from "@/lib/board";
import { MATERIALS, type MaterialCode } from "@/lib/materials";
import { MARKET_CHECKED, MARKET_RANGES, SERVICE_FEE_CENTS_PER_KG } from "@/lib/market-prices";
import { formatPricePerKg, formatPricePerTonne } from "@/lib/money";

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
              <span className="flex flex-col items-end">
                <span className="font-mono tabular-nums">{formatPricePerKg(row.cents_per_kg)}</span>
                <span className="font-mono text-xs tabular-nums text-muted">{formatPricePerTonne(row.cents_per_kg)}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <section className="grid gap-2" aria-labelledby="market-heading">
        <h2 id="market-heading" className="font-display text-lg font-extrabold">
          What centres pay across South Africa
        </h2>
        <p className="text-sm text-muted">
          Public 2026 ranges per tonne, checked {MARKET_CHECKED}. Your centre sets its own price by grade and
          cleanliness. On top of the price, producers owe reclaimers a service fee of{" "}
          {formatPricePerTonne(SERVICE_FEE_CENTS_PER_KG)}.
        </p>
        <ul className="grid gap-2">
          {MARKET_RANGES.map((range) => (
            <li key={range.material} className="rounded-xl border border-line bg-surface px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-bold">{MATERIALS[range.material].label}</span>
                <span className="font-mono text-sm tabular-nums">
                  {formatPricePerTonne(range.lowCentsPerKg).replace("/t", "")} to {formatPricePerTonne(range.highCentsPerKg)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{range.note}</p>
              <p className="mt-1 text-xs text-muted">
                Sources:{" "}
                {range.sources.map((source, i) => (
                  <span key={source.url}>
                    {i > 0 && ", "}
                    <a href={source.url} className="underline" rel="noopener noreferrer" target="_blank">
                      {source.name}
                    </a>{" "}
                    ({source.date})
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
