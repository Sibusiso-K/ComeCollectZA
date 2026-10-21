import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { ShellNotice } from "@/components/shell-notice";
import { BOARD, DEMO_BEST, DEMO_RECLAIMER } from "@/lib/demo";
import { MATERIALS } from "@/lib/materials";
import { formatPricePerKg } from "@/lib/money";

export default function ReclaimerHome() {
  const materialLabel = MATERIALS[DEMO_BEST.material as Exclude<typeof DEMO_BEST.material, "OTHER">].label;

  return (
    <>
      <ShellNotice />

      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Sawubona</p>
          <h1 className="font-display text-2xl font-extrabold">{DEMO_RECLAIMER.name}</h1>
        </div>
        <Avatar initials={DEMO_RECLAIMER.initials} status={DEMO_RECLAIMER.status} label="Registered with SAWPRS" />
      </header>

      <section className="flex flex-col gap-2 rounded-2xl bg-board p-5 text-chalk">
        <p className="font-mono text-xs uppercase tracking-wider text-chalk-dim">Best for your {materialLabel.toLowerCase()} today</p>
        <p className="font-mono text-4xl tabular-nums">{formatPricePerKg(DEMO_BEST.cents_per_kg)}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            {DEMO_BEST.centre} · {DEMO_BEST.distance_km} km
          </span>
          <span className="rounded-full bg-green px-3 py-1 font-bold text-on-green">Sell now</span>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Board prices</h2>
          <Link href="/reclaimer/prices" className="text-sm font-bold text-green">
            See all
          </Link>
        </div>
        <ul className="grid gap-2">
          {BOARD.slice(0, 3).map((row) => (
            <li key={row.code} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
              <span className="font-bold">{MATERIALS[row.code as Exclude<typeof row.code, "OTHER">].label}</span>
              <span className="font-mono tabular-nums">{formatPricePerKg(row.cents_per_kg)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
