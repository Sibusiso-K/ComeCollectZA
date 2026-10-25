"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { AppScreen, PageTitle } from "@/components/app/shell";
import { Card, EmptyState, MaterialBadge, PillButton, SavedNote, Sticker } from "@/components/app/bits";
import { adviceFor, type Advice } from "@/lib/app/advice";
import { LoadScanner } from "@/components/app/scanner";
import { useT } from "@/lib/app/prefs";
import { useAuth } from "@/lib/app/auth";
import { getBoardPrices, type BoardPrice, type Fetched } from "@/lib/app/api";
import { MATERIALS, MATERIAL_LABEL, formatPerKg, formatPerTonne, formatRand, loadTotalCents, parseKgToGrams, saleCents, type LoadItem, type Material } from "@/lib/app/logic";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

// The load is kept on this phone so a reclaimer can scan several loads before going to the centre.
const LOAD_KEY = "ccza.load.v1";

function isLoadItem(x: unknown): x is LoadItem {
  if (typeof x !== "object" || x === null) return false;
  const i = x as Record<string, unknown>;
  return typeof i.id === "string" && (MATERIALS as string[]).includes(i.material as string) && typeof i.grams === "number" && typeof i.centsPerKg === "number" && typeof i.centre === "string";
}

export default function Sell() {
  const t = useT();
  const { user, profile } = useAuth();
  const [prices, setPrices] = useState<Fetched<BoardPrice[]> | null>(null);
  const [material, setMaterial] = useState<Material | null>(null);
  const [typed, setTyped] = useState("");
  const [centreId, setCentreId] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [load, setLoad] = useState<LoadItem[]>([]);

  useEffect(() => {
    getBoardPrices().then(setPrices);
    const m = new URLSearchParams(window.location.search).get("m");
    if (m && (MATERIALS as string[]).includes(m)) setMaterial(m as Material);
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(LOAD_KEY) ?? "[]");
      if (Array.isArray(saved)) setLoad(saved.filter(isLoadItem));
    } catch {
      // Nothing saved, or storage is blocked: the load then lasts for this visit only.
    }
  }, []);

  const saveLoad = (items: LoadItem[]) => {
    setLoad(items);
    try {
      localStorage.setItem(LOAD_KEY, JSON.stringify(items));
    } catch {
      // Storage is blocked (private window): the load still works until the page closes.
    }
  };

  const choose = (m: Material) => {
    setMaterial(m);
    setCentreId(null);
    setTyped("");
    setShowCode(false);
  };

  const options = material && prices ? prices.data.filter((p) => p.material === material).sort((a, b) => b.centsPerKg - a.centsPerKg) : [];
  const picked = options.find((o) => o.centreId === centreId) ?? options[0];
  const grams = parseKgToGrams(typed);
  const advice = material && picked ? adviceFor(material, picked.centsPerKg, options) : null;

  const adviceLabel = (a: Advice) => (a.verdict === "sell" ? t("Sell now") : a.verdict === "compare" ? t("Compare first") : a.verdict === "wait" ? t("Hold if you can") : t("Fair price"));
  const adviceLine = (a: Advice, m: Material) => {
    if (a.verdict === "compare") return t("{centre} pays {price} for this. Check it first.", { centre: a.centre, price: formatPerKg(a.centsPerKg) });
    if (a.verdict === "sell" && a.reason === "falling") return t("{material}: the price fell about {pct}% this year, so waiting is unlikely to pay more.",{ material: t(MATERIAL_LABEL[m]), pct: a.dropPercent });
    if (a.verdict === "sell") return t("This price is at the high end of the usual range.");
    if (a.verdict === "wait") return t("This price is at the low end of the usual range. If you can keep the load, wait and watch the board.");
    return t("A fair price. Sell when you are ready.");
  };

  const press = (k: string) => {
    setShowCode(false);
    if (k === "⌫") return setTyped((s) => s.slice(0, -1));
    if (k === ".") return setTyped((s) => (s.includes(".") || s === "" ? s : s + "."));
    const decimals = typed.split(".")[1];
    if (decimals !== undefined && decimals.length >= 3) return;
    if (typed.replace(".", "").length >= 6) return;
    setTyped((s) => s + k);
  };

  // Adds the weighed item at the centre price it is showing, then clears the weight for the next item.
  const addToLoad = () => {
    if (!material || !picked || grams === null || grams <= 0) return;
    saveLoad([...load, { id: `${Date.now()}-${load.length}`, material, grams, centsPerKg: picked.centsPerKg, centre: picked.centre }]);
    setTyped("");
    setShowCode(false);
  };

  const isReclaimer = profile?.role === "reclaimer";

  return (
    <AppScreen place="bara">
      <PageTitle aside={prices && <SavedNote fromCache={prices.fromCache} savedAt={prices.savedAt} />}>{t("Sell")}</PageTitle>

      {load.length > 0 && (
        <Card className="space-y-3" aria-labelledby="my-load">
          <div className="flex items-center justify-between gap-2">
            <h2 id="my-load" className="text-xl font-extrabold">{t("My load")}</h2>
            <button onClick={() => saveLoad([])} className="text-sm font-bold underline">{t("Clear load")}</button>
          </div>
          <ul className="space-y-2">
            {load.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-bold">{t(MATERIAL_LABEL[item.material])} · {Number((item.grams / 1000).toFixed(3))} kg</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.centre}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-extrabold tabular-nums">{formatRand(saleCents(item.grams, item.centsPerKg))}</span>
                  <button
                    onClick={() => saveLoad(load.filter((x) => x.id !== item.id))}
                    aria-label={`${t("Remove")} ${t(MATERIAL_LABEL[item.material])}`}
                    className="min-h-11 min-w-11 rounded-full bg-secondary font-extrabold"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-2xl font-extrabold tabular-nums">{t("About {amount} in total", { amount: formatRand(loadTotalCents(load)) })}</p>
          <p className="text-xs text-muted-foreground">{t("Estimates at each centre's price today. The centre weighs and sets the final price.")}</p>
        </Card>
      )}

      <section className="space-y-3" aria-labelledby="step1">
        <h2 id="step1" className="text-xl font-extrabold">{t("1. What are you selling?")}</h2>
        <LoadScanner onPick={choose} />
        <div className="grid grid-cols-3 gap-2">
          {MATERIALS.map((m) => (
            <button
              key={m}
              onClick={() => choose(m)}
              aria-pressed={material === m}
              className={cn("flex flex-col items-center gap-1 rounded-2xl p-3 text-sm font-bold", material === m ? "bg-highlight text-on-bright" : "glass")}
            >
              <MaterialBadge m={m} size={36} />
              {t(MATERIAL_LABEL[m])}
            </button>
          ))}
        </div>
      </section>

      {material && (
        <section className="space-y-3" aria-labelledby="step2">
          <h2 id="step2" className="text-xl font-extrabold">{t("2. Where and how much?")}</h2>
          {options.length === 0 ? (
            <EmptyState title={t("No price yet")} body={t("No centre has posted a price for this material yet.")} />
          ) : (
            <>
              <ul className="space-y-2" aria-label={t("Centres")}>
                {options.map((o, i) => (
                  <li key={o.centreId}>
                    <button
                      onClick={() => setCentreId(o.centreId)}
                      aria-pressed={picked?.centreId === o.centreId}
                      className={cn("flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left", picked?.centreId === o.centreId ? "bg-primary text-primary-foreground" : "glass")}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{o.centre}</span>
                        {i === 0 && <span className="text-xs opacity-80">{t("Best price")}</span>}
                      </span>
                      <span className="shrink-0 text-right font-extrabold tabular-nums">
                        {formatPerKg(o.centsPerKg)}
                        <span className="block text-xs font-normal opacity-80">{formatPerTonne(o.centsPerKg)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {advice && material && (
                <Card className="space-y-2" aria-labelledby="advice">
                  <div className="flex items-center justify-between gap-2">
                    <h3 id="advice" className="text-lg font-extrabold">{t("Sell now or wait?")}</h3>
                    <Sticker>{adviceLabel(advice)}</Sticker>
                  </div>
                  <p className="font-bold">{adviceLine(advice, material)}</p>
                  <p className="text-xs text-muted-foreground">{t("From today's centre prices and public 2026 prices. Not a promise of tomorrow's price.")}</p>
                </Card>
              )}

              <Card className="space-y-3">
                <p className="text-5xl font-extrabold tabular-nums" aria-live="polite">
                  {typed || "0"} <span className="text-lg font-bold">kg</span>
                </p>
                {grams !== null && grams > 0 && picked ? (
                  <p className="text-2xl font-extrabold tabular-nums">
                    {formatRand(saleCents(grams, picked.centsPerKg))}
                    <span className="block text-sm font-normal text-muted-foreground">{t("estimate at {centre}", { centre: picked.centre })}</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("Type the weight to see the estimate.")}</p>
                )}
                <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("Keypad")}>
                  {KEYS.map((k) => (
                    <button key={k} onClick={() => press(k)} className="min-h-14 rounded-2xl bg-secondary text-2xl font-extrabold">
                      {k}
                    </button>
                  ))}
                </div>
                {grams !== null && grams > 0 && picked && (
                  <PillButton variant="cta" onClick={addToLoad}>{t("Add to my load")}</PillButton>
                )}
              </Card>
            </>
          )}
        </section>
      )}

      {material && grams !== null && grams > 0 && picked && (
        <section className="space-y-3" aria-labelledby="step3">
          <h2 id="step3" className="text-xl font-extrabold">{t("3. Show this at the centre")}</h2>
          {isReclaimer && profile?.qrToken ? (
            showCode ? (
              <Card className="flex flex-col items-center gap-3">
                <div className="rounded-2xl bg-white p-3">
                  <QRCodeSVG value={profile.qrToken} size={200} marginSize={1} />
                </div>
                <p className="text-lg font-extrabold tracking-wider">{profile.qrToken}</p>
                <p className="text-center text-sm text-muted-foreground">
                  {t("The centre scans this and enters the weight they measure. The price is the one on their board.")}
                </p>
              </Card>
            ) : (
              <PillButton variant="cta" onClick={() => setShowCode(true)}>{t("Show my code")}</PillButton>
            )
          ) : !user ? (
            <EmptyState title={t("Sign in to get your code")} body={t("Your code proves who you are at the centre, so your sale is saved to your account.")}>
              <Link href="/sign-in" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-lg font-extrabold text-primary-foreground">
                {t("Create account")}
              </Link>
            </EmptyState>
          ) : (
            <EmptyState title={t("Reclaimer accounts sell at centres")} body={t("Your account is not a reclaimer account, so it has no centre code. Use the Market to post material for sale.")} />
          )}
        </section>
      )}
    </AppScreen>
  );
}
