"use client";

import { useState } from "react";
import { BatteryCharging, Cable, ExternalLink, Laptop, Lightbulb, Microwave, Package, Printer, Refrigerator, ShieldAlert, Smartphone, Tv, type LucideIcon } from "lucide-react";
import { Card, PillButton } from "@/components/app/bits";
import { useT } from "@/lib/app/prefs";
import { CATEGORY_LABEL, CONDITIONS, CONDITION_LABEL, EWASTE_CATEGORIES, adviceFor, optionsFor, type Condition, type EwasteCategory, type StepAction } from "@/lib/app/ewaste";
import { cn } from "@/lib/utils";

export const CATEGORY_ICON: Record<EwasteCategory, LucideIcon> = {
  phone: Smartphone,
  computer: Laptop,
  tv: Tv,
  large_appliance: Refrigerator,
  small_appliance: Microwave,
  battery: BatteryCharging,
  cables: Cable,
  lighting: Lightbulb,
  printer: Printer,
  other: Package,
};

export default function EwasteGuide({
  category,
  setCategory,
  onAction,
}: {
  category: EwasteCategory | null;
  setCategory: (c: EwasteCategory) => void;
  onAction: (action: StepAction, category: EwasteCategory, condition: Condition) => void;
}) {
  const t = useT();
  const [condition, setCondition] = useState<Condition>("works");
  const advice = category ? adviceFor(category, condition) : null;

  return (
    <div className="space-y-4">
      <section aria-labelledby="what" className="space-y-2">
        <h2 id="what" className="text-xl font-extrabold">{t("What do you have?")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {EWASTE_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c];
            const on = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={on}
                className={cn("flex min-h-16 items-center gap-3 rounded-2xl px-3 text-left font-bold", on ? "bg-highlight text-on-bright" : "glass")}
              >
                <Icon size={24} aria-hidden className="shrink-0" />
                <span className="min-w-0 break-words leading-tight hyphens-auto">{t(CATEGORY_LABEL[c])}</span>
              </button>
            );
          })}
        </div>
      </section>

      {category && advice && (
        <>
          <section aria-labelledby="cond" className="space-y-2">
            <h2 id="cond" className="text-xl font-extrabold">{t("What state is it in?")}</h2>
            <div className="grid gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  aria-pressed={condition === c}
                  className={cn("min-h-12 rounded-2xl px-4 text-left font-bold", condition === c ? "bg-highlight text-on-bright" : "glass")}
                >
                  {t(CONDITION_LABEL[c])}
                </button>
              ))}
            </div>
          </section>

          <Card className="space-y-4" aria-live="polite">
            <h2 className="text-2xl font-extrabold leading-tight">{t(advice.headline)}</h2>
            <ol className="space-y-4">
              {advice.steps.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-extrabold text-primary-foreground" aria-hidden>{i + 1}</span>
                  <div className="min-w-0 space-y-2">
                    <p className="text-lg font-extrabold leading-tight">{t(s.title)}</p>
                    <p className="text-sm text-muted-foreground">{t(s.body)}</p>
                    {s.action && s.action !== "tradein" && s.action !== "batteries" && (
                      <PillButton variant={i === 0 ? "primary" : "ghost"} onClick={() => onAction(s.action!, category, condition)}>
                        {s.action === "sell" ? t("Sell or give it here") : t("Find a drop-off point")}
                      </PillButton>
                    )}
                    {(s.action === "tradein" || s.action === "batteries") && (
                      <ul className="space-y-2">
                        {optionsFor(category, s.action).map((o) => (
                          <li key={o.id}>
                            <a href={o.url} target="_blank" rel="noopener noreferrer" className="glass flex min-h-12 items-center justify-between gap-2 rounded-2xl px-4 py-2 font-bold">
                              <span>{t(o.title)}</span>
                              <ExternalLink size={16} aria-hidden className="shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="space-y-3">
            <h3 className="flex items-center gap-2 text-lg font-extrabold">
              <ShieldAlert size={22} aria-hidden className="text-warning" />
              {t("Before you let go of it")}
            </h3>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {advice.care.map((c) => (
                <li key={c}>{t(c)}</li>
              ))}
            </ul>
          </Card>

          <Card className="space-y-2">
            <h3 className="text-lg font-extrabold">{t("More places to look")}</h3>
            <ul className="space-y-2">
              {optionsFor(category).map((o) => (
                <li key={o.id}>
                  <a href={o.url} target="_blank" rel="noopener noreferrer" className="block rounded-2xl bg-secondary px-4 py-3">
                    <span className="flex items-center justify-between gap-2 font-bold">
                      {t(o.title)}
                      <ExternalLink size={16} aria-hidden className="shrink-0" />
                    </span>
                    <span className="block text-sm text-muted-foreground">{t(o.body)}</span>
                    <span className="block text-xs text-muted-foreground">{t("Source")}: {o.source}, {t("checked")} {o.checkedOn}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
