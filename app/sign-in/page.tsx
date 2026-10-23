"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app/shell";
import { Card, PillButton, Segmented, inputClass } from "@/components/app/bits";
import { useT } from "@/lib/app/prefs";
import { useAuth, type AgeBand } from "@/lib/app/auth";
import { tourDone } from "@/lib/app/tour";
import { cn } from "@/lib/utils";

type Mode = "in" | "up";
type Kind = "reclaimer" | "business";
const AGE_BANDS: AgeBand[] = ["18-24", "25-34", "35+"];

export default function SignIn() {
  const t = useT();
  const router = useRouter();
  const { ready, user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("up");
  const [kind, setKind] = useState<Kind>("reclaimer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  // Once there is a session, go in. First-time people see the tour.
  useEffect(() => {
    if (ready && user) router.replace(tourDone() ? "/home" : "/tour");
  }, [ready, user, router]);

  const canSubmit =
    email.includes("@") &&
    password.length >= 8 &&
    (mode === "in" || (name.trim().length > 0 && area.trim().length >= 2 && consent && (kind === "business" || ageBand !== null)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    if (mode === "in") {
      const err = await signIn(email, password);
      if (err) setError(t(err));
    } else {
      const res = await signUp({ email, password, name, area, ageBand: kind === "reclaimer" ? ageBand : null, kind });
      if (res.error) setError(t(res.error));
      else if (res.needsConfirm) setConfirmSent(true);
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md overflow-x-hidden pb-10">
      <AppHeader place="kliptown" title={mode === "up" ? t("Create your account") : t("Sign in")} />
      <main className="space-y-5 px-4">
        <Segmented<Mode>
          label={t("Account")}
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
            setConfirmSent(false);
          }}
          options={[
            { value: "up", label: t("Create account") },
            { value: "in", label: t("Sign in") },
          ]}
        />

        {confirmSent ? (
          <Card className="space-y-3">
            <h2 className="text-2xl font-extrabold">{t("Check your email")}</h2>
            <p>{t("We sent a link to {email}. Open it to confirm, then come back and sign in.", { email })}</p>
            <PillButton onClick={() => { setMode("in"); setConfirmSent(false); }}>{t("Sign in")}</PillButton>
          </Card>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {mode === "up" && (
              <>
                <fieldset className="space-y-2">
                  <legend className="mb-1 font-bold">{t("I am a")}</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["reclaimer", "business"] as Kind[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={kind === k}
                        onClick={() => setKind(k)}
                        className={cn("min-h-16 rounded-2xl px-3 py-2 text-left font-bold", kind === k ? "bg-primary text-primary-foreground" : "glass")}
                      >
                        {k === "reclaimer" ? t("Reclaimer") : t("Business")}
                        <span className="block text-xs font-normal opacity-80">
                          {k === "reclaimer" ? t("I collect and sell recyclables") : t("Tavern, bottle store or buyer")}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="flex flex-col gap-2 font-bold">
                  {kind === "reclaimer" ? t("Your name") : t("Business name")}
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" className={inputClass} />
                </label>
                <label className="flex flex-col gap-2 font-bold">
                  {t("Your area, for example Orlando East")}
                  <input value={area} onChange={(e) => setArea(e.target.value)} maxLength={60} className={inputClass} />
                </label>
                {kind === "reclaimer" && (
                  <fieldset className="space-y-2">
                    <legend className="mb-1 font-bold">{t("Your age")}</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {AGE_BANDS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          aria-pressed={ageBand === a}
                          onClick={() => setAgeBand(a)}
                          className={cn("min-h-14 rounded-2xl font-bold", ageBand === a ? "bg-primary text-primary-foreground" : "glass")}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("Only used for totals, such as how many young people the programme reaches.")}</p>
                  </fieldset>
                )}
              </>
            )}

            <label className="flex flex-col gap-2 font-bold">
              {t("Email")}
              <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-2 font-bold">
              {t("Password")}
              <input
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                className={inputClass}
              />
              {mode === "up" && <span className="text-xs font-normal text-muted-foreground">{t("At least 8 characters.")}</span>}
            </label>

            {mode === "up" && (
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-6 shrink-0 accent-primary" />
                <span>
                  {t("I agree that ComeCollectZA keeps my name, area and sales to run my account. It never sells my personal details. Programme totals have no names.")}
                </span>
              </label>
            )}

            {error && <p role="alert" className="font-bold text-warning">{error}</p>}
            <PillButton type="submit" disabled={!canSubmit || busy}>
              {busy ? t("One moment…") : mode === "up" ? t("Create account") : t("Sign in")}
            </PillButton>
            <p className="text-center text-xs text-muted-foreground">{t("Phone number sign-in comes when an SMS service is connected.")}</p>
          </form>
        )}
      </main>
    </div>
  );
}
