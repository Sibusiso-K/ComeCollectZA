"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WideScreen } from "@/components/app/shell";
import { Bar, Card, EmptyState, MaterialBadge, MATERIAL_VAR, Donut } from "@/components/app/bits";
import { useT } from "@/lib/app/prefs";
import { useAuth } from "@/lib/app/auth";
import { getOpenAnomalies, getProMaterials, getProOverview, type ProOverview } from "@/lib/app/api";
import { MATERIALS, MATERIAL_LABEL, co2Grams, formatCo2Grams, formatHundredths, formatRand, formatTonnes, workDaysHundredths, type Material } from "@/lib/app/logic";

type Mat = { material: Material; kg: number; sales: number; valueCents: number };

export default function Pro() {
  const t = useT();
  const { ready, user, profile } = useAuth();
  const [overview, setOverview] = useState<ProOverview | null>(null);
  const [mats, setMats] = useState<Mat[]>([]);
  const [anomalies, setAnomalies] = useState<{ id: string; reasons: string[]; createdAt: string }[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user || profile?.role !== "pro") return;
    Promise.all([getProOverview(), getProMaterials(), getOpenAnomalies()])
      .then(([o, m, a]) => {
        setOverview(o);
        setMats(m);
        setAnomalies(a);
      })
      .catch(() => setFailed(true));
  }, [user, profile]);

  if (!ready) return <WideScreen title={t("Collections")}><div /></WideScreen>;

  if (!user || profile?.role !== "pro") {
    return (
      <WideScreen title={t("Collections")}>
        <EmptyState
          title={t("Programme accounts only")}
          body={user ? t("This account is not a programme account. Programme accounts are set up by the ComeCollectZA team.") : t("Sign in with your programme account.")}
        >
          {!user && <Link href="/sign-in" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-lg font-extrabold text-primary-foreground">{t("Sign in")}</Link>}
        </EmptyState>
      </WideScreen>
    );
  }

  const byMaterial = (m: Material) => mats.find((x) => x.material === m);
  const totalKg = mats.reduce((s, x) => s + x.kg, 0);
  const maxKg = Math.max(...mats.map((x) => x.kg), 1);
  const co2 = mats.reduce((s, x) => s + co2Grams(Math.round(x.kg * 1000), x.material), 0);
  const paid = mats.reduce((s, x) => s + x.valueCents, 0);
  const youthPct = overview && overview.active > 0 ? Math.round((overview.youth * 100) / overview.active) : null;

  return (
    <WideScreen title={t("Collections")}>
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold">{t("Collections, last 30 days")}</h1>
        {failed && <p role="alert" className="font-bold text-warning">{t("The totals could not load. Check your connection.")}</p>}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5"><p className="text-sm text-muted-foreground">{t("Registered reclaimers")}</p><p className="text-3xl font-extrabold tabular-nums">{overview ? overview.registered.toLocaleString("en-ZA") : "…"}</p></Card>
          <Card className="p-5"><p className="text-sm text-muted-foreground">{t("Active in 30 days")}</p><p className="text-3xl font-extrabold tabular-nums">{overview ? overview.active.toLocaleString("en-ZA") : "…"}</p></Card>
          <Card className="p-5"><p className="text-sm text-muted-foreground">{t("Tonnes recorded")}</p><p className="text-3xl font-extrabold tabular-nums">{overview ? overview.tonnes30d.toFixed(1) : "…"}</p></Card>
          <Card className="p-5"><p className="text-sm text-muted-foreground">{t("Service fees owed")}</p><p className="text-3xl font-extrabold tabular-nums">{overview ? formatRand(overview.feesOwedCents) : "…"}</p></Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col items-center gap-4">
            <h2 className="self-start text-xl font-extrabold">{t("Tonnes by material")}</h2>
            {totalKg === 0 ? (
              <p className="py-8 text-muted-foreground">{t("No sales recorded in the last 30 days.")}</p>
            ) : (
              <>
                <Donut
                  size={200}
                  stroke={26}
                  parts={MATERIALS.map((m) => ({ value: byMaterial(m)?.kg ?? 0, color: MATERIAL_VAR[m] }))}
                  center={<span className="text-lg font-extrabold">{formatTonnes(Math.round(totalKg * 1000))}</span>}
                />
                <ul className="w-full space-y-2">
                  {MATERIALS.filter((m) => byMaterial(m)).map((m) => (
                    <li key={m} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                      <MaterialBadge m={m} size={28} />
                      <div className="space-y-1">
                        <span className="font-bold">{t(MATERIAL_LABEL[m])}</span>
                        <Bar value={byMaterial(m)!.kg} max={maxKg} color={MATERIAL_VAR[m]} />
                      </div>
                      <span className="font-bold tabular-nums">{formatTonnes(Math.round(byMaterial(m)!.kg * 1000))}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="space-y-3">
              <h2 className="text-xl font-extrabold">{t("Impact")}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-secondary p-4"><p className="text-xs text-muted-foreground">{t("CO2e avoided")}</p><p className="text-2xl font-extrabold">{formatCo2Grams(co2).replace(" CO2e", "")}</p></div>
                <div className="rounded-2xl bg-secondary p-4"><p className="text-xs text-muted-foreground">{t("Work days paid")}</p><p className="text-2xl font-extrabold">{formatHundredths(workDaysHundredths(paid))}</p></div>
              </div>
              {overview && youthPct !== null ? (
                <>
                  <p className="text-sm">{t("Aged 18 to 34: {count} of {total} active reclaimers ({pct}%)", { count: overview.youth, total: overview.active, pct: youthPct })}</p>
                  <Bar value={overview.youth} max={overview.active} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("The youth share appears once reclaimers have recorded sales.")}</p>
              )}
              <p className="text-xs text-muted-foreground">{t("Totals only. No names are shown.")}</p>
            </Card>

            <Card className="space-y-3">
              <h2 className="text-xl font-extrabold">{t("Review queue")}</h2>
              {anomalies.length === 0 ? (
                <p className="text-muted-foreground">{t("Nothing flagged for review.")}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {anomalies.map((a) => (
                    <li key={a.id} className="py-3">
                      <p className="font-bold">{a.reasons.join(", ") || t("Flagged")}</p>
                      <p className="text-sm text-muted-foreground">{new Date(a.createdAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </WideScreen>
  );
}
