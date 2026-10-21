"use client";

// Large material picker. The colour bar and selected ring use the material's own token everywhere.
export function MaterialTile({
  label,
  token,
  selected,
  onSelect,
}: {
  label: string;
  token: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={
        "relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 bg-surface px-1 text-center text-sm font-bold text-ink focus-visible:outline-3 focus-visible:outline-gold " +
        (selected ? "" : "border-line")
      }
      style={selected ? { borderColor: "var(--" + token + ")", boxShadow: "0 0 0 3px color-mix(in srgb, var(--" + token + ") 30%, transparent)" } : undefined}
    >
      <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: "var(--" + token + ")" }} />
      {label}
    </button>
  );
}
