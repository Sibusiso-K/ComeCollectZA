"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppScreen, PageTitle } from "@/components/app/shell";
import { Card, PillButton, Segmented } from "@/components/app/bits";
import { LANGUAGES } from "@/lib/app/i18n";
import { usePrefs, useT, type ThemePref } from "@/lib/app/prefs";
import { useAuth } from "@/lib/app/auth";
import { resetTour } from "@/lib/app/tour";
import { PLACES, PLACE_ORDER } from "@/lib/app/photos";
import { prettyArea } from "@/lib/app/logic";
import { cn } from "@/lib/utils";

export default function Settings() {
  const t = useT();
  const router = useRouter();
  const { lang, setLang, theme, setTheme, dataSaver, setDataSaver, installPrompt } = usePrefs();
  const { user, profile, signOut } = useAuth();

  return (
    <AppScreen place="bara">
      <PageTitle>{t("Settings")}</PageTitle>

      <Card className="space-y-2">
        <h2 className="text-xl font-extrabold">{t("Account")}</h2>
        {user ? (
          <>
            <p className="font-bold">{profile?.displayName ?? user.email}</p>
            <p className="text-sm text-muted-foreground">
              {user.email}
              {profile && ` · ${t(profile.role === "reclaimer" ? "Reclaimer" : profile.role === "business" ? "Business" : profile.role === "operator" ? "Centre" : "Programme")}`}
              {profile?.area && ` · ${prettyArea(profile.area)}`}
            </p>
            <PillButton
              variant="ghost"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              {t("Sign out")}
            </PillButton>
          </>
        ) : (
          <Link href="/sign-in" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-lg font-extrabold text-primary-foreground">{t("Sign in")}</Link>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl font-extrabold">{t("Language")}</h2>
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
        <h2 className="text-xl font-extrabold">{t("Theme")}</h2>
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
        <p className="text-sm text-muted-foreground">{t("Stops photos, charts and the map loading until you tap them.")}</p>
      </Card>

      {installPrompt && <PillButton onClick={() => void installPrompt()}>{t("Install the app")}</PillButton>}

      <PillButton
        variant="ghost"
        onClick={() => {
          resetTour();
          router.push("/tour");
        }}
      >
        {t("Show the tour again")}
      </PillButton>

      <Card className="space-y-2">
        <h2 className="text-xl font-extrabold">{t("Photo credits")}</h2>
        <p className="text-sm text-muted-foreground">{t("Backdrop photos of Soweto are from Wikimedia Commons, under open licences.")}</p>
        <ul className="space-y-1 text-sm">
          {PLACE_ORDER.map((p) => {
            const c = PLACES[p].credit;
            return (
              <li key={p}>
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{c.title}</a>
                {" · "}{c.author}{" · "}{c.licence}
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">{t("Map data © OpenStreetMap contributors.")}</p>
      </Card>
    </AppScreen>
  );
}
