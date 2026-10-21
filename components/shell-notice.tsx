// Shown on every screen that still runs on demo data, so nobody mistakes it for live money.
export function ShellNotice({ children }: { children?: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-line bg-gold-soft px-3 py-2 text-sm text-ink">
      <span className="font-bold">Demo data.</span> {children ?? "Not connected to live prices or payments yet."}
    </p>
  );
}
