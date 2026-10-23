"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LocateFixed, MessageCircle, Phone, Plus, ShieldCheck } from "lucide-react";
import { Card, EmptyState, Pill, PillButton, SavedNote, Segmented, inputClass } from "@/components/app/bits";
import { CATEGORY_ICON } from "@/components/app/ewaste-guide";
import { useT } from "@/lib/app/prefs";
import { useAuth } from "@/lib/app/auth";
import {
  closeMyEwastePost,
  createEwastePost,
  getEwasteContact,
  getEwasteListings,
  getMyEwastePosts,
  type EwasteKind,
  type EwasteListing,
  type Fetched,
  type MyEwastePost,
} from "@/lib/app/api";
import { AREAS, areaFor } from "@/lib/app/areas";
import { CATEGORY_LABEL, CONDITIONS, CONDITION_LABEL, EWASTE_CATEGORIES, contactLinks, isValidContact, type Condition, type EwasteCategory } from "@/lib/app/ewaste";
import { formatRand, parseRandToCents } from "@/lib/app/logic";
import { cn } from "@/lib/utils";

type Filter = "all" | EwasteKind;
const KIND_LABEL: Record<EwasteKind, string> = { sell: "For sale", give: "Free", want: "Wanted" };

function priceText(l: { kind: EwasteKind; priceCents: number | null }, t: (s: string) => string): string {
  if (l.kind === "give") return t("Free");
  if (l.priceCents === null) return t("Make an offer");
  return formatRand(l.priceCents);
}

