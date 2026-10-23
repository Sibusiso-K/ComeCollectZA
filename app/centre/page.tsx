import { ShellNotice } from "@/components/shell-notice";
import { ReclaimerCodeField } from "@/components/reclaimer-code-field";
import { DEMO_SALES } from "@/lib/demo";
import { MATERIALS } from "@/lib/materials";
import { formatRand } from "@/lib/money";

// Buy-back centre console, for tablets at the yard. Scanning and saving sales are not wired yet.
export default function CentrePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-6">
      <ShellNotice>Centre console. Scanning and saving sales are not connected yet.</ShellNotice>
      <h1 className="font-display text-3xl font-extrabold">Demo Centre Orlando East</h1>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">Scan a reclaimer</h2>
        <ReclaimerCodeField />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Recent sales</h2>
        <ul className="grid gap-2">
          {DEMO_SALES.map((sale) => (
            <li key={sale.id} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
              <div className="flex flex-col">
                <span className="font-bold">{MATERIALS[sale.material as Exclude<typeof sale.material, "OTHER">].label}</span>
                <span className="text-xs text-muted">{sale.kg} kg · {sale.when}</span>
              </div>
              <span className="font-mono tabular-nums">{formatRand(sale.cents)}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
