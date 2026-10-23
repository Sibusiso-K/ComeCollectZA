"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppScreen, PageTitle } from "@/components/app/shell";
import { Card, EmptyState, SaverGate, SavedNote, Segmented } from "@/components/app/bits";
import { useT } from "@/lib/app/prefs";
import { useAuth } from "@/lib/app/auth";
import { getMySales, type Fetched, type MySale } from "@/lib/app/api";
import { formatCo2Grams, formatHundredths, formatTonnes, workDaysHundredths } from "@/lib/app/logic";
import { impactSeries, type Range } from "@/lib/app/summary";

export default function Impact() {
  const t = useT();
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("week");
  const [sales, setSales] = useState<Fetched<MySale[]> | null>(null);

  useEffect(() => {
    if (user) getMySales(user.id).then(setSales);
  }, [user]);

  const series = impactSeries(sales?.data ?? [], range);
  const max = Math.max(...series.grams, 1);

  return (
    <AppScreen place="orlando">
      <PageTitle aside={sales && <SavedNote fromCache={sales.fromCache} savedAt={sales.savedAt} />}>{t("Impact")}</PageTitle>

      {!user ? (
        <EmptyState title={t("Sign in to see your impact")} body={t("Impact is worked out from your own weighed sales.")}>
          <Link href="/sign-in" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-lg font-extrabold text-primary-foreground">{t("Sign in")}</Link>
        </EmptyState>
      ) : (
        <>
          <Segmented<Range>
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
            <p className="text-4xl font-extrabold tabular-nums">{formatTonnes(series.totalGrams)}</p>
            <p className="text-sm text-muted-foreground">{t("Kept from landfill")}</p>
            <SaverGate>
              <div className="flex h-44 gap-2" role="img" aria-label={t("Kilograms recycled over time")}>
                {series.grams.map((g, i) => (
                  <div key={series.labels[i] + i} className="flex h-full flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 items-end">
                      <div className="w-full rounded-t-xl bg-primary" style={{ height: `${Math.max((g / max) * 100, g > 0 ? 4 : 1)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{series.labels[i]}</span>
                  </div>
                ))}
              </div>
            </SaverGate>
            {series.totalGrams === 0 && <p className="text-sm text-muted-foreground">{t("No sales in this period yet.")}</p>}
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4"><p className="text-xs text-muted-foreground">{t("CO2e avoided")}</p><p className="text-2xl font-extrabold">{formatCo2Grams(series.co2Grams).replace(" CO2e", "")}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted-foreground">{t("Work days paid")}</p><p className="text-2xl font-extrabold">{formatHundredths(workDaysHundredths(series.payCents))}</p></Card>
          </div>
          <p className="text-xs text-muted-foreground">{t("CO2e from US EPA WARM v16 factors. Work days use the 2026 minimum wage of R30.23 an hour.")}</p>
        </>
      )}
    </AppScreen>
  );
}
