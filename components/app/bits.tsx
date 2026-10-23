"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";
import { Box, ChevronRight, CupSoda, FileText, Milk, Package, Wine } from "lucide-react";
import { useT, usePrefs } from "@/lib/app/prefs";
import type { Material } from "@/lib/app/logic";
import { cn } from "@/lib/utils";

export const MATERIAL_VAR: Record<Material, string> = {
  cans: "var(--m-cans)",
  pet: "var(--m-pet)",
  hdpe: "var(--m-hdpe)",
  cardboard: "var(--m-cardboard)",
  paper: "var(--m-paper)",
  glass: "var(--m-glass)",
};
const ICON: Record<Material, typeof Box> = { cans: CupSoda, pet: Milk, hdpe: Milk, cardboard: Package, paper: FileText, glass: Wine };

export function MaterialBadge({ m, size = 44 }: { m: Material; size?: number }) {
  const I = ICON[m];
  return (
    <span className="grid shrink-0 place-items-center rounded-full text-on-bright" style={{ width: size, height: size, background: MATERIAL_VAR[m] }} aria-hidden>
      <I size={size * 0.5} />
    </span>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-bold tracking-wide text-muted-foreground", className)}>
      {children}
    </span>
  );
}

/** Says when a screen is showing the copy saved on the phone instead of fresh data. */
export function SavedNote({ fromCache, savedAt }: { fromCache: boolean; savedAt: string | null }) {
  const t = useT();
  if (!fromCache) return null;
  return (
    <Pill>
      {savedAt ? t("Saved copy from {date}", { date: new Date(savedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) }) : t("No saved copy yet")}
    </Pill>
  );
}

export function Sticker({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("sticker", className)}>{children}</span>;
}

/** Frosted glass, as in the design reference. Pass solid for a filled accent card. */
export function Card({ children, className, solid, ...rest }: { children: ReactNode; className?: string; solid?: boolean } & HTMLAttributes<HTMLElement>) {
  return (
    <section {...rest} className={cn("rounded-3xl p-5", solid ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]" : "glass", className)}>
      {children}
    </section>
  );
}

export function Bar({ value, max, color = "var(--primary)" }: { value: number; max: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" role="presentation">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/** A horizontal bar from red (low) to green (high) with a marker, like the weather bar in the reference. */
export function RangeBar({ position, label }: { position: number; label: string }) {
  const p = Math.max(0, Math.min(1, position));
  return (
    <div role="img" aria-label={label} className="relative h-3 w-full rounded-full" style={{ background: "linear-gradient(90deg, var(--g3), var(--g2) 50%, var(--g1))" }}>
      <span className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-background bg-foreground" style={{ left: `${p * 100}%` }} />
    </div>
  );
}

/** Hides heavy visuals behind a tap when Data saver is on. */
export function SaverGate({ children, label }: { children: ReactNode; label?: string }) {
  const { dataSaver } = usePrefs();
  const t = useT();
  const [shown, setShown] = useState(false);
  if (!dataSaver || shown) return <>{children}</>;
  return (
    <button onClick={() => setShown(true)} className="grid min-h-24 w-full place-items-center rounded-2xl border border-dashed border-border text-muted-foreground">
      {label ?? t("Tap to show chart")}
    </button>
  );
}

export function Donut({
  parts,
  center,
  size = 160,
  stroke = 18,
}: {
  parts: { value: number; color: string }[];
  center?: ReactNode;
  size?: number;
  stroke?: number;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--secondary)" strokeWidth={stroke} />
        {parts.map((p, i) => {
          const len = (p.value / total) * c;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(len - 2, 0)} ${c}`} strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
      </svg>
      {center && <div className="absolute inset-0 grid place-items-center text-center">{center}</div>}
    </div>
  );
}

/** The half-circle gauge from the reference, red on the left to green on the right. */
export function Gauge({ value, max = 100, label, caption }: { value: number; max?: number; label: string; caption: string }) {
  const w = 240;
  const r = 98;
  const cx = w / 2;
  const cy = 120;
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const len = Math.PI * r;
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative mx-auto w-full max-w-60" role="img" aria-label={`${label}: ${value} of ${max}`}>
      <svg viewBox={`0 0 ${w} 132`} className="w-full" aria-hidden>
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--g3)" />
            <stop offset="0.5" stopColor="var(--g2)" />
            <stop offset="1" stopColor="var(--g1)" />
          </linearGradient>
        </defs>
        <path d={arc} fill="none" stroke="var(--secondary)" strokeWidth="18" strokeLinecap="round" />
        <path d={arc} fill="none" stroke="url(#gauge-grad)" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${len * frac} ${len}`} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-xs text-muted-foreground">{caption}</p>
        <p className="text-4xl font-extrabold tabular-nums leading-none">{value}%</p>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="grid rounded-full bg-secondary p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("min-h-12 rounded-full px-3 font-bold transition-colors", value === o.value ? "bg-foreground text-background" : "text-muted-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PillButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "cta" | "ghost";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const v = {
    primary: "bg-primary text-primary-foreground",
    cta: "bg-cta text-cta-foreground",
    ghost: "glass text-foreground",
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-lg font-extrabold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        v,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ListRow({
  left,
  title,
  subtitle,
  right,
  chevron = true,
}: {
  left: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  chevron?: boolean;
}) {
  return (
    <div className="flex min-h-16 items-center gap-3 py-2">
      {left}
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold">{title}</div>
        {subtitle && <div className="truncate text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0 text-right">{right}</div>}
      {chevron && <ChevronRight className="shrink-0 text-muted-foreground" size={20} aria-hidden />}
    </div>
  );
}

export function ActionCard({ icon, title, subtitle, onClick }: { icon: ReactNode; title: string; subtitle: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="glass flex w-full items-center gap-4 rounded-3xl p-4 text-left">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-highlight text-on-bright">{icon}</span>
      <span className="min-w-0">
        <span className="block text-lg font-extrabold">{title}</span>
        <span className="block text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="glass space-y-3 rounded-3xl p-6 text-center">
      <p className="text-xl font-extrabold">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

export const inputClass =
  "min-h-14 w-full rounded-2xl border border-border bg-secondary px-4 text-base text-foreground placeholder:text-muted-foreground";
