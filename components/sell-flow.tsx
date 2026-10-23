"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { DEMO_QR_TOKEN } from "@/lib/demo";
import { MATERIALS, type MaterialCode } from "@/lib/materials";
import { formatRand, formatPricePerKg } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { MaterialTile } from "@/components/material-tile";
import { BoardNotice } from "@/components/board-notice";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];
const MAX_DIGITS = 6; // grams, so up to 999.999 kg

// Sell flow: pick a material, enter the weight and show your code at the centre.
// The centre's scale sets the final weight; this estimate is only a guide.
export function SellFlow({
  prices,
  source,
}: {
  prices: Partial<Record<MaterialCode, number>>;
  source: "live" | "demo";
}) {
  const [material, setMaterial] = useState<MaterialCode | null>(null);
  const [grams, setGrams] = useState("");
  const [showQr, setShowQr] = useState(false);

  const price = material ? (prices[material] ?? 0) : 0;
  const kg = grams === "" ? 0 : Number(grams) / 1000;
  const estimate = Math.round((Number(grams) * price) / 1000);

  function press(key: string) {
    if (key === "back") return setGrams((g) => g.slice(0, -1));
    if (key === "") return;
    setGrams((g) => (g.length >= MAX_DIGITS ? g : (g + key).replace(/^0+(?=\d)/, "")));
  }

  return (
    <div className="flex flex-col gap-5">
      <BoardNotice source={source} />
      <h1 className="font-display text-2xl font-extrabold">Sell a load</h1>

      <section aria-labelledby="pick-material" className="flex flex-col gap-3">
        <h2 id="pick-material" className="text-sm font-bold text-muted">1. What are you selling?</h2>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(MATERIALS) as Exclude<MaterialCode, "OTHER">[]).map((code) => (
            <MaterialTile
              key={code}
              label={MATERIALS[code].label}
              token={MATERIALS[code].token}
              selected={material === code}
              onSelect={() => setMaterial(code)}
            />
          ))}
        </div>
        {material && (
          <p className="text-sm text-muted">
            Board price today: <span className="font-mono text-ink">{formatPricePerKg(price)}</span>
          </p>
        )}
      </section>

      <section aria-labelledby="weight" className="flex flex-col gap-3">
        <h2 id="weight" className="text-sm font-bold text-muted">2. How much, roughly?</h2>
        <p className="font-mono text-4xl font-semibold tabular-nums" aria-live="polite">
          {kg.toFixed(1)} kg
        </p>
        <p className="text-sm text-muted">Estimate: {formatRand(estimate)}</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Keypad">
          {keys.map((key, i) =>
            key === "" ? (
              <span key={i} aria-hidden="true" />
            ) : (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                className="min-h-14 rounded-2xl border-2 border-line bg-surface font-mono text-xl font-semibold text-ink focus-visible:outline-3 focus-visible:outline-gold"
              >
                {key === "back" ? "Delete" : key}
              </button>
            ),
          )}
        </div>
      </section>

      <section aria-labelledby="code" className="flex flex-col gap-3">
        <h2 id="code" className="text-sm font-bold text-muted">3. Show this at the centre</h2>
        {showQr ? (
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-surface p-5">
            <QRCodeSVG value={DEMO_QR_TOKEN} size={200} marginSize={2} title="Your reclaimer code" />
            <p className="font-mono text-sm text-muted">{DEMO_QR_TOKEN}</p>
          </div>
        ) : (
          <Button
            variant="cash"
            className="w-full"
            disabled={material === null || grams === ""}
            onClick={() => setShowQr(true)}
          >
            Show my code
          </Button>
        )}
      </section>
    </div>
  );
}
