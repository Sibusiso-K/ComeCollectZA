// Avatar with a status ring. Reclaimers use initials or an illustrated avatar, never a photo of a person.
type Status = "registered" | "pending" | "none" | "alert";

const ring: Record<Status, string> = {
  registered: "var(--ok)",
  pending: "var(--gold)",
  none: "var(--line)",
  alert: "var(--bad)",
};

export function Avatar({
  initials,
  status,
  token = "green",
  label,
}: {
  initials: string;
  status: Status;
  token?: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center text-xs text-muted">
      <div
        role="img"
        aria-label={label}
        className={"flex h-16 w-16 items-center justify-center rounded-full border-4 font-display text-xl font-extrabold text-on-green " + (status === "pending" ? "border-dashed" : "")}
        style={{ background: "var(--" + token + ")", borderColor: ring[status] }}
      >
        {initials}
      </div>
    </div>
  );
}
