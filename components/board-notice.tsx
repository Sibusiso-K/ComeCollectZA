// Says where the prices on screen came from, so live and sample prices are never confused.
export function BoardNotice({ source }: { source: "live" | "demo" }) {
  return (
    <p className="rounded-xl border border-line bg-gold-soft px-3 py-2 text-sm text-ink">
      {source === "live" ? (
        <>
          <span className="font-bold">Live prices.</span> Read from the database. The centres and prices are still demo data.
        </>
      ) : (
        <>
          <span className="font-bold">Sample prices.</span> The database could not be reached, so these are built-in examples.
        </>
      )}
    </p>
  );
}
