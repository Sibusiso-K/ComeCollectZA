"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mic, Send } from "lucide-react";
import { useT } from "@/lib/app/prefs";
import { firstName, useAuth } from "@/lib/app/auth";
import { bestPrice, getBoardPrices, getMySales, type BoardPrice, type MySale } from "@/lib/app/api";
import { CODE_BY_MATERIAL, MATERIAL_LABEL, formatPerKg, formatRand, formatWholeRand, type Material } from "@/lib/app/logic";
import { feeTotals } from "@/lib/app/summary";
import { MARKET_RANGES } from "@/lib/market-prices";

export const SUGGESTIONS = ["When should I sell cans?", "How much is my service fee?", "Which centre pays most?"];

const KEYWORDS: [Material, RegExp][] = [
  ["cans", /can|blik|ithini|iitoti/],
  ["pet", /\bpet\b|bottle|bottel/],
  ["hdpe", /hdpe/],
  ["cardboard", /cardboard|karton|ikhadibhodi/],
  ["paper", /paper|papier|iphepha/],
  ["glass", /glass|glas\b|ingilazi/],
];

function materialIn(q: string): Material {
  const s = q.toLowerCase();
  return KEYWORDS.find(([, re]) => re.test(s))?.[0] ?? "cans";
}

type Ctx = { prices: BoardPrice[]; sales: MySale[]; signedIn: boolean; t: ReturnType<typeof useT> };

/** Answers from the live board and the person's own fees. This is a lookup, not a model. */
export function answer(q: string, { prices, sales, signedIn, t }: Ctx): string {
  const s = q.toLowerCase();
  const m = materialIn(s);
  const label = t(MATERIAL_LABEL[m]);
  const best = bestPrice(prices, m);
  const out: string[] = [];

  if (/fee|fooi|imali yesevisi|service/.test(s)) {
    out.push(t("The service fee is 15c per kg, which is R150 per tonne."));
    if (signedIn && sales.length) {
      const f = feeTotals(sales);
      out.push(t("Yours: {paid} paid, {owed} still owed, {missing} missing.", { paid: formatRand(f.paidCents), owed: formatRand(f.owedCents), missing: formatRand(f.missingCents) }));
    } else if (!signedIn) {
      out.push(t("Sign in to track your own fees."));
    }
  }

  if (/centre|center|sentrum|isikhungo|iziko|pays most|best|beste/.test(s)) {
    out.push(best ? t("Best {label} price today: {price} at {centre}.", { label, price: formatPerKg(best.centsPerKg), centre: best.centre }) : t("No prices are saved yet. Connect and try again."));
  }

  if (/when|sell|wanneer|nini|verkoop|thengis/.test(s) && !out.length) {
    const range = MARKET_RANGES.find((r) => r.material === CODE_BY_MATERIAL[m]);
    if (best && range) {
      const pos = (best.centsPerKg - range.lowCentsPerKg) / (range.highCentsPerKg - range.lowCentsPerKg);
      const span = `${formatWholeRand(range.lowCentsPerKg * 10)} to ${formatWholeRand(range.highCentsPerKg * 10)}/t`;
      const where = pos < 0.34 ? t("at the low end of") : pos > 0.66 ? t("at the top of") : t("in the middle of");
      const advice = pos < 0.34 ? t("If you can keep it dry and safe, waiting may pay more.") : pos > 0.66 ? t("A good day to sell.") : t("Selling is reasonable.");
      out.push(t("Today's best {label} price, {price}, is {where} the usual range ({span}). {advice} This compares with the range. It is not a forecast.", { label, price: formatPerKg(best.centsPerKg), where, span, advice }));
    } else {
      out.push(t("No prices are saved yet. Connect and try again."));
    }
  }

  return out.length ? out.join(" ") : t("I can help with prices, when to sell, service fees and centres. Try a suggestion.");
}

export function Orb({ size = 56 }: { size?: number }) {
  return <span className="orb block shrink-0" style={{ width: size, height: size }} aria-hidden />;
}

export function AssistantChat({ compact }: { compact?: boolean }) {
  const t = useT();
  const { profile, user } = useAuth();
  const [msgs, setMsgs] = useState<{ me: boolean; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [prices, setPrices] = useState<BoardPrice[]>([]);
  const [sales, setSales] = useState<MySale[]>([]);

  useEffect(() => {
    getBoardPrices().then((r) => setPrices(r.data));
  }, []);
  useEffect(() => {
    if (user) getMySales(user.id).then((r) => setSales(r.data));
  }, [user]);

  const ask = (text: string) => {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { me: true, text }, { me: false, text: answer(text, { prices, sales, signedIn: !!user, t }) }]);
    setInput("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Orb size={compact ? 44 : 64} />
        <div className="min-w-0 space-y-2">
          <p className="glass rounded-3xl rounded-tl-md px-4 py-3 font-bold">
            {t("Hi {name}, how can I help with recycling today?", { name: firstName(profile) || t("friend") })}
          </p>
          <p className="text-xs text-muted-foreground">{t("Answers come from the live board and your own sales. No data leaves your phone for this.")}</p>
        </div>
      </div>
      {msgs.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {msgs.slice(compact ? -2 : 0).map((m, i) => (
            <li key={i} className={m.me ? "ml-10 rounded-3xl rounded-tr-md bg-primary px-4 py-3 text-primary-foreground" : "glass mr-6 rounded-3xl rounded-tl-md px-4 py-3"}>
              {m.text}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => ask(t(s))} className="glass min-h-12 rounded-full px-4 text-left font-bold">
            {t(s)}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="glass flex items-center gap-2 rounded-full p-1.5 pl-2"
      >
        <button type="button" aria-label={t("Voice input (coming soon)")} disabled className="grid size-12 shrink-0 place-items-center rounded-full text-muted-foreground">
          <Mic size={22} />
        </button>
        <label className="sr-only" htmlFor="ask">{t("Ask a question")}</label>
        <input
          id="ask"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("Ask a question")}
          className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" aria-label={t("Send")} className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Send size={20} />
        </button>
      </form>
      {compact && (
        <Link href="/assistant" className="block text-center font-bold text-primary underline">
          {t("Open the assistant")}
        </Link>
      )}
    </div>
  );
}
