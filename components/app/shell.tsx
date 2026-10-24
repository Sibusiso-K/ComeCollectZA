"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, Moon, Recycle, Sun, Tag, User, WifiOff, Wallet } from "lucide-react";
import { usePrefs, useT } from "@/lib/app/prefs";
import { firstName, useAuth } from "@/lib/app/auth";
import { PLACES, type Place } from "@/lib/app/photos";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

/** A full-screen overview photo of a part of Soweto, under a green scrim so text stays readable. */
export function Backdrop({ place }: { place: Place }) {
  const { dataSaver } = usePrefs();
  return (
    <div aria-hidden className="fixed inset-0 -z-10 bg-background">
      {!dataSaver && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${PLACES[place].src})` }} />}
      <div className="absolute inset-0" style={{ background: "var(--scrim)" }} />
    </div>
  );
}

export function ThemeToggle() {
  const { isDark, setTheme } = usePrefs();
  const t = useT();
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t("Switch to light mode") : t("Switch to dark mode")}
      className="glass grid size-12 shrink-0 place-items-center rounded-full text-foreground"
    >
      {isDark ? <Sun size={22} /> : <Moon size={22} />}
    </button>
  );
}

export function OfflineBanner() {
  const { online } = usePrefs();
  const t = useT();
  if (online) return null;
  return (
    <div role="status" className="mx-4 mb-3 flex items-center gap-2 rounded-2xl bg-warning px-4 py-3 font-bold text-on-bright">
      <WifiOff size={20} className="shrink-0" /> {t("You are offline. Showing the last saved copy.")}
    </div>
  );
}

function AccountButton() {
  const { profile, user } = useAuth();
  const t = useT();
  const initial = firstName(profile)[0];
  return (
    <Link
      href={user ? "/settings" : "/sign-in"}
      aria-label={user ? t("Settings") : t("Sign in")}
      className="grid size-12 shrink-0 place-items-center rounded-full bg-highlight text-lg font-extrabold text-on-bright"
    >
      {initial ? initial.toUpperCase() : <User size={22} aria-hidden />}
    </Link>
  );
}

function TopBar() {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pb-3 pt-4">
      <Link href="/home" aria-label="ComeCollectZA" className="flex min-h-11 items-center">
        <Logo size={40} />
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <AccountButton />
      </div>
    </header>
  );
}

function BottomNav() {
  const t = useT();
  const path = usePathname();
  const item = (to: string, label: string, Icon: typeof Home) => (
    <Link
      href={to}
      aria-label={label}
      aria-current={path === to ? "page" : undefined}
      className={cn("flex min-h-14 min-w-14 flex-col items-center justify-center rounded-full text-xs font-bold", path === to ? "text-nav-active" : "text-nav-foreground")}
    >
      <Icon size={22} aria-hidden />
      <span className="mt-0.5">{label}</span>
    </Link>
  );
  return (
    <nav
      aria-label={t("Main")}
      className="no-print fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[calc(100%-1.5rem)] max-w-sm items-center justify-between rounded-full bg-nav px-2 py-2 shadow-[var(--shadow-soft)] backdrop-blur-xl"
    >
      {item("/home", t("Home"), Home)}
      {item("/prices", t("Prices"), Tag)}
      <Link
        href="/sell"
        aria-label={t("Sell")}
        className="-my-5 grid size-18 place-items-center rounded-full bg-highlight font-extrabold text-on-bright shadow-[var(--shadow-soft)] ring-4 ring-background"
      >
        <span className="flex flex-col items-center leading-none">
          <Recycle size={24} aria-hidden />
          <span className="mt-1 text-sm">{t("Sell")}</span>
        </span>
      </Link>
      {item("/market", t("Market"), MapPin)}
      {item("/money", t("My money"), Wallet)}
    </nav>
  );
}

/** Phone layout: a Soweto photo behind, top bar, content, floating bottom navigation. */
export function AppScreen({ children, place = "orlando" }: { children: ReactNode; place?: Place }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md overflow-x-hidden pb-32">
      <Backdrop place={place} />
      <TopBar />
      <OfflineBanner />
      <main className="space-y-5 px-4">{children}</main>
      <BottomNav />
    </div>
  );
}

export function PageTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <h1 className="text-4xl font-extrabold leading-none">{children}</h1>
      {aside}
    </div>
  );
}

/** Wide layout for the centre console (tablet) and the PRO dashboard (desktop). */
export function WideScreen({ title, children, place = "kliptown" }: { title: string; children: ReactNode; place?: Place }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl overflow-x-hidden px-4 pb-12 sm:px-8">
      <Backdrop place={place} />
      <header className="no-print grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-5">
        <Link href="/home" className="flex min-h-11 min-w-0 items-center gap-3">
          <Logo size={40} />
          <span className="hidden truncate text-lg font-bold text-muted-foreground sm:inline">· {title}</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AccountButton />
        </div>
      </header>
      <OfflineBanner />
      <main>{children}</main>
    </div>
  );
}

/** A simple header with a photo behind it, for screens without the bottom navigation (sign in, tour). */
export function AppHeader({ title, place = "orlando" }: { title: string; place?: Place }) {
  return (
    <>
      <Backdrop place={place} />
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pb-2 pt-4">
        <Logo size={40} />
        <ThemeToggle />
      </header>
      <h1 className="px-4 pb-4 pt-6 text-4xl font-extrabold leading-none">{title}</h1>
    </>
  );
}
