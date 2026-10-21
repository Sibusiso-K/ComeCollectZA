import { ShellNotice } from "@/components/shell-notice";
import { BOARD } from "@/lib/demo";
import { MATERIALS } from "@/lib/materials";
import { formatPricePerKg } from "@/lib/money";

const TREND_LABEL = { up: "Rising", down: "Falling", flat: "Steady" } as const;

export default function PricesPage() {
  return (
    <>
      <ShellNotice>Prices are example board prices, not a live feed.</ShellNotice>
      <h1 className="font-display text-2xl font-extrabold">Board prices</h1>
      <ul className="grid gap-2">
        {BOARD.map((row) => {
          const material = MATERIALS[row.code as Exclude<typeof row.code, "OTHER">];
          return (
            <li key={row.code} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
              <span className="h-10 w-1.5 rounded-full" style={{ background: "var(--" + material.token + ")" }} aria-hidden="true" />
              <div className="flex flex-1 flex-col">
                <span className="font-bold">{material.label}</span>
                <span className="text-xs text-muted">{TREND_LABEL[row.trend]}</span>
              </div>
              <span className="font-mono tabular-nums">{formatPricePerKg(row.cents_per_kg)}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
