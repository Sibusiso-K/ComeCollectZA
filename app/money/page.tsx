"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { AppScreen, PageTitle } from "@/components/app/shell";
import { Card, EmptyState, ListRow, MaterialBadge, PillButton, SavedNote, Sticker } from "@/components/app/bits";
import { useT } from "@/lib/app/prefs";
import { useAuth } from "@/lib/app/auth";
import { getMySales, type Fetched, type MySale } from "@/lib/app/api";
import { MATERIAL_LABEL, formatCo2Grams, formatHundredths, formatKg, formatRand, formatTonnes, workDaysHundredths } from "@/lib/app/logic";
import { allTimeImpact, feeTotals, monthTotals } from "@/lib/app/summary";
import { forecastNext30 } from "@/lib/app/advice";

/** Counts up to the latest sale with timers, not requestAnimationFrame, so it still finishes in a hidden tab. */
function useCountUp(target: number) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
  }, [target]);
  return value;
}

const SAWPRS_LABEL = { unknown: "Not recorded", pending: "Registration pending", registered: "Registered" } as const;

export default function Money() {
  const t = useT();
  const { ready, user, profile } = useAuth();
  const [sales, setSales] = useState<Fetched<MySale[]> | null>(null);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    if (user) getMySales(user.id).then(setSales);
  }, [user]);

  const list = sales?.data ?? [];
  const latest = list[0];
  const shown = useCountUp(latest?.amountCents ?? 0);

  if (!ready) {
    return (
      <AppScreen place="kliptown">
        <PageTitle>{t("My money")}</PageTitle>
      </AppScreen>
    );
  }

  if (!user) {
    return (
      <AppScreen place="kliptown">
        <PageTitle>{t("My money")}</PageTitle>
        <EmptyState title={t("Sign in to see your money")} body={t("Your sales, fees and impact are saved to your account.")}>
          <Link href="/sign-in" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-lg font-extrabold text-primary-foreground">{t("Sign in")}</Link>
        </EmptyState>
      </AppScreen>
    );
  }

  if (profile && profile.role !== "reclaimer") {
    return (
      <AppScreen place="kliptown">
        <PageTitle>{t("My money")}</PageTitle>
        <EmptyState title={t("This screen is for reclaimers")} body={t("Business, centre and programme accounts do not have a sales history here.")} />
      </AppScreen>
    );
  }

  const fees = feeTotals(list);
  const payoutCents = list.reduce((sum, x) => (x.payout && (x.payout.status === "sent" || x.payout.status === "paid") ? sum + x.amountCents : sum), 0);
  const month = monthTotals(list);
  const impact = allTimeImpact(list);
  const forecast = forecastNext30(list);

  return (
    <AppScreen place="kliptown">
      <PageTitle aside={sales && <SavedNote fromCache={sales.fromCache} savedAt={sales.savedAt} />}>{t("My money")}</PageTitle>

      {latest ? (
        <Card solid className="space-y-2">
          <p className="text-sm opacity-80">
            {t("Latest sale: {kg} of {material} at {centre}", { kg: formatKg(latest.grams), material: t(MATERIAL_LABEL[latest.material]), centre: latest.centre })}
          </p>
          <p className="text-5xl font-extrabold tabular-nums" aria-live="polite">{formatRand(shown)}</p>
          <p className="text-sm opacity-80">{t("This month: {amount}", { amount: formatRand(month.cents) })}</p>
        </Card>
      ) : (
        <EmptyState title={t("No sales yet")} body={t("Scan your load, pick a material, then show your code at a buy-back centre. Your first sale will appear here.")}>
          <Link href="/home" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-lg font-extrabold text-primary-foreground">{t("Scan a load")}</Link>
        </EmptyState>
      )}

      {list.length > 0 && (
        <Card className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-extrabold">{t("Payouts")}</h2>
            <Sticker>{t("Demo payouts")}</Sticker>
          </div>
          <p className="text-3xl font-extrabold tabular-nums">{formatRand(payoutCents)}</p>
          <p className="text-sm text-muted-foreground">
            {t("Marked as sent after each sale. No money moves yet: payouts go live when a payment partner is connected.")}
          </p>
        </Card>
      )}

      <Card className="space-y-1">
        <p className="text-sm text-muted-foreground">{t("SAWPRS registration")}</p>
        <p className="text-lg font-extrabold">{t(SAWPRS_LABEL[profile?.sawprs ?? "unknown"])}</p>
        {(profile?.sawprs ?? "unknown") !== "registered" && (
          <p className="text-sm text-muted-foreground">{t("Ask the centre to record your SAWPRS registration number when you sell.")}</p>
        )}
      </Card>

      {profile?.qrToken &&
        (showCode ? (
          <Card className="flex flex-col items-center gap-3">
            <div className="rounded-2xl bg-white p-3"><QRCodeSVG value={profile.qrToken} size={200} marginSize={1} /></div>
            <p className="text-lg font-extrabold tracking-wider">{profile.qrToken}</p>
            <PillButton variant="ghost" onClick={() => setShowCode(false)}>{t("Hide my code")}</PillButton>
          </Card>
        ) : (
          <PillButton variant="cta" onClick={() => setShowCode(true)}>{t("Show my code")}</PillButton>
        ))}

      {list.length > 0 && (
        <>
          <section className="grid grid-cols-3 gap-2 text-center" aria-labelledby="fees">
            <h2 id="fees" className="sr-only">{t("Service fees")}</h2>
            <Card className="p-3"><p className="text-xs text-muted-foreground">{t("Paid")}</p><p className="text-sm font-extrabold tabular-nums">{formatRand(fees.paidCents)}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">{t("Still owed")}</p><p className="text-sm font-extrabold tabular-nums">{formatRand(fees.owedCents)}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">{t("Missing")}</p><p className="text-sm font-extrabold tabular-nums text-warning">{formatRand(fees.missingCents)}</p></Card>
          </section>

          <Card className="space-y-2" aria-labelledby="next30">
            <div className="flex items-center justify-between gap-2">
              <h2 id="next30" className="text-xl font-extrabold">{t("Next 30 days")}</h2>
              <Sticker>{t("Estimate")}</Sticker>
            </div>
            {forecast ? (
              <>
                <p className="text-3xl font-extrabold tabular-nums">{t("About {amount}", { amount: formatRand(forecast.cents) })}</p>
                <p className="text-sm text-muted-foreground">
                  {t("Between {low} and {high}, worked out from your {n} sales in the last {days} days. Not a promise.", {
                    low: formatRand(forecast.lowCents),
                    high: formatRand(forecast.highCents),
                    n: forecast.sales,
                    days: forecast.days,
                  })}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("After 3 sales over a week, we show what you may earn in the next 30 days.")}</p>
            )}
          </Card>

          <Card className="space-y-3" aria-labelledby="impact">
            <div className="flex items-center justify-between gap-2">
              <h2 id="impact" className="text-xl font-extrabold">{t("My impact")}</h2>
              <Sticker>{t("Since you joined")}</Sticker>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-secondary p-3"><p className="text-xs text-muted-foreground">{t("Kept from landfill")}</p><p className="text-lg font-extrabold">{formatTonnes(impact.grams)}</p></div>
              <div className="rounded-2xl bg-secondary p-3"><p className="text-xs text-muted-foreground">{t("CO2e avoided")}</p><p className="text-lg font-extrabold">{formatCo2Grams(impact.co2Grams).replace(" CO2e", "")}</p></div>
              <div className="rounded-2xl bg-secondary p-3"><p className="text-xs text-muted-foreground">{t("Work days paid")}</p><p className="text-lg font-extrabold">{formatHundredths(workDaysHundredths(impact.payCents))}</p></div>
            </div>
            <p className="text-xs text-muted-foreground">{t("CO2e from US EPA WARM v16 factors. Work days use the 2026 minimum wage of R30.23 an hour.")}</p>
          </Card>

          <section className="space-y-2" aria-labelledby="recent">
            <h2 id="recent" className="text-xl font-extrabold">{t("Recent sales")}</h2>
            <ul className="glass divide-y divide-border rounded-3xl px-4">
              {list.slice(0, 20).map((s) => (
                <li key={s.id}>
                  <ListRow
                    chevron={false}
                    left={<MaterialBadge m={s.material} size={40} />}
                    title={`${t(MATERIAL_LABEL[s.material])} · ${formatKg(s.grams)}`}
                    subtitle={`${s.centre} · ${new Date(s.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}${s.fee ? ` · ${t("Fee")}: ${t(s.fee.status)}` : ""}${s.payout ? ` · ${t("Payout")}: ${t(s.payout.status)}${s.payout.demo ? ` (${t("demo")})` : ""}` : ""}`}
                    right={<span className="font-extrabold tabular-nums">{formatRand(s.amountCents)}</span>}
                  />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </AppScreen>
  );
}
