"use client";

import { AppScreen, PageTitle } from "@/components/app/shell";
import { Card, DemoLabel, Sticker } from "@/components/app/bits";
import { useT } from "@/lib/app/prefs";
import { PICKUPS } from "@/lib/app/demo-data";

export default function Pickups() {
  const t = useT();
  return (
    <AppScreen>
      <PageTitle aside={<DemoLabel />}>{t("Pickups")}</PageTitle>
      <Sticker>{t("Coming soon")}</Sticker>
      <p className="text-sm text-muted-foreground">
        {t("Taverns and bottle stores will post a pickup for cans, one-way glass, PET and cardboard. A reclaimer nearby can claim it.")}
      </p>
      <section className="space-y-3" aria-label={t("Example pickups")}>
        {PICKUPS.map((p) => (
          <Card key={p.id} className="space-y-1">
            <p className="font-bold">{p.place}</p>
            <p className="text-sm text-muted-foreground">{p.items}</p>
            <p className="text-sm">
              {p.amount} · {p.when}
            </p>
          </Card>
        ))}
      </section>
    </AppScreen>
  );
}
