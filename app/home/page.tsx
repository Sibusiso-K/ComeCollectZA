"use client";

import Link from "next/link";
import { Recycle, Tag, Search } from "lucide-react";
import { AppScreen, PageTitle } from "@/components/app/shell";
import { ActionCard, Card, DeltaPill, DemoLabel, Donut, MaterialBadge, Ring, Sticker } from "@/components/app/bits";
import { Orb } from "@/components/app/assistant";
import { useT, usePrefs } from "@/lib/app/prefs";
import { MONTH_BY_MATERIAL, SCORE } from "@/lib/app/demo-data";
import { MATERIALS, MATERIAL_LABEL, formatRand, formatPerKg, type Material } from "@/lib/app/logic";
import { getBoardPrices, bestPrice } from "@/lib/app/api";
import { useEffect, useState } from "react";
import type { BoardPrice } from "@/lib/app/demo-data";
import { MATERIAL_VAR } from "@/components/app/bits";

export default function Home() {
  const t = useT();
  const { firstName } = usePrefs();
  const [prices, setPrices] = useState<BoardPrice[]>([]);

  useEffect(() => {
    getBoardPrices().then((d) => setPrices(d.prices));
  }, []);

  const total = Object.values(MONTH_BY_MATERIAL).reduce((s, v) => s + v.cents, 0);
  const parts = MATERIALS.map((m) => ({ value: MONTH_BY_MATERIAL[m].cents, color: MATERIAL_VAR[m] }));

  return (
    <AppScreen>
      <PageTitle>{t("Hello, {name}", { name: firstName })}</PageTitle>

      <Card className="space-y-4 bg-primary text-primary-foreground">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm opacity-80">{t("Money this month")}</p>
            <p className="font-dot text-4xl tabular-nums">{formatRand(total)}</p>
          </div>
          <DemoLabel className="border-primary-foreground/40 text-primary-foreground">{t("Demo data")}</DemoLabel>
        </div>
        <div className="flex items-center gap-4">
          <Donut size={120} stroke={16} parts={parts} />
          <ul className="min-w-0 flex-1 space-y-1 text-sm">
            {MATERIALS.slice(0, 4).map((m) => (
              <li key={m} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 truncate">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: MATERIAL_VAR[m] }} aria-hidden />
                  {t(MATERIAL_LABEL[m])}
                </span>
                <span className="font-mono tabular-nums">{formatRand(MONTH_BY_MATERIAL[m].cents)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card className="flex items-center gap-4">
        <Ring value={SCORE.today} size={92} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold">{t("Today's score")}</p>
          <p className="text-sm text-muted-foreground">{t("out of 100")}</p>
          <div className="mt-1">
            <DeltaPill>{t("+{n} vs last week", { n: SCORE.deltaVsLastWeek })}</DeltaPill>
          </div>
        </div>
        <Sticker>{t("Small steps")}</Sticker>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Link href="/sell" className="grid min-h-24 place-items-center rounded-3xl bg-cta text-cta-foreground font-display font-bold">
          <span className="flex flex-col items-center gap-1"><Recycle size={24} aria-hidden />{t("Sell")}</span>
        </Link>
        <Link href="/prices" className="grid min-h-24 place-items-center rounded-3xl bg-card font-display font-bold shadow-[var(--shadow-soft)]">
          <span className="flex flex-col items-center gap-1"><Tag size={24} aria-hidden />{t("Prices")}</span>
        </Link>
        <Link href="/sell" className="grid min-h-24 place-items-center rounded-3xl bg-card font-display font-bold shadow-[var(--shadow-soft)]">
          <span className="flex flex-col items-center gap-1"><Search size={24} aria-hidden />{t("Scan")}</span>
        </Link>
      </div>

      <section aria-labelledby="board" className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 id="board" className="font-display text-2xl font-bold">{t("Board prices")}</h2>
          <DemoLabel />
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {MATERIALS.map((m) => {
            const best = prices.length ? bestPrice(prices, m) : null;
            return (
              <div key={m} className="min-w-40 space-y-2 rounded-3xl bg-card p-4 shadow-[var(--shadow-soft)]">
                <MaterialBadge m={m} size={36} />
                <p className="font-bold">{t(MATERIAL_LABEL[m])}</p>
                <p className="font-mono text-lg tabular-nums">{best ? formatPerKg(best.centsPerKg) : "…"}</p>
                <p className="text-xs text-muted-foreground">{best?.centre ?? ""}</p>
              </div>
            );
          })}
        </div>
      </section>

      <Link href="/assistant" className="block">
        <ActionCard
          icon={<Orb size={40} />}
          title={t("Ask the assistant")}
          subtitle={t("Scripted answers for the demo")}
        />
      </Link>
    </AppScreen>
  );
}
