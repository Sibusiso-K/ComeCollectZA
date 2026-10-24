"use client";

import { useEffect, useState } from "react";
import { AppScreen, PageTitle } from "@/components/app/shell";
import { Card, EmptyState, MaterialBadge, RangeBar, SavedNote } from "@/components/app/bits";
import { useT } from "@/lib/app/prefs";
import { getBoardPrices, type BoardPrice, type Fetched } from "@/lib/app/api";
import { MATERIALS, MATERIAL_BY_CODE, MATERIAL_LABEL, formatPerKg, formatPerTonne } from "@/lib/app/logic";
import { MARKET_CHECKED, MARKET_RANGES, SERVICE_FEE_CENTS_PER_KG } from "@/lib/market-prices";

const perTonneRange = (low: number, high: number) => `${formatPerTonne(low).replace("/t", "")} to ${formatPerTonne(high)}`;

export default function Prices() {
  const t = useT();
  const [prices, setPrices] = useState<Fetched<BoardPrice[]> | null>(null);

  useEffect(() => {
    getBoardPrices().then(setPrices);
  }, []);

  const data = prices?.data ?? [];

  return (
    <AppScreen place="towers">
      <PageTitle aside={prices && <SavedNote fromCache={prices.fromCache} savedAt={prices.savedAt} />}>{t("Prices")}</PageTitle>

      <section className="space-y-3" aria-labelledby="board">
        <h2 id="board" className="text-2xl font-extrabold">{t("Board prices")}</h2>
        <p className="text-sm text-muted-foreground">{t("Set by each centre. These are what they pay today.")}</p>
        {prices && data.length === 0 && (
          <EmptyState title={t("No prices yet")} body={t("Centres have not posted prices, or there is no saved copy on this phone yet. Connect and open this screen again.")} />
        )}
        {MATERIALS.map((m) => {
          const rows = data.filter((p) => p.material === m).sort((a, b) => b.centsPerKg - a.centsPerKg);
          if (!rows.length) return null;
          return (
            <Card key={m} className="space-y-2 p-4">
              <div className="flex items-center gap-3">
                <MaterialBadge m={m} />
                <p className="text-lg font-extrabold">{t(MATERIAL_LABEL[m])}</p>
              </div>
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.centreId} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">{r.centre}</span>
                    <span className="shrink-0 text-right font-bold tabular-nums">
                      {formatPerKg(r.centsPerKg)}
                      <span className="block text-xs font-normal text-muted-foreground">{formatPerTonne(r.centsPerKg)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3" aria-labelledby="national">
        <h2 id="national" className="text-2xl font-extrabold">{t("What centres pay across South Africa")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("Public 2026 ranges per tonne, checked {date}. Your centre sets its own price by grade and cleanliness.", { date: MARKET_CHECKED })}
        </p>
        {MARKET_RANGES.map((r) => {
          const m = MATERIAL_BY_CODE[r.material];
          const best = data.filter((p) => p.material === m).sort((a, b) => b.centsPerKg - a.centsPerKg)[0];
          const pos = best ? (best.centsPerKg - r.lowCentsPerKg) / (r.highCentsPerKg - r.lowCentsPerKg) : null;
          return (
            <Card key={r.material} className="space-y-3 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-lg font-extrabold">{t(MATERIAL_LABEL[m])}</span>
                <span className="text-sm font-bold tabular-nums">{perTonneRange(r.lowCentsPerKg, r.highCentsPerKg)}</span>
              </div>
              {pos !== null && best && (
                <div className="space-y-1">
                  <RangeBar position={pos} label={t("Best board price against the usual range")} />
                  <p className="text-xs text-muted-foreground">
                    {t("Best board price {price} is {where} of the range.", {
                      price: formatPerKg(best.centsPerKg),
                      where: pos < 0.34 ? t("at the low end") : pos > 0.66 ? t("at the high end") : t("in the middle"),
                    })}
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">{r.note}</p>
              <p className="text-xs text-muted-foreground">
                {t("Sources")}:{" "}
                {r.sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && ", "}
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-block py-2 underline underline-offset-2">
                      {s.name}
                    </a>{" "}
                    ({s.date})
                  </span>
                ))}
              </p>
            </Card>
          );
        })}
        <p className="text-sm font-bold">
          {t("Producers owe reclaimers a service fee of {fee} per tonne on top of the price.", { fee: formatPerTonne(SERVICE_FEE_CENTS_PER_KG).replace("/t", "") })}
        </p>
      </section>
    </AppScreen>
  );
}
