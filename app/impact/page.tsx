"use client";

import { useEffect, useState } from "react";
import { AppScreen, PageTitle } from "@/components/app/shell";
import { Card, DemoLabel, Segmented, SaverGate } from "@/components/app/bits";
import { useT } from "@/lib/app/prefs";
import { getImpact } from "@/lib/app/api";
import { IMPACT_SERIES } from "@/lib/app/demo-data";
import { formatCo2Grams, formatHundredths, formatTonnes, workDaysHundredths } from "@/lib/app/logic";

type Range = "week" | "month" | "year";

export default function Impact() {
  const t = useT();
  const [range, setRange] = useState<Range>("week");
  const [data, setData] = useState<Awaited<ReturnType<typeof getImpact>> | null>(null);

  useEffect(() => {
    getImpact(range).then(setData);
  }, [range]);

  const series = IMPACT_SERIES[range];
  const max = Math.max(...series.grams);

  return (
    <AppScreen>
      <PageTitle aside={<DemoLabel />}>{t("Impact")}</PageTitle>
      <Segmented
        label={t("Range")}
        value={range}
        onChange={setRange}
        options={[
          { value: "week", label: t("Week") },
          { value: "month", label: t("Month") },
          { value: "year", label: t("Year") },
        ]}
      />

      <Card className="space-y-4">
        <p className="font-dot text-4xl tabular-nums">{data ? formatTonnes(data.totalGrams) : "…"}</p>
        <p className="text-sm text-muted-foreground">{t("Kept from landfill")}</p>
        <SaverGate>
          <div className="flex h-40 items-end gap-2" role="img" aria-label={t("Kilograms recycled over time")}>
            {series.grams.map((g, i) => (
              <div key={series.labels[i]} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-xl bg-primary" style={{ height: `${(g / max) * 100}%` }} />
                <span className="text-xs text-muted-foreground">{series.labels[i]}</span>
              </div>
            ))}
          </div>
        </SaverGate>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("CO2e avoided")}</p>
          <p className="font-dot text-2xl">{data ? formatCo2Grams(data.co2Grams).replace(" CO2e", "") : "…"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("Work days paid")}</p>
          <p className="font-dot text-2xl">{data ? formatHundredths(workDaysHundredths(data.payCents)) : "…"}</p>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("CO2e from US EPA WARM v16 factors. Work days use the 2026 minimum wage of R30.23 an hour.")}
      </p>
    </AppScreen>
  );
}