export default function EwasteBoard({ presetCategory, startOpen }: { presetCategory: EwasteCategory | null; startOpen: boolean }) {
  const t = useT();
  const { user, profile } = useAuth();
  const [listings, setListings] = useState<Fetched<EwasteListing[]> | null>(null);
  const [mine, setMine] = useState<MyEwastePost[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(startOpen);

  const reload = useCallback(() => {
    getEwasteListings().then(setListings);
    if (user) getMyEwastePosts().then(setMine).catch(() => setMine([]));
    else setMine([]);
  }, [user]);
  useEffect(() => {
    reload();
  }, [reload]);

  const canPost = !!user && !!profile && ["reclaimer", "operator", "business"].includes(profile.role);
  const shown = useMemo(() => (listings?.data ?? []).filter((l) => filter === "all" || l.kind === filter), [listings, filter]);

  return (
    <div className="space-y-4">
      <Card className="flex gap-3">
        <ShieldCheck size={26} aria-hidden className="mt-0.5 shrink-0 text-primary" />
        <div className="space-y-1 text-sm">
          <p className="font-extrabold">{t("Stay safe when you meet")}</p>
          <p>{t("Meet in a public place in daylight. See and test the item before you pay. Never share a PIN or a one-time code. Keep the number you used to post.")}</p>
        </div>
      </Card>

      <Segmented<Filter>
        label={t("Show")}
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: t("All") },
          { value: "sell", label: t("For sale") },
          { value: "give", label: t("Free") },
          { value: "want", label: t("Wanted") },
        ]}
      />
      {listings && <div className="flex justify-end"><SavedNote fromCache={listings.fromCache} savedAt={listings.savedAt} /></div>}

      {listings && shown.length === 0 && (
        <EmptyState title={t("Nothing listed yet")} body={t("Be the first. Post a phone, a laptop, a fridge or a box of cables and people nearby can contact you.")} />
      )}

      <ul className="space-y-3" aria-label={t("Electronics for sale, free or wanted")}>
        {shown.map((l) => (
          <ListingCard key={l.id} l={l} signedIn={!!user} />
        ))}
      </ul>

      <section className="space-y-3" aria-labelledby="post-ew">
        <h2 id="post-ew" className="text-2xl font-extrabold">{t("List an item")}</h2>
        {!user ? (
          <EmptyState title={t("Sign in to list")} body={t("Reclaimers and businesses can sell, give away or ask for old electronics.")}>
            <Link href="/sign-in" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-lg font-extrabold text-primary-foreground">{t("Create account")}</Link>
          </EmptyState>
        ) : !canPost ? (
          <EmptyState title={t("This account cannot list")} body={t("Only reclaimer and business accounts list items.")} />
        ) : formOpen ? (
          <ListForm
            presetCategory={presetCategory}
            defaultName={profile?.displayName ?? ""}
            defaultArea={profile?.area ?? ""}
            onDone={() => {
              setFormOpen(false);
              reload();
            }}
            onCancel={() => setFormOpen(false)}
          />
        ) : (
          <PillButton onClick={() => setFormOpen(true)}>
            <Plus size={22} aria-hidden />
            {t("New listing")}
          </PillButton>
        )}

        {mine.length > 0 && (
          <Card className="space-y-2">
            <h3 className="text-lg font-extrabold">{t("My listings")}</h3>
            <ul className="divide-y divide-border">
              {mine.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{p.title}</span>
                    <span className="block text-sm text-muted-foreground">
                      {t(KIND_LABEL[p.kind])} · {priceText(p, t)} · {p.status === "open" ? t("Open") : t("Closed")}
                    </span>
                  </span>
                  {p.status === "open" && (
                    <button onClick={async () => { if (await closeMyEwastePost(p.id)) reload(); }} className="glass min-h-12 rounded-full px-4 font-bold">
                      {t("Close")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

function ListingCard({ l, signedIn }: { l: EwasteListing; signedIn: boolean }) {
  const t = useT();
  const Icon = CATEGORY_ICON[l.category];
  const [contact, setContact] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);

  const reveal = async () => {
    setAsked(true);
    setContact(await getEwasteContact(l.id));
  };
  const links = contact ? contactLinks(contact, t("Hi, I saw your listing on ComeCollectZA: {title}", { title: l.title })) : null;

  return (
    <li>
      <Card className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary"><Icon size={22} aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold leading-tight">{l.title}</p>
            <p className="text-sm text-muted-foreground">
              {t(CATEGORY_LABEL[l.category])} · {t(CONDITION_LABEL[l.condition])}
            </p>
            <p className="text-sm text-muted-foreground">
              {l.seller} · {l.areaLabel}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-extrabold tabular-nums">{priceText(l, t)}</p>
            <Pill className={cn(l.kind === "give" && "bg-highlight text-on-bright")}>{t(KIND_LABEL[l.kind])}</Pill>
          </div>
        </div>
        {l.note && <p className="text-sm">{l.note}</p>}

        {!signedIn ? (
          <Link href="/sign-in" className="glass flex min-h-12 items-center justify-center rounded-full px-4 font-bold">{t("Sign in to contact")}</Link>
        ) : !asked ? (
          <PillButton onClick={reveal}>{t("Show contact")}</PillButton>
        ) : links ? (
          <div className="grid grid-cols-2 gap-2">
            <a href={links.call} className="glass flex min-h-12 items-center justify-center gap-2 rounded-full px-4 font-bold">
              <Phone size={18} aria-hidden />
              {t("Call")}
            </a>
            {links.whatsapp ? (
              <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground">
                <MessageCircle size={18} aria-hidden />
                WhatsApp
              </a>
            ) : (
              <p className="self-center text-sm font-bold">{contact}</p>
            )}
          </div>
        ) : (
          <p role="status" className="text-sm font-bold text-warning">{t("This listing was closed or the number is not available.")}</p>
        )}
      </Card>
    </li>
  );
}

function ListForm({
  presetCategory,
  defaultName,
  defaultArea,
  onDone,
  onCancel,
}: {
  presetCategory: EwasteCategory | null;
  defaultName: string;
  defaultArea: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const start = areaFor(defaultArea);
  const [kind, setKind] = useState<EwasteKind>("sell");
  const [category, setCategory] = useState<EwasteCategory>(presetCategory ?? "phone");
  const [condition, setCondition] = useState<Condition>("works");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [seller, setSeller] = useState(defaultName);
  const [contact, setContact] = useState("");
  const [areaLabel, setAreaLabel] = useState(start?.label ?? "");
  const [where, setWhere] = useState<{ lat: number; lng: number } | null>(start ? { lat: start.lat, lng: start.lng } : null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const cents = price.trim() === "" ? null : parseRandToCents(price);
  const priceBad = kind !== "give" && price.trim() !== "" && cents === null;
  const needsPrice = kind === "want" && cents === null;
  const ok = title.trim().length >= 2 && seller.trim().length > 0 && isValidContact(contact) && areaLabel.trim().length >= 2 && !!where && !priceBad && !needsPrice;

  const locate = () => {
    if (!("geolocation" in navigator)) return setError(t("This phone cannot share its location. Choose your area."));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWhere({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!areaLabel.trim()) setAreaLabel("Near me");
        setLocating(false);
      },
      () => {
        setError(t("Location was not shared. Choose your area."));
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok || !where || busy) return;
    setBusy(true);
    setError(null);
    const err = await createEwastePost({
      kind,
      category,
      title: title.trim(),
      condition,
      priceCents: kind === "give" ? null : cents,
      seller: seller.trim(),
      contact: contact.trim(),
      areaLabel: areaLabel.trim(),
      lat: where.lat,
      lng: where.lng,
      note: note.trim(),
    });
    setBusy(false);
    if (err) setError(t(err));
    else onDone();
  };

  return (
    <form onSubmit={submit} className="glass space-y-4 rounded-3xl p-4">
      <Segmented<EwasteKind>
        label={t("I want to")}
        value={kind}
        onChange={setKind}
        options={[
          { value: "sell", label: t("Sell") },
          { value: "give", label: t("Give") },
          { value: "want", label: t("Buy") },
        ]}
      />
      <label className="flex flex-col gap-1 font-bold">
        {t("What kind of item")}
        <select value={category} onChange={(e) => setCategory(e.target.value as EwasteCategory)} className={inputClass}>
          {EWASTE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(CATEGORY_LABEL[c])}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-bold">
        {kind === "want" ? t("What are you looking for") : t("What is it")}
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={t("Samsung A12, cracked screen")} className={inputClass} />
      </label>
      <fieldset className="space-y-2">
        <legend className="mb-1 font-bold">{t("What state is it in?")}</legend>
        <div className="grid gap-2">
          {CONDITIONS.map((c) => (
            <button key={c} type="button" onClick={() => setCondition(c)} aria-pressed={condition === c} className={cn("min-h-12 rounded-2xl px-4 text-left font-bold", condition === c ? "bg-highlight text-on-bright" : "bg-secondary")}>
              {t(CONDITION_LABEL[c])}
            </button>
          ))}
        </div>
      </fieldset>
      {kind !== "give" && (
        <label className="flex flex-col gap-1 font-bold">
          {kind === "want" ? t("The most you will pay, in Rand") : t("Asking price in Rand (leave empty to take offers)")}
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="150" className={inputClass} />
        </label>
      )}
      <label className="flex flex-col gap-1 font-bold">
        {t("Your name")}
        <input value={seller} onChange={(e) => setSeller(e.target.value)} maxLength={80} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 font-bold">
        {t("Phone or WhatsApp number")}
        <input inputMode="tel" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="082 555 0101" className={inputClass} />
        <span className="text-xs font-normal text-muted-foreground">{t("Only signed-in people can see it, and only after they tap Show contact.")}</span>
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-bold">{t("Where are you?")}</legend>
        <div className="-mx-1 flex flex-wrap gap-2 px-1">
          {AREAS.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                setAreaLabel(a.label);
                setWhere({ lat: a.lat, lng: a.lng });
              }}
              aria-pressed={areaLabel === a.label}
              className={cn("min-h-12 rounded-full px-4 font-bold", areaLabel === a.label ? "bg-highlight text-on-bright" : "bg-secondary")}
            >
              {a.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={locate} disabled={locating} className="glass flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-3 font-bold">
          <LocateFixed size={20} aria-hidden />
          {locating ? t("Finding you…") : t("Use my location instead")}
        </button>
        <p className="text-xs text-muted-foreground">{t("Other people see only the area name, never your exact spot.")}</p>
      </fieldset>

      <label className="flex flex-col gap-1 font-bold">
        {t("Note (optional)")}
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={inputClass} />
      </label>

      {error && <p role="alert" className="font-bold text-warning">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <PillButton variant="ghost" onClick={onCancel}>{t("Cancel")}</PillButton>
        <PillButton type="submit" disabled={!ok || busy}>{busy ? t("Posting…") : t("Post")}</PillButton>
      </div>
    </form>
  );
}
