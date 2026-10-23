"use client";

import { useEffect, useState } from "react";
import { AppScreen, PageTitle } from "@/components/app/shell";
import { Card, DemoLabel, MaterialBadge } from "@/components/app/bits";
import { useT } from "@/lib/app/prefs";
import { NATIONAL_RANGES, type BoardPrice } from "@/lib/app/demo-data";
import { getBoardPrices } from "@/lib/app/api";
import { MATERIAL_LABEL, MATERIALS, formatPerKg, formatPerTonne, formatWholeRand, type Material } from "@/lib/app/logic";

export default function Prices() {
  const t = useT();
  const [prices, setPrices] = useState<BoardPrice[]>([]);
  const [updated, setUpdated] = useState("");

  useEffect(() => {
    getBoardPrices().then((d) => {
      setPrices(d.prices);
      setUpdated(d.updated);
    });
  }, []);

  return (
    <AppScreen>
      <PageTitle aside={<DemoLabel />}>{t("Prices")}</PageTitle>
      <p className="text-sm text-muted-foreground">{t("Board prices, last updated {date}", { date: updated })}</p>

      <section className="space-y-3" aria-labelledby="board">
        <h2 id="board" className="font-display text-2xl font-bold">{t("Board prices")}</h2>
        {MATERIALS.map((m: Material) => {
          const rows = prices.filter((p) => p.material === m).sort((a, b) => b.centsPerKg - a.centsPerKg);
          return (
            <Card key={m} className="space-y-2 p-4">
              <div className="flex items-center gap-3">
                <MaterialBadge m={m} />
                <p className="font-display text-lg font-bold">{t(MATERIAL_LABEL[m])}</p>
              </div>
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.centre} className="flex items-center justify-between py-2">
                    <span>{r.centre}</span>
                    <span className="text-right font-mono tabular-nums">
                      {formatPerKg(r.centsPerKg)}
                      <span className="block text-xs text-muted-foreground">{formatPerTonne(r.centsPerKg)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3" aria-labelledby="national">
        <h2 id="national" className="font-display text-2xl font-bold">{t("What centres pay across South Africa")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("Public 2026 ranges per tonne. Your centre sets its own price by grade and cleanliness.")}
        </p>
        {NATIONAL_RANGES.map((r) => (
          <Card key={r.material} className="space-y-1 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-bold">{t(MATERIAL_LABEL[r.material])}</span>
              <span className="font-mono text-sm tabular-nums">
                {formatWholeRand(r.minRandT)} to {formatWholeRand(r.maxRandT)}/t
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t(r.note)}</p>
            <p className="text-xs text-muted-foreground">{r.sources}</p>
          </Card>
        ))}
        <p className="text-sm font-bold">{t("Producers owe reclaimers a service fee of R150 per tonne on top of the price.")}</p>
      </section>
    </AppScreen>
  );
}
