"use client";

import Link from "next/link";
import { LANGUAGES } from "@/lib/app/i18n";
import { usePrefs, useT } from "@/lib/app/prefs";
import { ThemeToggle } from "@/components/app/shell";
import { Sticker } from "@/components/app/bits";
import { cn } from "@/lib/utils";

export default function Welcome() {
  const t = useT();
  const { lang, setLang } = usePrefs();
  return (
    <div className="mx-auto min-h-screen w-full max-w-md space-y-6 overflow-x-hidden px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-5xl font-extrabold leading-[0.95]">ComeCollectZA</h1>
        <ThemeToggle />
      </div>
      <p className="text-xl font-bold">{t("Get paid fairly for every kilogram you collect.")}</p>
      <section aria-labelledby="lang">
        <h2 id="lang" className="mb-3 font-display text-2xl font-bold">
          {t("Choose your language")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              aria-pressed={lang === l.code}
              className={cn(
                "min-h-16 rounded-2xl px-3 py-2 text-left font-bold",
                lang === l.code ? "bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {l.name}
              {!l.full && <span className="block text-xs font-normal opacity-80">{t("translation in progress")}</span>}
            </button>
          ))}
        </div>
      </section>
      <Link
        href="/sign-in"
        className="flex min-h-14 w-full items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground"
      >
        {t("Get started")}
      </Link>
      <div className="space-y-2 text-center">
        <Sticker>{t("Stays on your phone")}</Sticker>
        <p className="text-muted-foreground">{t("Works with no data after your first scan")}</p>
      </div>
    </div>
  );
}
