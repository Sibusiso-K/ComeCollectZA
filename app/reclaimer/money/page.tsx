import { Button } from "@/components/ui/button";
import { MoneyMoment } from "@/components/money-moment";
import { ReceiptNotice } from "@/components/receipt-notice";
import { feeTotals, getReceipts } from "@/lib/receipts";
import { MATERIALS, type MaterialCode } from "@/lib/materials";
import { formatRand } from "@/lib/money";

export default async function MoneyPage() {
  const { source, receipts } = await getReceipts();
  const latest = receipts[0];
  const totals = feeTotals(receipts);

  return (
    <>
      <ReceiptNotice source={source} />
      <h1 className="font-display text-2xl font-extrabold">My money</h1>

      {latest ? (
        <MoneyMoment
          key={latest.id}
          cents={latest.cents}
          caption={latest.kg + " kg of " + MATERIALS[latest.material as Exclude<MaterialCode, "OTHER">].label.toLowerCase() + " at " + latest.centre}
        />
      ) : (
        <section className="rounded-3xl bg-surface p-6 text-center text-sm text-muted">No sales recorded yet.</section>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-display text-lg font-bold">Service fees</h2>
        <p className="text-xs text-muted">Totals for the sales shown.</p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted">Paid</dt>
          <dd className="text-right font-mono tabular-nums">{formatRand(totals.paid)}</dd>
          <dt className="text-muted">Still owed</dt>
          <dd className="text-right font-mono tabular-nums">{formatRand(totals.owed)}</dd>
          <dt className="text-muted">Missing</dt>
          <dd className="text-right font-mono tabular-nums text-bad">{formatRand(totals.missing)}</dd>
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-bold">Recent sales</h2>
        <ul className="grid gap-2">
          {receipts.map((receipt) => (
            <li key={receipt.id} className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">
                  {MATERIALS[receipt.material as Exclude<MaterialCode, "OTHER">].label} · {receipt.kg.toFixed(1)} kg
                </span>
                <span className="font-mono tabular-nums">{formatRand(receipt.cents)}</span>
              </div>
              <span className="text-xs text-muted">
                {receipt.centre} · {receipt.when}
              </span>
              <span className="text-xs text-muted">
                Service fee {formatRand(receipt.feeCents)} · {receipt.feeStatus}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Button variant="secondary" className="w-full" disabled>
        Get my statement (coming soon)
      </Button>
    </>
  );
}
