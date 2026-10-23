"use client";

import { useState } from "react";
import { WideScreen } from "@/components/app/shell";
import { Card, DemoLabel, PillButton, MaterialBadge } from "@/components/app/bits";
import { QrScanner } from "@/components/app/qr-scanner";
import { useT } from "@/lib/app/prefs";
import { BOARD_PRICES, CENTRES, DEMO_FIRST_NAME, DEMO_RECLAIMER_CODE, type Centre } from "@/lib/app/demo-data";
import { recordSale, type Receipt } from "@/lib/app/api";
import {
  MATERIALS,
  MATERIAL_LABEL,
  formatPerKg,
  formatRand,
  parseKgToGrams,
  saleCents,
  type Material,
} from "@/lib/app/logic";
import { isReclaimerCode } from "@/lib/reclaimer-code";

export default function Centre() {
  const t = useT();
  const [centre, setCentre] = useState<Centre>("Orlando East");
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [material, setMaterial] = useState<Material>("cans");
  const [kg, setKg] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cpk = BOARD_PRICES.find((p) => p.material === material && p.centre === centre)?.centsPerKg ?? 0;
  const grams = parseKgToGrams(kg);
  const found = isReclaimerCode(code) ? code === DEMO_RECLAIMER_CODE : false;

  const record = async () => {
    setError(null);
    if (!found || grams === null || grams <= 0) return;
    const r = await recordSale({ code, material, grams, centsPerKg: cpk, centre });
    if (r.ok) {
      setReceipt(r.receipt);
      setKg("");
    } else {
      setError(r.error === "duplicate" ? t("This sale was already recorded.") : t("The price changed. Refresh the board and try again."));
    }
  };

  return (
    <WideScreen title={t("Centre")}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-bold">{t("Reclaimer")}</h2>
            <DemoLabel />
          </div>
          <label className="flex flex-col gap-2 font-bold">
            {t("Reclaimer code")}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              placeholder="ccza_r_..."
              autoCapitalize="off"
              spellCheck={false}
              className="min-h-14 rounded-2xl border border-border bg-background px-4 font-dot text-lg"
            />
          </label>
          <PillButton variant="ghost" onClick={() => setScanning(true)}>
            {t("Scan the code")}
          </PillButton>
          {code && (
            <p className="font-bold" aria-live="polite">
              {found ? t("Found: {name}", { name: DEMO_FIRST_NAME }) : t("No reclaimer has that code.")}
            </p>
          )}
          {scanning && (
            <QrScanner
              onResult={(text) => {
                setCode(text.trim());
                setScanning(false);
              }}
              onClose={() => setScanning(false)}
            />
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-2xl font-bold">{t("Record sale")}</h2>
          <label className="flex flex-col gap-2 font-bold">
            {t("Centre")}
            <select value={centre} onChange={(e) => setCentre(e.target.value as Centre)} className="min-h-14 rounded-2xl border border-border bg-background px-4">
              {CENTRES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MATERIALS.map((m) => (
              <button
                key={m}
                onClick={() => setMaterial(m)}
                aria-pressed={material === m}
                className={"flex flex-col items-center gap-1 rounded-2xl p-2 text-sm font-bold " + (material === m ? "bg-highlight text-on-bright" : "bg-secondary")}
              >
                <MaterialBadge m={m} size={32} />
                {t(MATERIAL_LABEL[m])}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-2 font-bold">
            {t("Weight (kg)")}
            <input
              inputMode="decimal"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              className="min-h-14 rounded-2xl border border-border bg-background px-4 font-dot text-2xl"
            />
          </label>
          <p className="text-sm text-muted-foreground">
            {t("Board price")}: <span className="font-mono">{formatPerKg(cpk)}</span>
          </p>
          <PillButton variant="cta" disabled={!found || grams === null || grams <= 0} onClick={record}>
            {t("Record sale")}
          </PillButton>
          {error && <p role="alert" className="font-bold text-warning">{error}</p>}
          {receipt && (
            <div className="space-y-1 rounded-2xl bg-secondary p-4" aria-live="polite">
              <p className="font-bold">{t("Receipt")}</p>
              <p className="font-mono">{formatRand(receipt.amountCents)}</p>
              <p className="text-sm">{t("Service fee")}: {formatRand(receipt.feeCents)}</p>
              <p className="text-sm text-muted-foreground">{receipt.time}</p>
              <DemoLabel />
            </div>
          )}
          {grams !== null && grams > 0 && (
            <p className="text-sm text-muted-foreground">{t("Estimate")}: {formatRand(saleCents(grams, cpk))}</p>
          )}
        </Card>
      </div>
    </WideScreen>
  );
}
