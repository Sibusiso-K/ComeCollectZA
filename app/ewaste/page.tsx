"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppScreen, PageTitle } from "@/components/app/shell";
import { Segmented } from "@/components/app/bits";
import EwasteGuide from "@/components/app/ewaste-guide";
import EwastePlaces from "@/components/app/ewaste-places";
import EwasteBoard from "@/components/app/ewaste-board";
import { useT } from "@/lib/app/prefs";
import { EWASTE_CATEGORIES, type EwasteCategory } from "@/lib/app/ewaste";

type Tab = "guide" | "places" | "board";
const asCategory = (v: string | null): EwasteCategory | null => (v && (EWASTE_CATEGORIES as readonly string[]).includes(v) ? (v as EwasteCategory) : null);
const asTab = (v: string | null): Tab => (v === "places" || v === "board" ? v : "guide");

function Screen() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(asTab(params.get("tab")));
  const [category, setCategory] = useState<EwasteCategory | null>(asCategory(params.get("c")));
  const [openForm, setOpenForm] = useState(false);

  // Keep the tab and item in the address, so a link or a reload comes back to the same place.
  useEffect(() => {
    const q = new URLSearchParams();
    if (tab !== "guide") q.set("tab", tab);
    if (category) q.set("c", category);
    const next = q.toString() ? `/ewaste?${q}` : "/ewaste";
    router.replace(next, { scroll: false });
  }, [tab, category, router]);

  const onAction = useCallback((action: "sell" | "find" | "tradein" | "batteries", c: EwasteCategory) => {
    setCategory(c);
    if (action === "sell") {
      setOpenForm(true);
      setTab("board");
    } else if (action === "find") setTab("places");
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <AppScreen place="bara">
      <PageTitle>{t("Electronics")}</PageTitle>
      <p className="text-sm text-muted-foreground">
        {t("Old phones, laptops, TVs, fridges and batteries. Find out what to do with them, where to take them, or sell or give them to someone nearby.")}
      </p>
      <Segmented<Tab>
        label={t("Electronics")}
        value={tab}
        onChange={setTab}
        options={[
          { value: "guide", label: t("What to do") },
          { value: "places", label: t("Drop-off") },
          { value: "board", label: t("Sell or give") },
        ]}
      />
      {tab === "guide" && <EwasteGuide category={category} setCategory={setCategory} onAction={onAction} />}
      {tab === "places" && <EwastePlaces category={category ?? "all"} setCategory={(c) => setCategory(c === "all" ? null : c)} />}
      {tab === "board" && <EwasteBoard presetCategory={category} startOpen={openForm} />}
    </AppScreen>
  );
}

export default function Ewaste() {
  return (
    <Suspense>
      <Screen />
    </Suspense>
  );
}
