"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, LocateFixed, MapPin, Phone } from "lucide-react";
import { Card, EmptyState, Pill, SavedNote, Segmented } from "@/components/app/bits";
import { CATEGORY_ICON } from "@/components/app/ewaste-guide";
import { useT, usePrefs } from "@/lib/app/prefs";
import { getEwastePlaces, type EwastePlace, type Fetched } from "@/lib/app/api";
import { CATEGORY_LABEL, CONFIDENCE_LABEL, EWASTE_CATEGORIES, PLACE_KIND_LABEL, daysSince, formatKm, optionsFor, sortPlaces, type EwasteCategory } from "@/lib/app/ewaste";
import { TONE } from "@/lib/app/map-pins";
import { cn } from "@/lib/utils";

const MarketMap = dynamic(() => import("@/components/app/market-map"), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-3xl bg-secondary" />,
});

type View = "list" | "map";
// Until the person shares their location, the nearest places to the middle of Soweto come first.
const SOWETO = { lat: -26.25, lng: 27.9 };
const osmLink = (lat: number, lng: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

export default function EwastePlaces({ category, setCategory }: { category: EwasteCategory | "all"; setCategory: (c: EwasteCategory | "all") => void }) {
  const t = useT();
  const { dataSaver } = usePrefs();
  const [places, setPlaces] = useState<Fetched<EwastePlace[]> | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [view, setView] = useState<View>("list");
  const [mapOn, setMapOn] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    getEwastePlaces().then(setPlaces);
  }, []);

  const shown = useMemo(() => {
    const all = places?.data ?? [];
    return sortPlaces(category === "all" ? all : all.filter((p) => p.accepts.includes(category)), me ?? SOWETO);
  }, [places, category, me]);

  const pins = useMemo(() => shown.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, tone: TONE.ewaste, solid: p.pin === "site" })), [shown]);
  const onSelect = useCallback((id: string) => setSelectedId(id), []);
  const showMap = view === "map" && (!dataSaver || mapOn);

  const locate = () => {
    setLocError(null);
    if (!("geolocation" in navigator)) return setLocError(t("This phone cannot share its location."));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError(t("Location was not shared. The list is sorted by name."));
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => setCategory("all")} aria-pressed={category === "all"} className={cn("min-h-12 shrink-0 rounded-full px-4 font-bold", category === "all" ? "bg-foreground text-background" : "glass")}>
          {t("Anything")}
        </button>
        {EWASTE_CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICON[c];
          return (
            <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c} className={cn("flex min-h-12 shrink-0 items-center gap-2 rounded-full px-4 font-bold", category === c ? "bg-foreground text-background" : "glass")}>
              <Icon size={18} aria-hidden />
              {t(CATEGORY_LABEL[c])}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button onClick={locate} disabled={locating} className="glass flex min-h-12 items-center gap-2 rounded-full px-4 font-bold">
          <LocateFixed size={18} aria-hidden />
          {locating ? t("Finding you…") : me ? t("Sorted by distance") : t("Sort by distance")}
        </button>
        {places && <SavedNote fromCache={places.fromCache} savedAt={places.savedAt} />}
      </div>
      {locError && <p role="status" className="text-sm font-bold text-warning">{locError}</p>}

      <Segmented<View>
        label={t("View")}
        value={view}
        onChange={setView}
        options={[
          { value: "list", label: t("List") },
          { value: "map", label: t("Map") },
        ]}
      />

      {view === "map" && !showMap && (
        <button onClick={() => setMapOn(true)} className="glass grid min-h-40 w-full place-items-center rounded-3xl text-center font-bold">
          <span className="flex flex-col items-center gap-2"><MapPin aria-hidden />{t("Data saver is on. Tap to load the map.")}</span>
        </button>
      )}
      {showMap && <MarketMap points={pins} selectedId={selectedId} onSelect={onSelect} picking={false} onPick={() => {}} draft={null} label={t("Map of places that take electronics")} />}

      {places && shown.length === 0 && (
        <EmptyState title={t("Nothing on our map yet")} body={t("We have no listed place for this kind of item. The eWASA map below covers the whole country.")} />
      )}

      <ul className="space-y-3" aria-label={t("Places that take electronics")}>
        {shown.map((p) => {
          const age = daysSince(p.checkedOn);
          return (
            <li key={p.id}>
              <Card className={cn("space-y-3", selectedId === p.id && "ring-2 ring-primary")} id={`place-${p.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold leading-tight">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(PLACE_KIND_LABEL[p.kind])} · {p.areaLabel}
                      {me && p.km !== null ? ` · ${formatKm(p.km)}` : ""}
                    </p>
                  </div>
                  <Pill className={p.confidence === "unsure" ? "bg-warning text-black" : undefined}>{t(CONFIDENCE_LABEL[p.confidence])}</Pill>
                </div>

                <ul className="flex flex-wrap gap-1.5" aria-label={t("Takes")}>
                  {p.accepts.map((c) => {
                    const Icon = CATEGORY_ICON[c];
                    return (
                      <li key={c} className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", category === c ? "bg-highlight text-on-bright" : "bg-secondary")}>
                        <Icon size={13} aria-hidden />
                        {t(CATEGORY_LABEL[c])}
                      </li>
                    );
                  })}
                </ul>

                {p.note && <p className="text-sm">{t(p.note)}</p>}
                {p.address && <p className="text-sm text-muted-foreground">{p.address}</p>}
                {p.pin === "area" && <p className="text-xs text-muted-foreground">{t("The pin shows the area, not the door.")}</p>}

                <div className="flex flex-wrap gap-2">
                  {p.phone && (
                    <a href={`tel:${p.phone.replace(/[^0-9+]/g, "")}`} className="glass flex min-h-12 items-center gap-2 rounded-full px-4 font-bold">
                      <Phone size={18} aria-hidden />
                      {t("Call")}
                    </a>
                  )}
                  <a href={osmLink(p.lat, p.lng)} target="_blank" rel="noopener noreferrer" className="glass flex min-h-12 items-center gap-2 rounded-full px-4 font-bold">
                    <ExternalLink size={18} aria-hidden />
                    {t("Open in maps")}
                  </a>
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer" className="glass flex min-h-12 items-center gap-2 rounded-full px-4 font-bold">
                      <ExternalLink size={18} aria-hidden />
                      {t("Website")}
                    </a>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {t("Source")}:{" "}
                  <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{new URL(p.sourceUrl).hostname.replace(/^www\./, "")}</a>
                  {" · "}
                  {age === 0 ? t("checked today") : t("checked {n} days ago", { n: age })}
                  {" · "}
                  {t("Phone or ask in the shop before you travel.")}
                </p>
              </Card>
            </li>
          );
        })}
      </ul>

      <Card className="space-y-2">
        <h3 className="text-lg font-extrabold">{t("Not on our map?")}</h3>
        {optionsFor("all")
          .filter((o) => o.id === "ewasa-map")
          .map((o) => (
            <a key={o.id} href={o.url} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between gap-2 rounded-2xl bg-secondary px-4 py-3 font-bold">
              <span>
                {t(o.title)}
                <span className="block text-sm font-normal text-muted-foreground">{t(o.body)}</span>
              </span>
              <ExternalLink size={18} aria-hidden className="shrink-0" />
            </a>
          ))}
      </Card>
    </div>
  );
}
