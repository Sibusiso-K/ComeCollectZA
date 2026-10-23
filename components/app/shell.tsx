"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Moon, Recycle, Sun, Tag, WifiOff, Wallet } from "lucide-react";
import { usePrefs, useT } from "@/lib/app/prefs";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { isDark, setTheme } = usePrefs();
  const t = useT();
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t("Switch to light mode") : t("Switch to dark mode")}
      className="grid size-12 shrink-0 place-items-center rounded-full bg-card text-foreground shadow-[var(--shadow-soft)]"
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
      <WifiOff size={20} className="shrink-0" /> {t("You are offline. Showing the last prices.")}
    </div>
  );
}

function TopBar() {
  const { firstName } = usePrefs();
  const t = useT();
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pb-3 pt-4">
      <Link href="/home" className="flex min-w-0 items-center gap-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-highlight text-on-bright">
          <Recycle size={22} />
        </span>
        <span className="truncate font-display text-xl font-extrabold">ComeCollectZA</span>
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link
          href="/settings"
          aria-label={t("Settings")}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground font-display text-lg font-bold text-background"
        >
          {firstName[0]}
        </Link>
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
      className={cn(
        "flex min-h-14 min-w-14 flex-col items-center justify-center rounded-full text-xs font-bold",
        path === to ? "text-nav-active" : "text-nav-foreground",
      )}
    >
      <Icon size={22} aria-hidden />
      <span className="mt-0.5">{label}</span>
    </Link>
  );
  return (
    <nav
      aria-label={t("Main")}
      className="no-print fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-sm items-center justify-between rounded-full bg-nav px-3 py-2 shadow-[var(--shadow-soft)]"
    >
      {item("/home", t("Home"), Home)}
      {item("/prices", t("Prices"), Tag)}
      <Link
        href="/sell"
        aria-label={t("Sell")}
        className="-my-5 grid size-18 place-items-center rounded-full bg-highlight font-display font-extrabold text-on-bright shadow-[var(--shadow-soft)] ring-4 ring-background"
      >
        <span className="flex flex-col items-center leading-none">
          <Recycle size={24} aria-hidden />
          <span className="mt-1 text-sm">{t("Sell")}</span>
        </span>
      </Link>
      {item("/money", t("My money"), Wallet)}
      <span className="w-2" aria-hidden />
    </nav>
  );
}

/** Phone layout: top bar, content, floating bottom navigation. */
export function AppScreen({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md overflow-x-hidden pb-32">
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
      <h1 className="font-display text-4xl font-extrabold leading-none">{children}</h1>
      {aside}
    </div>
  );
}

/** Wide layout for the centre console (tablet) and the PRO dashboard (desktop). */
export function WideScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl overflow-x-hidden px-4 pb-12 sm:px-8">
      <header className="no-print grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-5">
        <Link href="/settings" className="flex min-w-0 items-center gap-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-highlight text-on-bright">
            <Recycle size={22} />
          </span>
          <span className="truncate font-display text-xl font-extrabold">ComeCollectZA · {title}</span>
        </Link>
        <ThemeToggle />
      </header>
      <OfflineBanner />
      <main>{children}</main>
    </div>
  );
}
