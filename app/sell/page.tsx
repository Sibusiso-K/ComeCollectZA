"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AppScreen, PageTitle } from "@/components/app/shell";
import { Card, DemoLabel, MaterialBadge, PillButton } from "@/components/app/bits";
import { LoadScanner } from "@/components/app/scanner";
import { useT } from "@/lib/app/prefs";
import { DEMO_RECLAIMER_CODE, type BoardPrice } from "@/lib/app/demo-data";
import { bestPrice, getBoardPrices } from "@/lib/app/api";
import {
  MATERIALS,
  MATERIAL_LABEL,
  formatPerTonne,
  formatRand,
  parseKgToGrams,
  saleCents,
  type Material,
} from "@/lib/app/logic";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export default function Sell() {
  const t = useT();
  const [prices, setPrices] = useState<BoardPrice[]>([]);
  const [material, setMaterial] = useState<Material | null>(null);
  const [typed, setTyped] = useState("");
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    getBoardPrices().then((d) => setPrices(d.prices));
  }, []);

  const grams = parseKgToGrams(typed);
  const best = material && prices.length ? bestPrice(prices, material) : null;

  const press = (k: string) => {
    setShowCode(false);
    if (k === "⌫") return setTyped((s) => s.slice(0, -1));
    if (k === ".") return setTyped((s) => (s.includes(".") || s === "" ? s : s + "."));
    const decimals = typed.split(".")[1];
    if (decimals !== undefined && decimals.length >= 3) return;
    if (typed.replace(".", "").length >= 6) return;
    setTyped((s) => s + k);
  };

  return (
    <AppScreen>
      <PageTitle aside={<DemoLabel />}>{t("Sell")}</PageTitle>

      <section className="space-y-3" aria-labelledby="step1">
        <h2 id="step1" className="font-display text-xl font-bold">{t("1. What are you selling?")}</h2>
        <LoadScanner onPick={(m) => { setMaterial(m); setTyped(""); setShowCode(false); }} />
        <div className="grid grid-cols-3 gap-2">
          {MATERIALS.map((m) => (
            <button
              key={m}
              onClick={() => { setMaterial(m); setTyped(""); setShowCode(false); }}
              aria-pressed={material === m}
              className={
                "flex flex-col items-center gap-1 rounded-2xl p-3 text-sm font-bold " +
                (material === m ? "bg-highlight text-on-bright" : "bg-card")
              }
            >
              <MaterialBadge m={m} size={36} />
              {t(MATERIAL_LABEL[m])}
            </button>
          ))}
        </div>
      </section>

      {material && (
        <section className="space-y-3" aria-labelledby="step2">
          <h2 id="step2" className="font-display text-xl font-bold">{t("2. How much, roughly?")}</h2>
          <Card className="space-y-3">
            <p className="font-dot text-5xl tabular-nums" aria-live="polite">
              {typed || "0"} <span className="text-lg">kg</span>
            </p>
            {grams !== null && grams > 0 && best ? (
              <div className="space-y-1">
                <p className="font-display text-2xl font-bold tabular-nums">{formatRand(saleCents(grams, best.centsPerKg))}</p>
                <p className="text-sm text-muted-foreground">
                  {t("At {centre}, {perTonne}", { centre: best.centre, perTonne: formatPerTonne(best.centsPerKg) })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("Type the weight to see the estimate.")}</p>
            )}
            <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("Keypad")}>
              {KEYS.map((k) => (
                <button key={k} onClick={() => press(k)} className="min-h-14 rounded-2xl bg-secondary font-dot text-2xl">
                  {k}
                </button>
              ))}
            </div>
          </Card>
        </section>
      )}

      {material && grams !== null && grams > 0 && (
        <section className="space-y-3" aria-labelledby="step3">
          <h2 id="step3" className="font-display text-xl font-bold">{t("3. Show this at the centre")}</h2>
          {showCode ? (
            <Card className="flex flex-col items-center gap-3">
              <QRCodeSVG value={DEMO_RECLAIMER_CODE} size={200} marginSize={2} />
              <p className="font-dot text-lg tracking-wider">{DEMO_RECLAIMER_CODE}</p>
              <DemoLabel>{t("Demo data")}</DemoLabel>
            </Card>
          ) : (
            <PillButton variant="cta" onClick={() => setShowCode(true)}>
              {t("Show my code")}
            </PillButton>
          )}
        </section>
      )}
    </AppScreen>
  );
}
