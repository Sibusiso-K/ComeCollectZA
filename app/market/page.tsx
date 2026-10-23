"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink, LocateFixed, MapPin, Plus, Smartphone, Store } from "lucide-react";
import { AppScreen, PageTitle } from "@/components/app/shell";
import { Card, EmptyState, MaterialBadge, PillButton, SavedNote, Segmented, inputClass } from "@/components/app/bits";
import { useT, usePrefs } from "@/lib/app/prefs";
import { useAuth } from "@/lib/app/auth";
import { closeMyPost, createMarketPost, getMarketPoints, getMyPosts, type Fetched, type MapPoint, type MyPost } from "@/lib/app/api";
import { MATERIALS, MATERIAL_LABEL, formatPerKg, formatPerTonne, parseRandToCents, prettyArea, type Material } from "@/lib/app/logic";
import { PLACES, PLACE_ORDER } from "@/lib/app/photos";
import { TONE } from "@/lib/app/map-pins";
import { cn } from "@/lib/utils";

const MarketMap = dynamic(() => import("@/components/app/market-map"), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-3xl bg-secondary" />,
});

type Kind = "all" | "buy" | "sell";
type View = "map" | "list";

type Group = { id: string; source: "centre" | "post"; kind: "buy" | "sell"; name: string; areaLabel: string; lat: number; lng: number; rows: MapPoint[] };

/** One pin per centre, with all its prices behind it. A post is a pin of its own. */
function groupPoints(list: MapPoint[]): Group[] {
  const groups = new Map<string, Group>();
  for (const p of list) {
    const key = p.source === "centre" ? `c:${p.name}` : p.id;
    const g = groups.get(key);
    if (g) g.rows.push(p);
    else groups.set(key, { id: key, source: p.source, kind: p.kind, name: p.name, areaLabel: p.areaLabel, lat: p.lat, lng: p.lng, rows: [p] });
  }
  return [...groups.values()];
}

