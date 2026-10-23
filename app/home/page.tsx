"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Smartphone } from "lucide-react";
import { AppScreen } from "@/components/app/shell";
import { Card, Gauge, MaterialBadge, SavedNote } from "@/components/app/bits";
import { LoadScanner } from "@/components/app/scanner";
import { useT } from "@/lib/app/prefs";
import { firstName, useAuth } from "@/lib/app/auth";
import { bestPrice, getBoardPrices, getMySales, type BoardPrice, type Fetched, type MySale } from "@/lib/app/api";
import { MATERIALS, MATERIAL_LABEL, formatPerKg, formatRand } from "@/lib/app/logic";
import { feeRecoveryPercent, monthTotals } from "@/lib/app/summary";
import { PLACES, PLACE_ORDER } from "@/lib/app/photos";

export default function Home() {
  const t = useT();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [prices, setPrices] = useState<Fetched<BoardPrice[]> | null>(null);
  const [sales, setSales] = useState<MySale[]>([]);

  useEffect(() => {
    getBoardPrices().then(setPrices);
  }, []);
  useEffect(() => {
    if (user) getMySales(user.id).then((r) => setSales(r.data));
    else setSales([]);
  }, [user]);

  const name = firstName(profile);
  const recovery = feeRecoveryPercent(sales);
  const month = monthTotals(sales);

  return (
    <AppScreen place="orlando">
      <div>
        <p className="text-sm text-muted-foreground">{name ? t("Hello") : t("Welcome")}</p>
        <h1 className="text-4xl font-extrabold leading-none">{name || t("What are you selling today?")}</h1>
      </div>

      <LoadScanner onPick={(m) => router.push(`/sell?m=${m}`)} />

      <Link href="/ewaste" className="glass flex min-h-20 items-center gap-4 rounded-3xl p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-highlight text-on-bright"><Smartphone size={26} aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-extrabold leading-tight">{t("Old phone, laptop or fridge?")}</span>
          <span className="block text-sm text-muted-foreground">{t("See where to take it, or sell it to someone nearby.")}</span>
        </span>
        <ChevronRight size={22} aria-hidden className="shrink-0" />
      </Link>

      {user ? (
        sales.length > 0 && (
          <div className="grid gap-3">
            <Card className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{t("Money this month")}</p>
                  <p className="text-4xl font-extrabold tabular-nums">{formatRand(month.cents)}</p>
                </div>
                <Link href="/money" className="font-bold text-primary underline underline-offset-4">{t("See all")}</Link>
              </div>
            </Card>
            {recovery !== null && (
              <Card className="space-y-2">
                <h2 className="text-lg font-extrabold">{t("Service fees paid")}</h2>
                <Gauge value={recovery} label={t("Service fees paid")} caption={t("of fees raised")} />
              </Card>
            )}
          </div>
        )
      ) : (
        <Card className="space-y-3">
          <h2 className="text-xl font-extrabold">{t("Keep your sales and your code")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("A free account saves your sales, tracks the fees you are owed, and lets you post on the market.")}
          </p>
          <Link href="/sign-in" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-lg font-extrabold text-primary-foreground">
            {t("Create account")}
          </Link>
        </Card>
      )}

      <section aria-labelledby="board" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="board" className="text-2xl font-extrabold">{t("Board prices")}</h2>
          {prices && <SavedNote fromCache={prices.fromCache} savedAt={prices.savedAt} />}
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {MATERIALS.map((m) => {
            const best = prices ? bestPrice(prices.data, m) : undefined;
            return (
              <Link href="/prices" key={m} className="glass min-w-40 space-y-2 rounded-3xl p-4">
                <MaterialBadge m={m} size={36} />
                <p className="font-bold">{t(MATERIAL_LABEL[m])}</p>
                <p className="text-lg font-extrabold tabular-nums">{best ? formatPerKg(best.centsPerKg) : prices ? t("No price yet") : "…"}</p>
                <p className="truncate text-xs text-muted-foreground">{best?.centre ?? ""}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="areas" className="space-y-3">
        <h2 id="areas" className="text-2xl font-extrabold">{t("Explore your area")}</h2>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {PLACE_ORDER.map((p) => (
            <Link
              key={p}
              href={`/market?area=${encodeURIComponent(PLACES[p].label)}`}
              className="relative block h-32 w-44 shrink-0 overflow-hidden rounded-3xl"
              style={{ backgroundImage: `url(${PLACES[p].src})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" aria-hidden />
              <span className="absolute bottom-3 left-3 text-lg font-extrabold text-white">{PLACES[p].label}</span>
            </Link>
          ))}
        </div>
      </section>
    </AppScreen>
  );
}
