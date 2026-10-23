"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate, type LangCode } from "./i18n";
import { DEMO_FIRST_NAME } from "./demo-data";

export type ThemePref = "light" | "dark" | "system";

type Prefs = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  isDark: boolean;
  dataSaver: boolean;
  setDataSaver: (v: boolean) => void;
  signedIn: boolean;
  setSignedIn: (v: boolean) => void;
  firstName: string;
  online: boolean;
  installPrompt: (() => Promise<void>) | null;
};

const Ctx = createContext<Prefs | null>(null);
const K = { lang: "ccza.lang", theme: "ccza.theme", saver: "ccza.saver", signed: "ccza.signed" };

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangS] = useState<LangCode>("en");
  const [theme, setThemeS] = useState<ThemePref>("system");
  const [sysDark, setSysDark] = useState(false);
  const [dataSaver, setSaverS] = useState(false);
  const [signedIn, setSignedS] = useState(false);
  const [online, setOnline] = useState(true);
  const [deferred, setDeferred] = useState<Event & { prompt: () => Promise<void> } | null>(null);

  useEffect(() => {
    setLangS((localStorage.getItem(K.lang) as LangCode) || "en");
    setThemeS((localStorage.getItem(K.theme) as ThemePref) || "system");
    setSaverS(localStorage.getItem(K.saver) === "1");
    setSignedS(localStorage.getItem(K.signed) === "1");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSysDark(mq.matches);
    const onMq = () => setSysDark(mq.matches);
    mq.addEventListener("change", onMq);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const bip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as Event & { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", bip);
    return () => {
      mq.removeEventListener("change", onMq);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", bip);
    };
  }, []);

  const isDark = theme === "dark" || (theme === "system" && sysDark);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: LangCode) => {
    localStorage.setItem(K.lang, l);
    setLangS(l);
  }, []);
  const setTheme = useCallback((t: ThemePref) => {
    localStorage.setItem(K.theme, t);
    setThemeS(t);
  }, []);
  const setDataSaver = useCallback((v: boolean) => {
    localStorage.setItem(K.saver, v ? "1" : "0");
    setSaverS(v);
  }, []);
  const setSignedIn = useCallback((v: boolean) => {
    localStorage.setItem(K.signed, v ? "1" : "0");
    setSignedS(v);
  }, []);

  const value = useMemo<Prefs>(
    () => ({
      lang, setLang, theme, setTheme, isDark, dataSaver, setDataSaver, signedIn, setSignedIn,
      firstName: DEMO_FIRST_NAME, online,
      installPrompt: deferred
        ? async () => {
            await deferred.prompt();
            setDeferred(null);
          }
        : null,
    }),
    [lang, setLang, theme, setTheme, isDark, dataSaver, setDataSaver, signedIn, setSignedIn, online, deferred],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const c = useContext(Ctx);
  if (!c) throw new Error("PrefsProvider missing");
  return c;
}

export function useT() {
  const { lang } = usePrefs();
  return useCallback((key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
}

