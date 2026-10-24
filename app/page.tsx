"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { LANGUAGES } from "@/lib/app/i18n";
import { usePrefs, useT } from "@/lib/app/prefs";
import { useAuth } from "@/lib/app/auth";
import { Backdrop, ThemeToggle } from "@/components/app/shell";
import { Logo } from "@/components/app/logo";
import { cn } from "@/lib/utils";

export default function Welcome() {
  const t = useT();
  const router = useRouter();
  const { lang, setLang } = usePrefs();
  const { ready, user } = useAuth();

  // Someone who is already signed in goes straight in.
  useEffect(() => {
    if (ready && user) router.replace("/home");
  }, [ready, user, router]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 overflow-x-hidden px-4 py-5">
      <Backdrop place="towers" />
      <div className="flex items-center justify-between gap-3">
        <Logo size={44} />
        <ThemeToggle />
      </div>

      <div className="flex-1 space-y-3 pt-6">
        <h1 className="text-5xl font-extrabold uppercase leading-[0.95] tracking-tight">
          {t("Fair pay for every kilogram")}
        </h1>
        <p className="text-lg text-muted-foreground">{t("Get paid fairly for every kilogram you collect.")}</p>
      </div>

      <section aria-labelledby="lang" className="glass space-y-2 rounded-3xl p-3">
        <h2 id="lang" className="px-1 text-base font-extrabold">{t("Choose your language")}</h2>
        <div className="grid grid-cols-3 gap-1.5">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              aria-pressed={lang === l.code}
              className={cn("min-h-12 rounded-xl px-2 py-1 text-sm font-bold", lang === l.code ? "bg-primary text-primary-foreground" : "bg-secondary")}
            >
              {l.name}
              {!l.full && <span aria-label={t("translation in progress")}> *</span>}
            </button>
          ))}
        </div>
        <p className="px-1 text-xs text-muted-foreground">* {t("translation in progress")}</p>
      </section>

      <div className="flex items-center justify-between gap-4">
        <Link href="/home" className="inline-flex min-h-12 items-center font-bold underline underline-offset-4">
          {t("Look around first")}
        </Link>
        <Link
          href="/sign-in"
          aria-label={t("Get started")}
          className="flex min-h-16 items-center gap-3 rounded-full bg-white py-2 pl-6 pr-2 text-lg font-extrabold text-[#0b2415] shadow-[var(--shadow-soft)]"
        >
          {t("Get started")}
          <span className="grid size-12 place-items-center rounded-full bg-[#0b2415] text-white ring-4 ring-highlight">
            <ArrowRight size={22} aria-hidden />
          </span>
        </Link>
      </div>
    </div>
  );
}