const osmLink = (lat: number, lng: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

export default function Market() {
  const t = useT();
  const { dataSaver } = usePrefs();
  const { user, profile } = useAuth();
  const [points, setPoints] = useState<Fetched<MapPoint[]> | null>(null);
  const [kind, setKind] = useState<Kind>("all");
  const [material, setMaterial] = useState<Material | "all">("all");
  const [area, setArea] = useState<string | null>(null);
  const [view, setView] = useState<View>("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapOn, setMapOn] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [mine, setMine] = useState<MyPost[]>([]);

  const reload = useCallback(() => {
    getMarketPoints().then(setPoints);
    if (user) getMyPosts().then(setMine).catch(() => setMine([]));
    else setMine([]);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    setArea(new URLSearchParams(window.location.search).get("area"));
  }, []);

  const areaKey = area ? area.split(" ")[0].toLowerCase() : null;
  const visible = useMemo(
    () =>
      (points?.data ?? []).filter(
        (p) =>
          (kind === "all" || p.kind === kind) &&
          (material === "all" || p.material === material) &&
          (!areaKey || `${p.areaLabel} ${p.name}`.toLowerCase().includes(areaKey)),
      ),
    [points, kind, material, areaKey],
  );
  const groups = useMemo(() => groupPoints(visible), [visible]);
  const pins = useMemo(() => groups.map((g) => ({ id: g.id, name: g.name, lat: g.lat, lng: g.lng, tone: g.kind === "buy" ? TONE.buy : TONE.sell, solid: g.source === "centre" })), [groups]);
  const listed = useMemo(() => [...groups].sort((x, y) => (x.kind === y.kind ? x.name.localeCompare(y.name) : x.kind === "buy" ? -1 : 1)), [groups]);
  const selected = groups.find((g) => g.id === selectedId) ?? null;
  const canPost = !!user && !!profile && ["reclaimer", "operator", "business"].includes(profile.role);
  const showMap = view === "map" && (!dataSaver || mapOn);

  const onSelect = useCallback((id: string) => setSelectedId(id), []);
  const onPick = useCallback((lat: number, lng: number) => {
    setDraft({ lat, lng });
    setPicking(false);
  }, []);

  return (
    <AppScreen place="meadowlands">
      <PageTitle aside={points && <SavedNote fromCache={points.fromCache} savedAt={points.savedAt} />}>{t("Market")}</PageTitle>
      <p className="text-sm text-muted-foreground">
        {t("Buy-back centres, buyers and businesses with material to sell. Green pins buy. Amber pins sell.")}
      </p>

      <Link href="/ewaste?tab=board" className="glass flex min-h-14 items-center gap-3 rounded-2xl px-4 font-bold">
        <Smartphone size={22} aria-hidden className="shrink-0 text-primary" />
        <span className="flex-1">{t("Selling a phone, laptop or fridge? Electronics have their own board.")}</span>
        <ChevronRight size={20} aria-hidden className="shrink-0" />
      </Link>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => setArea(null)} aria-pressed={!area} className={cn("min-h-12 shrink-0 rounded-full px-4 font-bold", !area ? "bg-foreground text-background" : "glass")}>
          {t("All Soweto")}
        </button>
        {PLACE_ORDER.map((p) => (
          <button
            key={p}
            onClick={() => setArea(PLACES[p].label)}
            aria-pressed={area === PLACES[p].label}
            className={cn("min-h-12 shrink-0 rounded-full px-4 font-bold", area === PLACES[p].label ? "bg-foreground text-background" : "glass")}
          >
            {PLACES[p].label}
          </button>
        ))}
      </div>

      <Segmented<Kind>
        label={t("Show")}
        value={kind}
        onChange={setKind}
        options={[
          { value: "all", label: t("All") },
          { value: "buy", label: t("Buyers") },
          { value: "sell", label: t("Sellers") },
        ]}
      />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => setMaterial("all")} aria-pressed={material === "all"} className={cn("min-h-12 shrink-0 rounded-full px-4 font-bold", material === "all" ? "bg-highlight text-on-bright" : "glass")}>
          {t("Any material")}
        </button>
        {MATERIALS.map((m) => (
          <button key={m} onClick={() => setMaterial(m)} aria-pressed={material === m} className={cn("flex min-h-12 shrink-0 items-center gap-2 rounded-full px-3 font-bold", material === m ? "bg-highlight text-on-bright" : "glass")}>
            <MaterialBadge m={m} size={28} />
            {t(MATERIAL_LABEL[m])}
          </button>
        ))}
      </div>

      <Segmented<View>
        label={t("View")}
        value={view}
        onChange={setView}
        options={[
          { value: "map", label: t("Map") },
          { value: "list", label: t("List") },
        ]}
      />

      {view === "map" && !showMap && (
        <button onClick={() => setMapOn(true)} className="glass grid min-h-40 w-full place-items-center rounded-3xl text-center font-bold">
          <span className="flex flex-col items-center gap-2"><MapPin aria-hidden />{t("Data saver is on. Tap to load the map.")}</span>
        </button>
      )}
      {showMap && (
        <div className="space-y-2">
          {picking && <p role="status" className="rounded-2xl bg-highlight px-4 py-2 font-bold text-on-bright">{t("Tap the map where your material is.")}</p>}
          <MarketMap points={pins} selectedId={selectedId} onSelect={onSelect} picking={picking} onPick={onPick} draft={draft} />
        </div>
      )}

      {selected && (
        <Card className="space-y-3" aria-live="polite">
          <div className="flex items-center gap-3">
            {selected.source === "centre" ? (
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-highlight text-on-bright"><Store size={22} aria-hidden /></span>
            ) : (
              <MaterialBadge m={selected.rows[0].material} />
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold">{selected.name}</p>
              <p className="text-sm text-muted-foreground">
                {selected.kind === "buy" ? t("Buying") : t("Selling")} · {prettyArea(selected.areaLabel)}
              </p>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {selected.rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-2 font-bold">
                  <MaterialBadge m={r.material} size={28} />
                  {t(MATERIAL_LABEL[r.material])}
                </span>
                <span className="text-right font-extrabold tabular-nums">
                  {r.centsPerKg ? formatPerKg(r.centsPerKg) : t("Price on request")}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {r.centsPerKg ? formatPerTonne(r.centsPerKg) : ""}
                    {r.kg ? ` · ${t("about {kg} kg", { kg: r.kg })}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {selected.source === "post" && <p className="text-xs text-muted-foreground">{t("The pin is placed within about 250 m of the real spot.")}</p>}
          <a href={osmLink(selected.lat, selected.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 font-bold text-primary underline underline-offset-4">
            <ExternalLink size={18} aria-hidden />
            {t("Open in maps")}
          </a>
        </Card>
      )}

      {view === "list" && (
        <ul className="space-y-2" aria-label={t("Buyers and sellers")}>
          {listed.map((g) => (
            <li key={g.id}>
              <button
                onClick={() => {
                  setSelectedId(g.id);
                  setView("map");
                  setMapOn(true);
                }}
                className="glass flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
              >
                {g.source === "centre" ? (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-highlight text-on-bright"><Store size={20} aria-hidden /></span>
                ) : (
                  <MaterialBadge m={g.rows[0].material} size={40} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{g.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {g.kind === "buy" ? t("Buying") : t("Selling")} · {prettyArea(g.areaLabel)}
                  </span>
                </span>
                <span className="shrink-0 text-right font-extrabold tabular-nums">
                  {g.source === "centre" ? t("{n} prices", { n: g.rows.length }) : g.rows[0].centsPerKg ? formatPerKg(g.rows[0].centsPerKg) : "—"}
                  {g.source === "post" && g.rows[0].kg ? <span className="block text-xs font-normal text-muted-foreground">{t("about {kg} kg", { kg: g.rows[0].kg })}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {points && visible.length === 0 && (
        <EmptyState title={t("Nothing here yet")} body={t("No buyers or sellers match. Try another area or material, or post the first one.")} />
      )}

      <section className="space-y-3" aria-labelledby="post">
        <h2 id="post" className="text-2xl font-extrabold">{t("Post to the market")}</h2>
        {!user ? (
          <EmptyState title={t("Sign in to post")} body={t("Reclaimers and businesses can post material for sale, or a price they will pay.")}>
            <Link href="/sign-in" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-lg font-extrabold text-primary-foreground">{t("Create account")}</Link>
          </EmptyState>
        ) : !canPost ? (
          <EmptyState title={t("This account cannot post")} body={t("Only reclaimer and business accounts post to the market.")} />
        ) : formOpen ? (
          <PostForm
            defaultName={profile?.displayName ?? ""}
            defaultArea={profile?.area ? prettyArea(profile.area) : area ?? ""}
            draft={draft}
            onChooseOnMap={() => { setView("map"); setMapOn(true); setPicking(true); }}
            onUseLocation={(lat, lng) => setDraft({ lat, lng })}
            onDone={() => { setFormOpen(false); setDraft(null); reload(); }}
            onCancel={() => { setFormOpen(false); setDraft(null); setPicking(false); }}
          />
        ) : (
          <PillButton onClick={() => setFormOpen(true)}>
            <Plus size={22} aria-hidden />
            {t("New post")}
          </PillButton>
        )}

        {mine.length > 0 && (
          <Card className="space-y-2">
            <h3 className="text-lg font-extrabold">{t("My posts")}</h3>
            <ul className="divide-y divide-border">
              {mine.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <MaterialBadge m={p.material} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {p.kind === "buy" ? t("Buying") : t("Selling")} {t(MATERIAL_LABEL[p.material])}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {p.centsPerKg ? formatPerKg(p.centsPerKg) : t("Price on request")} · {p.status === "open" ? t("Open") : t("Closed")}
                    </span>
                  </span>
                  {p.status === "open" && (
                    <button onClick={async () => { if (await closeMyPost(p.id)) reload(); }} className="glass min-h-12 rounded-full px-4 font-bold">
                      {t("Close")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </AppScreen>
  );
}

function PostForm({
  defaultName,
  defaultArea,
  draft,
  onChooseOnMap,
  onUseLocation,
  onDone,
  onCancel,
}: {
  defaultName: string;
  defaultArea: string;
  draft: { lat: number; lng: number } | null;
  onChooseOnMap: () => void;
  onUseLocation: (lat: number, lng: number) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [kind, setKind] = useState<"sell" | "buy">("sell");
  const [material, setMaterial] = useState<Material>("cans");
  const [kg, setKg] = useState("");
  const [price, setPrice] = useState("");
  const [org, setOrg] = useState(defaultName);
  const [areaLabel, setAreaLabel] = useState(defaultArea);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const kgN = kg.trim() === "" ? null : /^\d{1,6}$/.test(kg.trim()) ? Number(kg.trim()) : NaN;
  const cents = price.trim() === "" ? null : parseRandToCents(price);
  const priceBad = price.trim() !== "" && cents === null;
  const kgBad = kgN !== null && (Number.isNaN(kgN) || kgN < 1 || kgN > 500000);
  const needsPrice = kind === "buy" && cents === null;
  const needsKg = kind === "sell" && kgN === null;
  const ok = !!draft && org.trim().length > 0 && areaLabel.trim().length >= 2 && !priceBad && !kgBad && !needsPrice && !needsKg;

  const locate = () => {
    if (!("geolocation" in navigator)) return setError(t("This phone cannot share its location. Choose the place on the map."));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onUseLocation(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setError(t("Location was not shared. Choose the place on the map."));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok || !draft || busy) return;
    setBusy(true);
    setError(null);
    const err = await createMarketPost({
      kind,
      org: org.trim(),
      material,
      kg: kgN === null || Number.isNaN(kgN) ? null : kgN,
      centsPerKg: cents,
      areaLabel: areaLabel.trim(),
      lat: draft.lat,
      lng: draft.lng,
      note: note.trim(),
    });
    setBusy(false);
    if (err) setError(t(err));
    else onDone();
  };

  return (
    <form onSubmit={submit} className="glass space-y-4 rounded-3xl p-4">
      <Segmented<"sell" | "buy">
        label={t("I want to")}
        value={kind}
        onChange={setKind}
        options={[
          { value: "sell", label: t("Sell material") },
          { value: "buy", label: t("Buy material") },
        ]}
      />
      <div className="grid grid-cols-3 gap-2">
        {MATERIALS.map((m) => (
          <button key={m} type="button" onClick={() => setMaterial(m)} aria-pressed={material === m} className={cn("flex flex-col items-center gap-1 rounded-2xl p-2 text-sm font-bold", material === m ? "bg-highlight text-on-bright" : "bg-secondary")}>
            <MaterialBadge m={m} size={32} />
            {t(MATERIAL_LABEL[m])}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 font-bold">
          {kind === "sell" ? t("How many kg") : t("Up to how many kg")}
          <input inputMode="numeric" value={kg} onChange={(e) => setKg(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 font-bold">
          {kind === "buy" ? t("Price per kg, in Rand") : t("Asking price per kg (optional)")}
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="3.50" className={inputClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1 font-bold">
        {t("Name shown on the map")}
        <input value={org} onChange={(e) => setOrg(e.target.value)} maxLength={80} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 font-bold">
        {t("Area")}
        <input value={areaLabel} onChange={(e) => setAreaLabel(e.target.value)} maxLength={60} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 font-bold">
        {t("Note (optional)")}
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={inputClass} />
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-bold">{t("Where is it?")}</legend>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={locate} disabled={locating} className="glass flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 font-bold">
            <LocateFixed size={20} aria-hidden />
            {locating ? t("Finding you…") : t("Use my location")}
          </button>
          <button type="button" onClick={onChooseOnMap} className="glass flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 font-bold">
            <MapPin size={20} aria-hidden />
            {t("Choose on the map")}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {draft ? t("Place chosen. The pin will show about 250 m from it, to keep your exact spot private.") : t("Your exact spot is never shown. The pin is moved about 250 m.")}
        </p>
      </fieldset>

      {error && <p role="alert" className="font-bold text-warning">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <PillButton variant="ghost" onClick={onCancel}>{t("Cancel")}</PillButton>
        <PillButton type="submit" disabled={!ok || busy}>{busy ? t("Posting…") : t("Post")}</PillButton>
      </div>
    </form>
  );
}
