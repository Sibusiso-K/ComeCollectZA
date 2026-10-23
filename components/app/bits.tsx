"use client";

import { useState, type ReactNode } from "react";
import { Box, ChevronRight, CupSoda, FileText, Milk, Package, Wine } from "lucide-react";
import { useT, usePrefs } from "@/lib/app/prefs";
import type { Material } from "@/lib/app/logic";
import { cn } from "@/lib/utils";

export const MATERIAL_BG: Record<Material, string> = {
  cans: "bg-m-cans",
  pet: "bg-m-pet",
  hdpe: "bg-m-hdpe",
  cardboard: "bg-m-cardboard",
  paper: "bg-m-paper",
  glass: "bg-m-glass",
};
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
    <span className={cn("grid shrink-0 place-items-center rounded-full text-on-bright", MATERIAL_BG[m])} style={{ width: size, height: size }} aria-hidden>
      <I size={size * 0.5} />
    </span>
  );
}

export function DemoLabel({ className, children }: { className?: string; children?: ReactNode }) {
  const t = useT();
  return (
    <span className={cn("inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground", className)}>
      {children ?? t("Demo data")}
    </span>
  );
}

export function Sticker({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("sticker", className)}>{children}</span>;
}

export function Card({ children, className, glass }: { children: ReactNode; className?: string; glass?: boolean }) {
  return <section className={cn("rounded-3xl p-5", glass ? "glass" : "bg-card shadow-[var(--shadow-soft)]", className)}>{children}</section>;
}

export function DeltaPill({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-highlight px-2.5 py-1 text-sm font-bold text-on-bright">▲ {children}</span>;
}

export function Bar({ value, max, color = "var(--primary)" }: { value: number; max: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" role="presentation">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
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
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(len - 2, 0)} ${c}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {center && <div className="absolute inset-0 grid place-items-center text-center">{center}</div>}
    </div>
  );
}

export function Ring({ value, max = 100, size = 96 }: { value: number; max?: number; size?: number }) {
  return (
    <Donut
      size={size}
      stroke={10}
      parts={[
        { value, color: "var(--primary)" },
        { value: max - value, color: "transparent" },
      ]}
      center={<span className="font-dot text-2xl">{value}</span>}
    />
  );
}

export function Spark({ values, color = "var(--primary)" }: { values: number[]; color?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / (max - min || 1)) * 26 - 2}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
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
          className={cn(
            "min-h-12 rounded-full px-3 font-bold transition-colors",
            value === o.value ? "bg-foreground text-background" : "text-muted-foreground",
          )}
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
    ghost: "border border-border bg-card text-foreground",
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full px-6 font-display text-lg font-bold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
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
    <button onClick={onClick} className="flex w-full items-center gap-4 rounded-3xl bg-card p-4 text-left shadow-[var(--shadow-soft)]">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-highlight text-on-bright">{icon}</span>
      <span className="min-w-0">
        <span className="block font-display text-lg font-bold">{title}</span>
        <span className="block text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}
