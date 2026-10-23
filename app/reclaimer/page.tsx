import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { BoardNotice } from "@/components/board-notice";
import { bestRowByMaterial, getBoard } from "@/lib/board";
import { DEMO_RECLAIMER } from "@/lib/demo";
import { MATERIALS, type MaterialCode } from "@/lib/materials";
import { formatPricePerKg } from "@/lib/money";

export const revalidate = 300;

const FEATURED: MaterialCode[] = ["PET", "CAN_AL", "CARDBOARD"];

export default async function ReclaimerHome() {
  const board = await getBoard();
  const best = bestRowByMaterial(board.rows);
  const cans = best.CAN_AL;

  return (
    <>
      <BoardNotice source={board.source} />

      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Sawubona</p>
          <h1 className="font-display text-2xl font-extrabold">{DEMO_RECLAIMER.name}</h1>
        </div>
        <Avatar initials={DEMO_RECLAIMER.initials} status={DEMO_RECLAIMER.status} label="Registered with SAWPRS" />
      </header>

      <section className="flex flex-col gap-2 rounded-2xl bg-board p-5 text-chalk">
        <p className="font-mono text-xs uppercase tracking-wider text-chalk-dim">Best price for cans today</p>
        {cans ? (
          <>
            <p className="font-mono text-4xl tabular-nums">{formatPricePerKg(cans.cents_per_kg)}</p>
            <p className="text-sm">{cans.centre_name}</p>
          </>
        ) : (
          <p className="text-sm">No price for cans yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Board prices</h2>
          <Link href="/reclaimer/prices" className="text-sm font-bold text-green">
            See all
          </Link>
        </div>
        <ul className="grid gap-2">
          {FEATURED.map((code) => {
            const row = best[code];
            return (
              <li key={code} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
                <span className="font-bold">{MATERIALS[code as Exclude<MaterialCode, "OTHER">].label}</span>
                <span className="font-mono tabular-nums">{row ? formatPricePerKg(row.cents_per_kg) : "No price"}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
