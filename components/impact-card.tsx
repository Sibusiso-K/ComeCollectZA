import { formatCo2e, type Impact } from "@/lib/impact";

// Plain-language impact: material kept out of landfill, CO2e avoided and earnings as minimum-wage work days.
export function ImpactCard({ impact, title, note }: { impact: Impact; title: string; note: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-sunk p-3">
          <dt className="text-xs text-muted">Kept from landfill</dt>
          <dd className="font-mono text-lg tabular-nums">{Math.round(impact.kg).toLocaleString("en-US")} kg</dd>
        </div>
        <div className="rounded-xl bg-sunk p-3">
          <dt className="text-xs text-muted">CO2e avoided</dt>
          <dd className="font-mono text-lg tabular-nums">{formatCo2e(impact.co2eKg).replace(" CO2e", "")}</dd>
        </div>
        <div className="rounded-xl bg-sunk p-3">
          <dt className="text-xs text-muted">Work days paid</dt>
          <dd className="font-mono text-lg tabular-nums">{impact.workDays.toLocaleString("en-US", { maximumFractionDigits: 1 })}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted">{note}</p>
    </section>
  );
}
