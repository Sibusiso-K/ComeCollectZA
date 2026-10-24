"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/app/prefs";

// One title per screen, so the browser tab, history and screen readers say where you are.
const TITLES: Record<string, string> = {
  "/": "Fair pay for every kilogram",
  "/tour": "Welcome tour",
  "/sign-in": "Sign in or create an account",
  "/home": "Scan your load",
  "/sell": "Sell",
  "/prices": "Prices",
  "/market": "Market",
  "/ewaste": "Electronics",
  "/money": "My money",
  "/impact": "Impact",
  "/settings": "Settings",
  "/assistant": "Assistant",
  "/centre": "Centre",
  "/pro": "Programme dashboard",
};

export function TitleSync() {
  const path = usePathname();
  const t = useT();
  useEffect(() => {
    const name = TITLES[path] ?? TITLES[`/${path.split("/")[1]}`];
    const want = name ? `${t(name)} | ComeCollectZA` : "ComeCollectZA";
    // Next puts its own title back after a render, so keep ours until the screen changes.
    const apply = () => { if (document.title !== want) document.title = want; };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, [path, t]);
  return null;
}
