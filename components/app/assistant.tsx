"use client";

import { useState } from "react";
import Link from "next/link";
import { Mic, Send } from "lucide-react";
import { usePrefs, useT } from "@/lib/app/prefs";
import { DemoLabel } from "./bits";

export const SUGGESTIONS = ["When should I sell cans?", "How much is my service fee?", "Which centre pays most?"];

const A_CANS = "Cans are worth the most per kg.";
const A_WHEN = "Sell when the board price for your material is higher than last week.";
const A_FEE = "The service fee is 15c per kg.";
const A_CENTRE = "The centre with the best board price is shown on the Prices screen.";
const A_HELP = "I can help with prices, when to sell, service fees and centres. Try a suggestion.";

/** Local scripted answers. No network call. Returns English keys for translation. */
export function scriptedAnswer(q: string): string[] {
  const s = q.toLowerCase();
  const out: string[] = [];
  if (/can|blik|ithini|iitoti|worth|most per/.test(s) && !/centre|sentrum/.test(s)) out.push(A_CANS);
  if (/when|sell|wanneer|nini|verkoop|thengis/.test(s)) out.push(A_WHEN);
  if (/fee|fooi|imali yesevisi|service/.test(s)) out.push(A_FEE);
  if (/centre|center|sentrum|isikhungo|iziko|pays most|best/.test(s)) out.push(A_CENTRE);
  return out.length ? [...new Set(out)] : [A_HELP];
}

export function Orb({ size = 56 }: { size?: number }) {
  return <span className="orb block shrink-0" style={{ width: size, height: size }} aria-hidden />;
}

export function AssistantChat({ compact }: { compact?: boolean }) {
  const t = useT();
  const { firstName } = usePrefs();
  const [msgs, setMsgs] = useState<{ me: boolean; text: string }[]>([]);
  const [input, setInput] = useState("");

  const ask = (q: string) => {
    if (!q.trim()) return;
    const answers = scriptedAnswer(q).map((a) => t(a)).join(" ");
    setMsgs((m) => [...m, { me: true, text: q }, { me: false, text: answers }]);
    setInput("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Orb size={compact ? 44 : 64} />
        <div className="min-w-0 space-y-2">
          <p className="glass rounded-3xl rounded-tl-md px-4 py-3 font-bold">
            {t("Hi {name}, how can I help with recycling today?", { name: firstName })}
          </p>
          <DemoLabel>{t("Scripted answers for the demo")}</DemoLabel>
        </div>
      </div>
      {msgs.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {msgs.slice(compact ? -2 : 0).map((m, i) => (
            <li
              key={i}
              className={
                m.me
                  ? "ml-10 rounded-3xl rounded-tr-md bg-primary px-4 py-3 text-primary-foreground"
                  : "mr-6 rounded-3xl rounded-tl-md bg-secondary px-4 py-3"
              }
            >
              {m.text}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => ask(t(s))} className="min-h-12 rounded-full border border-border bg-card px-4 text-left font-bold">
            {t(s)}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 rounded-full bg-card p-1.5 pl-2 shadow-[var(--shadow-soft)]"
      >
        <button type="button" aria-label={t("Voice input (coming soon)")} disabled className="grid size-12 shrink-0 place-items-center rounded-full text-muted-foreground">
          <Mic size={22} />
        </button>
        <label className="sr-only" htmlFor="ask">
          {t("Ask a question")}
        </label>
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
          {t("Ask a question")}
        </Link>
      )}
    </div>
  );
}
