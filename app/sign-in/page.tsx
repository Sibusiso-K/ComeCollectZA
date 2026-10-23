"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrefs, useT } from "@/lib/app/prefs";
import { DemoLabel, PillButton } from "@/components/app/bits";
import { ThemeToggle } from "@/components/app/shell";

export default function SignIn() {
  const t = useT();
  const router = useRouter();
  const { setSignedIn } = usePrefs();
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const codeOk = /^\d{6}$/.test(code);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sent) {
      setSent(true);
      return;
    }
    if (!codeOk) return;
    setSignedIn(true);
    router.push("/home");
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md space-y-6 overflow-x-hidden px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-extrabold">{t("Sign in")}</h1>
        <ThemeToggle />
      </div>
      <DemoLabel>{t("Demo sign-in")}</DemoLabel>
      <form onSubmit={submit} className="space-y-4">
        <label className="flex flex-col gap-2 font-bold">
          {t("Phone number")}
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="min-h-14 rounded-2xl border border-border bg-card px-4 text-lg font-normal"
            placeholder="082 000 0000"
          />
        </label>
        {sent && (
          <label className="flex flex-col gap-2 font-bold">
            {t("6-digit code")}
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="min-h-14 rounded-2xl border border-border bg-card px-4 font-dot text-2xl tracking-[0.3em]"
            />
          </label>
        )}
        <PillButton type="submit" disabled={sent ? !codeOk : phone.trim().length < 9}>
          {sent ? t("Sign in") : t("Send code")}
        </PillButton>
      </form>
      <p className="text-sm text-muted-foreground">
        {t("In this demo, any 6-digit code works.")}
      </p>
    </div>
  );
}
