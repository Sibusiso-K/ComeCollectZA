"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, Check, MapPin, Tag, Wallet, Recycle } from "lucide-react";
import { Backdrop, ThemeToggle } from "@/components/app/shell";
import { Logo } from "@/components/app/logo";
import { useT } from "@/lib/app/prefs";
import { markTourDone } from "@/lib/app/tour";
import type { Place } from "@/lib/app/photos";
import { cn } from "@/lib/utils";

type Step = { icon: typeof Camera; place: Place; title: string; body: string };

const STEPS: Step[] = [
  {
    icon: Camera,
    place: "orlando",
    title: "Scan your load",
    body: "Point your camera at your pile. The scanner runs on your phone, so your photo stays with you and it works with no data after the first time.",
  },
  {
    icon: Tag,
    place: "towers",
    title: "Know the price",
    body: "See what each centre pays per kilogram and per tonne. The prices are set by the centres themselves.",
  },
  {
    icon: Recycle,
    place: "bara",
    title: "Weigh and sell",
    body: "Pick the material, type the weight, then show your code at the centre. They record the sale and it appears in My money.",
  },
  {
    icon: Wallet,
    place: "kliptown",
    title: "Get what you are owed",
    body: "Producers owe you a service fee of 15c for every kilogram. We keep track, so none of it goes missing.",
  },
  {
    icon: MapPin,
    place: "meadowlands",
    title: "Find buyers and sellers",
    body: "The Market map shows buy-back centres and businesses with material to sell, close to you.",
  },
];

export default function Tour() {
  const t = useT();
  const router = useRouter();
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const Icon = step.icon;

  const finish = () => {
    markTourDone();
    router.replace("/home");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden px-4 py-5">
      <Backdrop place={step.place} />
      <header className="flex items-center justify-between gap-3">
        <Logo size={40} />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={finish} className="glass min-h-12 rounded-full px-5 font-bold">
            {t("Skip")}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-end gap-5 pb-4" aria-live="polite">
        <span className="grid size-20 place-items-center rounded-full bg-highlight text-on-bright">
          <Icon size={36} aria-hidden />
        </span>
        <h1 className="text-5xl font-extrabold leading-[0.95]">{t(step.title)}</h1>
        <p className="text-lg text-muted-foreground">{t(step.body)}</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2" role="presentation">
          {STEPS.map((_, n) => (
            <span key={n} className={cn("h-2.5 rounded-full transition-all", n === i ? "w-8 bg-highlight" : "w-2.5 bg-foreground/40")} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {i > 0 && (
            <button onClick={() => setI(i - 1)} aria-label={t("Back")} className="glass grid size-14 place-items-center rounded-full">
              <ArrowLeft size={22} aria-hidden />
            </button>
          )}
          <button
            onClick={() => (last ? finish() : setI(i + 1))}
            aria-label={last ? t("Done") : t("Next")}
            className="flex min-h-16 items-center gap-3 rounded-full bg-white py-2 pl-6 pr-2 text-lg font-extrabold text-[#0b2415] shadow-[var(--shadow-soft)]"
          >
            {last ? t("Start") : t("Next")}
            <span className="grid size-12 place-items-center rounded-full bg-[#0b2415] text-white ring-4 ring-highlight">
              {last ? <Check size={22} aria-hidden /> : <ArrowRight size={22} aria-hidden />}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
