import { MoneyMoment } from "@/components/money-moment";
import { Button } from "@/components/ui/button";
import { ShellNotice } from "@/components/shell-notice";
import { DEMO_MONTH, DEMO_SALES } from "@/lib/demo";
import { MATERIALS } from "@/lib/materials";
import { formatRand } from "@/lib/money";

export default function MoneyPage() {
  const latest = DEMO_SALES[0];

  return (
    <>
      <ShellNotice />
      <h1 className="font-display text-2xl font-extrabold">My money</h1>

      <MoneyMoment cents={latest.cents} caption={latest.kg + " kg of " + MATERIALS[latest.material as Exclude<typeof latest.material, "OTHER">].label.toLowerCase() + " at " + latest.centre} />

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-display text-lg font-bold">Service fees</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted">Paid this month</dt>
          <dd className="text-right font-mono tabular-nums">{formatRand(DEMO_MONTH.fees_paid_cents)}</dd>
          <dt className="text-muted">Still owed</dt>
          <dd className="text-right font-mono tabular-nums">{formatRand(DEMO_MONTH.fees_owed_cents)}</dd>
          <dt className="text-muted">Missing for 30+ days</dt>
          <dd className="text-right font-mono tabular-nums text-bad">{formatRand(DEMO_MONTH.fees_missing_cents)}</dd>
        </dl>
      </section>

      <Button variant="secondary" className="w-full" disabled>
        Get my statement (coming soon)
      </Button>
    </>
  );
}
