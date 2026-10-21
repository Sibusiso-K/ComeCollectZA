// Says whether the sales on screen are the reclaimer's own, or sample receipts.
export function ReceiptNotice({ source }: { source: "live" | "sample" }) {
  return (
    <p className="rounded-xl border border-line bg-gold-soft px-3 py-2 text-sm text-ink">
      {source === "live" ? (
        <>
          <span className="font-bold">Your sales.</span> The last ten sales recorded for your code.
        </>
      ) : (
        <>
          <span className="font-bold">Sample receipts.</span> Sign in to see the sales recorded for your code.
        </>
      )}
    </p>
  );
}
