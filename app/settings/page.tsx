"use client";

import { useRouter } from "next/navigation";
import { AppScreen, PageTitle } from "@/components/app/shell";
import { Card, PillButton, Segmented } from "@/components/app/bits";
import { LANGUAGES } from "@/lib/app/i18n";
import { usePrefs, useT, type ThemePref } from "@/lib/app/prefs";
import { cn } from "@/lib/utils";

export default function Settings() {
  const t = useT();
  const router = useRouter();
  const { lang, setLang, theme, setTheme, dataSaver, setDataSaver, setSignedIn, installPrompt } = usePrefs();

  return (
    <AppScreen>
      <PageTitle>{t("Settings")}</PageTitle>

      <Card className="space-y-3">
        <h2 className="font-display text-xl font-bold">{t("Language")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              aria-pressed={lang === l.code}
              className={cn("min-h-14 rounded-2xl px-3 py-2 text-left font-bold", lang === l.code ? "bg-primary text-primary-foreground" : "bg-secondary")}
            >
              {l.name}
              {!l.full && <span className="block text-xs font-normal opacity-80">{t("translation in progress")}</span>}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-xl font-bold">{t("Theme")}</h2>
        <Segmented<ThemePref>
          label={t("Theme")}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: t("Light") },
            { value: "dark", label: t("Dark") },
            { value: "system", label: t("System") },
          ]}
        />
      </Card>

      <Card className="space-y-3">
        <label className="flex min-h-14 items-center justify-between gap-3 font-bold">
          {t("Data saver")}
          <input type="checkbox" checked={dataSaver} onChange={(e) => setDataSaver(e.target.checked)} className="size-6 accent-primary" />
        </label>
        <p className="text-sm text-muted-foreground">{t("Stops charts loading until you tap them.")}</p>
      </Card>

      {installPrompt && <PillButton onClick={() => void installPrompt()}>{t("Install the app")}</PillButton>}

      <PillButton
        variant="ghost"
        onClick={() => {
          setSignedIn(false);
          router.push("/");
        }}
      >
        {t("Sign out")}
      </PillButton>
    </AppScreen>
  );
}
