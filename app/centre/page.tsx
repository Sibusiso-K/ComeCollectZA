"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WideScreen } from "@/components/app/shell";
import { Card, EmptyState, MaterialBadge, PillButton, inputClass } from "@/components/app/bits";
import { QrScanner } from "@/components/app/qr-scanner";
import { useT } from "@/lib/app/prefs";
import { useAuth } from "@/lib/app/auth";
import {
  getBoardPrices,
  getMyCentres,
  lookupReclaimer,
  recordSale,
  setBoardPrice,
  type BoardPrice,
  type MyCentre,
  type SaleResult,
} from "@/lib/app/api";
import { MATERIALS, MATERIAL_LABEL, formatPerKg, formatRand, parseKgToGrams, parseRandToCents, prettyArea, saleCents, type Material } from "@/lib/app/logic";
import { isReclaimerCode } from "@/lib/reclaimer-code";
import { cn } from "@/lib/utils";

export default function Centre() {
  const t = useT();
  const { ready, user, profile } = useAuth();
  const [centres, setCentres] = useState<MyCentre[] | null>(null);
  const [centreId, setCentreId] = useState<string | null>(null);
  const [prices, setPrices] = useState<BoardPrice[]>([]);

  const reloadPrices = useCallback(() => {
    getBoardPrices().then((r) => setPrices(r.data));
  }, []);

  useEffect(() => {
    if (!user || profile?.role !== "operator") return;
    getMyCentres(user.id)
      .then((c) => {
        setCentres(c);
        setCentreId((cur) => cur ?? c[0]?.id ?? null);
      })
      .catch(() => setCentres([]));
    reloadPrices();
  }, [user, profile, reloadPrices]);

  if (!ready) return <WideScreen title={t("Centre")}><div /></WideScreen>;

  if (!user || profile?.role !== "operator") {
    return (
      <WideScreen title={t("Centre")}>
        <EmptyState
          title={t("Centre accounts only")}
          body={user ? t("This account is not a centre account. Centre accounts are set up by the ComeCollectZA team.") : t("Sign in with your centre account.")}
        >
          {!user && <Link href="/sign-in" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-lg font-extrabold text-primary-foreground">{t("Sign in")}</Link>}
        </EmptyState>
      </WideScreen>
    );
  }

  if (centres && centres.length === 0) {
    return (
      <WideScreen title={t("Centre")}>
        <EmptyState title={t("No centre linked yet")} body={t("Your account is a centre account, but it is not linked to a buy-back centre. Ask the ComeCollectZA team to link it.")} />
      </WideScreen>
    );
  }

  const centre = centres?.find((c) => c.id === centreId) ?? null;
  const centrePrices = prices.filter((p) => p.centreId === centreId);

  return (
    <WideScreen title={t("Centre")}>
      <div className="space-y-6">
        {centres && centres.length > 1 && (
          <label className="flex flex-col gap-2 font-bold">
            {t("Centre")}
            <select value={centreId ?? ""} onChange={(e) => setCentreId(e.target.value)} className={inputClass}>
              {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        {centre && <h1 className="text-3xl font-extrabold">{centre.name}</h1>}
        <div className="grid gap-6 lg:grid-cols-2">
          {centre && <SaleForm centreId={centre.id} centrePrices={centrePrices} />}
          {centre && <PriceBoard centreId={centre.id} centrePrices={centrePrices} onSaved={reloadPrices} />}
        </div>
      </div>
    </WideScreen>
  );
}

function SaleForm({ centreId, centrePrices }: { centreId: string; centrePrices: BoardPrice[] }) {
  const t = useT();
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [who, setWho] = useState<{ name: string; area: string } | null | "none">(null);
  const [material, setMaterial] = useState<Material>("cans");
  const [kg, setKg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Extract<SaleResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = useRef<string>(crypto.randomUUID());

  const price = centrePrices.find((p) => p.material === material)?.centsPerKg ?? null;
  const grams = parseKgToGrams(kg);
  const codeOk = isReclaimerCode(code);

  // Look the reclaimer up as soon as a whole code is there.
  useEffect(() => {
    setWho(null);
    if (!codeOk) return;
    let alive = true;
    lookupReclaimer(code)
      .then((r) => alive && setWho(r ?? "none"))
      .catch(() => alive && setWho(null));
    return () => {
      alive = false;
    };
  }, [code, codeOk]);

  // A new sale needs a new idempotency key. The same sale retried keeps its key, so it is never counted twice.
  useEffect(() => {
    key.current = crypto.randomUUID();
  }, [code, material, kg, centreId]);

  const messages: Record<string, string> = {
    not_configured: "Sales saving is not switched on for this server yet. The team needs to add the service key.",
    price: "The board price changed. Check the price and try again.",
    unknown_code: "No reclaimer has that code.",
    not_operator: "This account does not run that centre.",
    signed_out: "Your session ended. Sign in again.",
    conflict: "This key was used for a different sale. Start the sale again.",
    invalid: "Check the code and weight, then try again.",
    failed: "The sale did not save. Check your connection and try again with the same details.",
  };

  const record = async () => {
    if (!codeOk || who === null || who === "none" || grams === null || grams <= 0 || price === null || busy) return;
    setBusy(true);
    setError(null);
    const r = await recordSale({ code, material, grams, centsPerKg: price, centreId, key: key.current });
    setBusy(false);
    if (r.ok) {
      setDone(r);
      setKg("");
      setCode("");
    } else setError(messages[r.error]);
  };

  return (
    <Card className="space-y-4">
      <h2 className="text-2xl font-extrabold">{t("Record a sale")}</h2>
      <label className="flex flex-col gap-2 font-bold">
        {t("Reclaimer code")}
        <input value={code} onChange={(e) => { setCode(e.target.value.trim()); setDone(null); }} placeholder="ccza_r_..." autoCapitalize="off" spellCheck={false} className={cn(inputClass, "font-mono")} />
      </label>
      <PillButton variant="ghost" onClick={() => setScanning(true)}>{t("Scan the code")}</PillButton>
      {scanning && <QrScanner onResult={(text) => { setCode(text.trim()); setDone(null); setScanning(false); }} onClose={() => setScanning(false)} />}
      {code && (
        <p className="font-bold" aria-live="polite">
          {!codeOk ? t("Codes look like ccza_r_7Q2KX9.") : who === null ? t("Looking up…") : who === "none" ? t("No reclaimer has that code.") : t("Found: {name}", { name: who.name })}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {MATERIALS.map((m) => (
          <button key={m} onClick={() => setMaterial(m)} aria-pressed={material === m} className={cn("flex flex-col items-center gap-1 rounded-2xl p-2 text-sm font-bold", material === m ? "bg-highlight text-on-bright" : "bg-secondary")}>
            <MaterialBadge m={m} size={32} />
            {t(MATERIAL_LABEL[m])}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-2 font-bold">
        {t("Weight (kg)")}
        <input inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} className={inputClass} />
      </label>
      <p className="text-sm text-muted-foreground">
        {price === null ? t("Set a board price for this material first.") : <>{t("Board price")}: <span className="font-bold">{formatPerKg(price)}</span></>}
      </p>
      {grams !== null && grams > 0 && price !== null && (
        <p className="text-2xl font-extrabold tabular-nums">{formatRand(saleCents(grams, price))}</p>
      )}
      <PillButton variant="cta" disabled={busy || !codeOk || who === null || who === "none" || grams === null || grams <= 0 || price === null} onClick={record}>
        {busy ? t("Saving…") : t("Record sale")}
      </PillButton>
      {error && <p role="alert" className="font-bold text-warning">{t(error)}</p>}
      {done && (
        <div className="space-y-1 rounded-2xl bg-secondary p-4" aria-live="polite">
          <p className="font-bold">{done.replayed ? t("Already recorded") : t("Sale recorded")}</p>
          <p className="text-3xl font-extrabold tabular-nums">{formatRand(done.amountCents)}</p>
          <p className="text-sm">{t("Service fee")}: {formatRand(done.feeCents)}</p>
          {done.flags.length > 0 && <p className="text-sm text-muted-foreground">{t("Flagged for review")}: {done.flags.join(", ")}</p>}
          <button onClick={() => window.print()} className="no-print mt-2 min-h-12 rounded-full bg-foreground px-5 font-bold text-background">{t("Print receipt")}</button>
        </div>
      )}
    </Card>
  );
}

function PriceBoard({ centreId, centrePrices, onSaved }: { centreId: string; centrePrices: BoardPrice[]; onSaved: () => void }) {
  const t = useT();
  const [draft, setDraft] = useState<Partial<Record<Material, string>>>({});
  const [saving, setSaving] = useState<Material | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (m: Material) => {
    const cents = parseRandToCents(draft[m] ?? "");
    if (cents === null) return setError(t("Type a price in Rand, for example 3.50."));
    setSaving(m);
    setError(null);
    const ok = await setBoardPrice(centreId, m, cents);
    setSaving(null);
    if (!ok) return setError(t("The price did not save. Try again."));
    setDraft((d) => ({ ...d, [m]: "" }));
    onSaved();
  };

  return (
    <Card className="space-y-3">
      <h2 className="text-2xl font-extrabold">{t("Price board")}</h2>
      <p className="text-sm text-muted-foreground">{t("What you set here is what reclaimers see on their phones.")}</p>
      <ul className="space-y-2">
        {MATERIALS.map((m) => {
          const current = centrePrices.find((p) => p.material === m);
          return (
            <li key={m} className="flex items-center gap-3">
              <MaterialBadge m={m} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{t(MATERIAL_LABEL[m])}</span>
                <span className="block text-sm text-muted-foreground">{current ? formatPerKg(current.centsPerKg) : t("No price yet")}</span>
              </span>
              <input
                aria-label={`${t(MATERIAL_LABEL[m])} ${t("new price per kg")}`}
                inputMode="decimal"
                placeholder="3.50"
                value={draft[m] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [m]: e.target.value }))}
                className="min-h-14 w-28 shrink-0 rounded-2xl border border-border bg-secondary px-3 text-base text-foreground placeholder:text-muted-foreground"
              />
              <button onClick={() => save(m)} disabled={saving === m || !(draft[m] ?? "").trim()} className="min-h-14 rounded-full bg-primary px-4 font-extrabold text-primary-foreground disabled:opacity-50">
                {saving === m ? "…" : t("Save")}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="font-bold text-warning">{error}</p>}
      <p className="text-xs text-muted-foreground">{t("Area")}: {prettyArea(centrePrices[0]?.areaId ?? "")}</p>
    </Card>
  );
}
