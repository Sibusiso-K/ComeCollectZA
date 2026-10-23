import { ImpactCard } from "@/components/impact-card";
import { ShellNotice } from "@/components/shell-notice";
import { impactOf, WORK_DAY_CENTS } from "@/lib/impact";
import { PRO_ANOMALIES, PRO_SUMMARY } from "@/lib/demo";
import { MATERIALS } from "@/lib/materials";
import { formatRand } from "@/lib/money";

// PRO dashboard, desktop layout. Shows aggregates only, never names or personal data.
export default function ProPage() {
  const maxTonnes = Math.max(...PRO_SUMMARY.by_material.map((m) => m.tonnes));
  const impact = {
    ...impactOf(PRO_SUMMARY.by_material.map((m) => ({ material: m.code, kg: m.tonnes * 1000 }))),
    workDays: PRO_SUMMARY.paid_to_reclaimers_cents / WORK_DAY_CENTS,
  };
  const youthShare = Math.round((PRO_SUMMARY.youth_reclaimers / PRO_SUMMARY.active_reclaimers) * 100);

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-4 py-6">
      <ShellNotice>PRO dashboard. Figures are example aggregates.</ShellNotice>
      <h1 className="font-display text-3xl font-extrabold">Collections dashboard</h1>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Active reclaimers</p>
          <p className="font-mono text-3xl tabular-nums">{PRO_SUMMARY.active_reclaimers.toLocaleString("en-US")}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Tonnes this month</p>
          <p className="font-mono text-3xl tabular-nums">{PRO_SUMMARY.tonnes_total}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Fees owed</p>
          <p className="font-mono text-3xl tabular-nums">{formatRand(PRO_SUMMARY.fees_owed_cents)}</p>
        </div>
      </section>

      <ImpactCard
        impact={impact}
        title="Impact this month"
        note={
          "Youth (18 to 34): " +
          PRO_SUMMARY.youth_reclaimers.toLocaleString("en-US") +
          " of " +
          PRO_SUMMARY.active_reclaimers.toLocaleString("en-US") +
          " active reclaimers (" +
          youthShare +
          "%). CO2e from US EPA WARM v16. Work days are pay to reclaimers at the 2026 minimum wage."
        }
      />

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">Tonnes by material</h2>
        <ul className="grid gap-3">
          {PRO_SUMMARY.by_material.map((m) => {
            const material = MATERIALS[m.code as Exclude<typeof m.code, "OTHER">];
            return (
              <li key={m.code} className="grid grid-cols-[120px_1fr_64px] items-center gap-3 text-sm">
                <span className="font-bold">{material.label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-sunk">
                  <span className="block h-full rounded-full" style={{ width: (m.tonnes / maxTonnes) * 100 + "%", background: "var(--" + material.token + ")" }} />
                </span>
                <span className="text-right font-mono tabular-nums">{m.tonnes}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Review queue</h2>
        <ul className="grid gap-2">
          {PRO_ANOMALIES.map((a) => (
            <li key={a.id} className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm">{a.reason}</span>
              <span className="font-mono text-xs text-muted">{a.transaction}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
