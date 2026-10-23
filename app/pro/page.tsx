"use client";

import { WideScreen } from "@/components/app/shell";
import { Card, DemoLabel, Donut, MaterialBadge, Bar } from "@/components/app/bits";
import { useT } from "@/lib/app/prefs";
import { PRO } from "@/lib/app/demo-data";
import { MATERIALS, MATERIAL_LABEL, formatRand, formatTonnes, type Material } from "@/lib/app/logic";
import { MATERIAL_VAR } from "@/components/app/bits";

export default function Pro() {
  const t = useT();
  const total = Object.values(PRO.tonnesByMaterialGrams).reduce((s, g) => s + g, 0);
  const max = Math.max(...Object.values(PRO.tonnesByMaterialGrams));
  const youthPct = Math.round((PRO.youth.count / PRO.youth.total) * 100);

  return (
    <WideScreen title={t("Collections")}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold">{t("Collections dashboard")}</h1>
          <DemoLabel />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">{t("Active reclaimers")}</p>
            <p className="font-dot text-3xl">{PRO.activeReclaimers.toLocaleString("en-ZA").replace(/,/g, " ")}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">{t("Tonnes this month")}</p>
            <p className="font-dot text-3xl">{formatTonnes(PRO.tonnesThisMonthGrams)}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">{t("Fees owed")}</p>
            <p className="font-dot text-3xl">{formatRand(PRO.feesOwedCents)}</p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col items-center gap-4">
            <h2 className="self-start font-display text-xl font-bold">{t("Tonnes by material")}</h2>
            <Donut
              size={200}
              stroke={26}
              parts={MATERIALS.map((m: Material) => ({ value: PRO.tonnesByMaterialGrams[m], color: MATERIAL_VAR[m] }))}
              center={<span className="font-dot text-lg">{formatTonnes(total)}</span>}
            />
            <ul className="w-full space-y-2">
              {MATERIALS.map((m) => (
                <li key={m} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                  <MaterialBadge m={m} size={28} />
                  <div className="space-y-1">
                    <span className="font-bold">{t(MATERIAL_LABEL[m])}</span>
                    <Bar value={PRO.tonnesByMaterialGrams[m]} max={max} color={MATERIAL_VAR[m]} />
                  </div>
                  <span className="font-mono tabular-nums">{formatTonnes(PRO.tonnesByMaterialGrams[m])}</span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-6">
            <Card className="space-y-3">
              <h2 className="font-display text-xl font-bold">{t("Impact this month")}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-secondary p-4">
                  <p className="text-xs text-muted-foreground">{t("CO2e avoided")}</p>
                  <p className="font-dot text-2xl">{(PRO.co2Tenths / 10).toFixed(1)} t</p>
                </div>
                <div className="rounded-2xl bg-secondary p-4">
                  <p className="text-xs text-muted-foreground">{t("Work days paid")}</p>
                  <p className="font-dot text-2xl">{(PRO.workDaysTenths / 10).toFixed(1)}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("Youth (18 to 34): {count} of {total} active reclaimers ({pct}%)", {
                  count: PRO.youth.count,
                  total: PRO.youth.total,
                  pct: youthPct,
                })}
              </p>
              <Bar value={PRO.youth.count} max={PRO.youth.total} />
              <p className="text-xs text-muted-foreground">{t("Aggregates only. No names are shown.")}</p>
            </Card>

            <Card className="space-y-3">
              <h2 className="font-display text-xl font-bold">{t("Review queue")}</h2>
              <ul className="divide-y divide-border">
                {PRO.reviewQueue.map((a) => (
                  <li key={a.id} className="flex flex-col py-3">
                    <span className="font-bold">{a.text}</span>
                    <span className="text-sm text-muted-foreground">
                      {a.id} · {t(a.reason)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </WideScreen>
  );
}
