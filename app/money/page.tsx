"use client";

import { useEffect, useState } from "react";
import { AppScreen, PageTitle } from "@/components/app/shell";
import { Card, DemoLabel, ListRow, MaterialBadge, Sticker } from "@/components/app/bits";
import { useT } from "@/lib/app/prefs";
import { getImpact, getMyMoney } from "@/lib/app/api";
import { RECENT_SALES, type Sale } from "@/lib/app/demo-data";
import {
  MATERIAL_LABEL,
  formatHundredths,
  formatKg,
  formatRand,
  formatCo2Grams,
  formatTonnes,
  saleCents,
  workDaysHundredths,
  type Material,
} from "@/lib/app/logic";

/** Counts up to the latest sale with timers, not requestAnimationFrame, so it still finishes in a hidden tab. */
function useCountUp(target: number, reduced: boolean) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    const steps = 20;
    let i = 0;
    setValue(0);
    const id = setInterval(() => {
      i += 1;
      setValue(i >= steps ? target : Math.round((target * i) / steps));
      if (i >= steps) clearInterval(id);
    }, 30);
    const settle = setTimeout(() => setValue(target), 900);
    return () => {
      clearInterval(id);
      clearTimeout(settle);
    };
  }, [target, reduced]);
  return value;
}

export default function Money() {
  const t = useT();
  const [fees, setFees] = useState({ paidCents: 0, owedCents: 0, missingCents: 0 });
  const [monthCents, setMonthCents] = useState(0);
  const [sales, setSales] = useState<Sale[]>([]);
  const [impact, setImpact] = useState<{ totalGrams: number; co2Grams: number; payCents: number } | null>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    getMyMoney().then((m) => {
      setFees({ paidCents: m.fees.paidCents, owedCents: m.fees.owedCents, missingCents: m.fees.missingCents });
      setMonthCents(m.monthCents);
      setSales(m.sales);
    });
    getImpact("month").then((i) => setImpact(i));
  }, []);

  const latest = sales[0] ?? RECENT_SALES[0];
  const latestCents = saleCents(latest.grams, latest.centsPerKg);
  const shown = useCountUp(latestCents, reduced);
  const workDays = impact ? formatHundredths(workDaysHundredths(impact.payCents)) : "…";

  return (
    <AppScreen>
      <PageTitle aside={<DemoLabel />}>{t("My money")}</PageTitle>

      <Card className="space-y-2 bg-primary text-primary-foreground">
        <p className="text-sm opacity-80">
          {t("Latest sale: {kg} of {material} at {centre}", {
            kg: formatKg(latest.grams),
            material: t(MATERIAL_LABEL[latest.material]),
            centre: latest.centre,
          })}
        </p>
        <p className="font-dot text-5xl tabular-nums" aria-live="polite">{formatRand(shown)}</p>
        <p className="text-sm opacity-80">{t("This month: {amount}", { amount: formatRand(monthCents) })}</p>
      </Card>

      <section className="grid grid-cols-3 gap-2 text-center" aria-labelledby="fees">
        <h2 id="fees" className="sr-only">{t("Service fees")}</h2>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">{t("Paid")}</p>
          <p className="font-mono text-sm tabular-nums">{formatRand(fees.paidCents)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">{t("Still owed")}</p>
          <p className="font-mono text-sm tabular-nums">{formatRand(fees.owedCents)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">{t("Missing")}</p>
          <p className="font-mono text-sm tabular-nums text-warning">{formatRand(fees.missingCents)}</p>
        </Card>
      </section>

      <Card className="space-y-3" aria-labelledby="impact">
        <div className="flex items-center justify-between gap-2">
          <h2 id="impact" className="font-display text-xl font-bold">{t("My impact")}</h2>
          <Sticker>{t("This month")}</Sticker>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-secondary p-3">
            <p className="text-xs text-muted-foreground">{t("Kept from landfill")}</p>
            <p className="font-dot text-lg">{impact ? formatTonnes(impact.totalGrams) : "…"}</p>
          </div>
          <div className="rounded-2xl bg-secondary p-3">
            <p className="text-xs text-muted-foreground">{t("CO2e avoided")}</p>
            <p className="font-dot text-lg">{impact ? formatCo2Grams(impact.co2Grams).replace(" CO2e", "") : "…"}</p>
          </div>
          <div className="rounded-2xl bg-secondary p-3">
            <p className="text-xs text-muted-foreground">{t("Work days paid")}</p>
            <p className="font-dot text-lg">{workDays}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("CO2e from US EPA WARM v16 factors. Work days use the 2026 minimum wage of R30.23 an hour.")}
        </p>
      </Card>

      <section className="space-y-2" aria-labelledby="recent">
        <h2 id="recent" className="font-display text-xl font-bold">{t("Recent sales")}</h2>
        <ul className="divide-y divide-border">
            {(sales.length ? sales : RECENT_SALES).map((s) => (
              <li key={s.id}>
                <ListRow
                  chevron={false}
                  left={<MaterialBadge m={s.material as Material} size={40} />}
                  title={`${t(MATERIAL_LABEL[s.material])} · ${formatKg(s.grams)}`}
                  subtitle={`${s.centre} · ${s.date} · ${t("Fee")}: ${t(s.fee)}`}
                  right={<span className="font-mono tabular-nums">{formatRand(saleCents(s.grams, s.centsPerKg))}</span>}
                />
              </li>
            ))}
        </ul>
      </section>

    </AppScreen>
  );
}
