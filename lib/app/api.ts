// The app's data layer. Every call goes to Supabase, where row level security decides what each person
// may read or write. The last good result is kept on the phone, so screens still open with no signal.
import { createClient } from "@/lib/supabase/client";
import { CODE_BY_MATERIAL, MATERIAL_BY_CODE, type Material } from "./logic";
import { EWASTE_CATEGORIES, type Condition, type Confidence, type EwasteCategory, type PlaceKind } from "./ewaste";

const db = () => createClient();

export type Fetched<T> = { data: T; fromCache: boolean; savedAt: string | null };

function readCache<T>(key: string): { data: T; savedAt: string } | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { data: T; savedAt: string }) : null;
  } catch {
    return null;
  }
}
function writeCache<T>(key: string, data: T): string {
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(key, JSON.stringify({ data, savedAt }));
  } catch {
    // Storage full or blocked. The app still works, it just cannot open offline.
  }
  return savedAt;
}

/** Runs a read. On failure, returns the last saved copy, or the empty value if there is none. */
async function cached<T>(key: string, empty: T, run: () => Promise<T>): Promise<Fetched<T>> {
  try {
    const data = await run();
    return { data, fromCache: false, savedAt: writeCache(key, data) };
  } catch {
    const c = readCache<T>(key);
    return c ? { data: c.data, fromCache: true, savedAt: c.savedAt } : { data: empty, fromCache: true, savedAt: null };
  }
}

const first = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));

// ---------- Board prices (public) ----------
export type BoardPrice = { material: Material; centreId: string; centre: string; areaId: string; centsPerKg: number; at: string };
type PriceRow = { centre_id: string; centre_name: string; area_id: string; material: string; cents_per_kg: number; effective_at: string };

export function getBoardPrices(): Promise<Fetched<BoardPrice[]>> {
  return cached<BoardPrice[]>("ccza.prices.v2", [], async () => {
    const { data, error } = await db().rpc("board_prices");
    if (error) throw error;
    return ((data ?? []) as PriceRow[]).flatMap((r) => {
      const material = MATERIAL_BY_CODE[r.material];
      return material
        ? [{ material, centreId: r.centre_id, centre: r.centre_name, areaId: r.area_id, centsPerKg: r.cents_per_kg, at: r.effective_at }]
        : [];
    });
  });
}

export function bestPrice(prices: BoardPrice[], m: Material): BoardPrice | undefined {
  return prices.filter((p) => p.material === m).sort((a, b) => b.centsPerKg - a.centsPerKg)[0];
}

// ---------- My sales ----------
export type FeeStatus = "owed" | "paid" | "missing";
export type PayoutStatus = "queued" | "sent" | "failed" | "paid";
type PayoutRow = { status: PayoutStatus; reference: string; channel: string };
export type MySale = {
  id: string;
  material: Material;
  grams: number;
  centsPerKg: number;
  amountCents: number;
  centre: string;
  createdAt: string;
  fee: { cents: number; status: FeeStatus } | null;
  payout: { status: PayoutStatus; reference: string; demo: boolean } | null;
};
type SaleRow = {
  id: string;
  material: string;
  weight_g: number;
  cents_per_kg: number;
  amount_cents: number;
  created_at: string;
  centres: { name: string } | { name: string }[] | null;
  service_fees: { cents: number; status: FeeStatus } | { cents: number; status: FeeStatus }[] | null;
  payouts: PayoutRow | PayoutRow[] | null;
};

export function getMySales(userId: string): Promise<Fetched<MySale[]>> {
  return cached<MySale[]>(`ccza.sales.${userId}`, [], async () => {
    const { data, error } = await db()
      .from("transactions")
      .select("id, material, weight_g, cents_per_kg, amount_cents, created_at, centres(name), service_fees(cents, status), payouts(status, reference, channel)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return ((data ?? []) as unknown as SaleRow[]).flatMap((r) => {
      const material = MATERIAL_BY_CODE[r.material];
      if (!material) return [];
      const fee = first(r.service_fees);
      const payout = first(r.payouts);
      return [
        {
          id: r.id,
          material,
          grams: r.weight_g,
          centsPerKg: r.cents_per_kg,
          amountCents: r.amount_cents,
          centre: first(r.centres)?.name ?? "Buy-back centre",
          createdAt: r.created_at,
          fee: fee ? { cents: fee.cents, status: fee.status } : null,
          payout: payout ? { status: payout.status, reference: payout.reference, demo: payout.channel.endsWith("_mock") } : null,
        },
      ];
    });
  });
}

// ---------- Marketplace ----------
export type MapPoint = {
  id: string;
  kind: "buy" | "sell";
  source: "centre" | "post";
  name: string;
  material: Material;
  centsPerKg: number | null;
  kg: number | null;
  areaLabel: string;
  lat: number;
  lng: number;
  createdAt: string;
};
type PointRow = {
  id: string;
  kind: "buy" | "sell";
  source: "centre" | "post";
  name: string;
  material: string;
  cents_per_kg: number | null;
  kg: number | null;
  area_label: string;
  lat: number;
  lng: number;
  created_at: string;
};

export function getMarketPoints(): Promise<Fetched<MapPoint[]>> {
  return cached<MapPoint[]>("ccza.market.v1", [], async () => {
    const { data, error } = await db().rpc("market_points");
    if (error) throw error;
    return ((data ?? []) as PointRow[]).flatMap((r) => {
      const material = MATERIAL_BY_CODE[r.material];
      return material
        ? [{ id: r.id, kind: r.kind, source: r.source, name: r.name, material, centsPerKg: r.cents_per_kg, kg: r.kg, areaLabel: r.area_label, lat: Number(r.lat), lng: Number(r.lng), createdAt: r.created_at }]
        : [];
    });
  });
}

export type NewPost = {
  kind: "sell" | "buy";
  org: string;
  material: Material;
  kg: number | null;
  centsPerKg: number | null;
  areaLabel: string;
  lat: number;
  lng: number;
  note: string;
};

export async function createMarketPost(p: NewPost): Promise<string | null> {
  const { error } = await db().rpc("create_market_post", {
    p_kind: p.kind,
    p_org: p.org,
    p_material: CODE_BY_MATERIAL[p.material],
    p_kg: p.kg,
    p_cents_per_kg: p.centsPerKg,
    p_area_label: p.areaLabel,
    p_lat: p.lat,
    p_lng: p.lng,
    p_note: p.note || null,
  });
  if (!error) return null;
  const m = error.message;
  if (m.includes("TOO_MANY_POSTS")) return "You already have 20 open posts. Close one first.";
  if (m.includes("BAD_LOCATION")) return "That place is outside South Africa.";
  if (m.includes("ROLE_NOT_ALLOWED") || m.includes("NOT_SIGNED_IN")) return "Sign in with a reclaimer or business account to post.";
  return "The post did not save. Check the details and try again.";
}

export type MyPost = { id: string; kind: "buy" | "sell"; material: Material; kg: number | null; centsPerKg: number | null; areaLabel: string; status: "open" | "closed"; createdAt: string };

export async function getMyPosts(): Promise<MyPost[]> {
  const { data, error } = await db()
    .from("market_posts")
    .select("id, kind, material, kg, cents_per_kg, area_label, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; kind: "buy" | "sell"; material: string; kg: number | null; cents_per_kg: number | null; area_label: string; status: "open" | "closed"; created_at: string }[]).flatMap((r) => {
    const material = MATERIAL_BY_CODE[r.material];
    return material ? [{ id: r.id, kind: r.kind, material, kg: r.kg, centsPerKg: r.cents_per_kg, areaLabel: r.area_label, status: r.status, createdAt: r.created_at }] : [];
  });
}

export async function closeMyPost(id: string): Promise<boolean> {
  const { error } = await db().from("market_posts").update({ status: "closed" }).eq("id", id);
  return !error;
}

// ---------- Centre console (operators) ----------
export type MyCentre = { id: string; name: string };

export async function getMyCentres(userId: string): Promise<MyCentre[]> {
  const { data, error } = await db().from("centres").select("id, name").eq("operator_id", userId);
  if (error) throw error;
  return (data ?? []) as MyCentre[];
}

export async function setBoardPrice(centreId: string, material: Material, centsPerKg: number): Promise<boolean> {
  const { error } = await db().from("prices").insert({ centre_id: centreId, material: CODE_BY_MATERIAL[material], cents_per_kg: centsPerKg });
  return !error;
}

export type SawprsStatus = "unknown" | "pending" | "registered";
export type LookedUp = { name: string; area: string; sawprs: SawprsStatus; sawprsRef: string | null };

export async function lookupReclaimer(code: string): Promise<LookedUp | null> {
  const { data, error } = await db().rpc("lookup_reclaimer", { p_qr: code });
  if (error) throw error;
  const row = ((data ?? []) as { display_name: string; area_id: string; sawprs_status?: SawprsStatus; sawprs_ref?: string | null }[])[0];
  return row ? { name: row.display_name, area: row.area_id, sawprs: row.sawprs_status ?? "unknown", sawprsRef: row.sawprs_ref ?? null } : null;
}

/** Operators record whether a reclaimer is registered with SAWPRS. It is a record, not a live registry lookup. */
export async function setSawprsStatus(code: string, status: SawprsStatus, ref: string | null): Promise<string | null> {
  const { error } = await db().rpc("set_sawprs_status", { p_qr: code, p_status: status, p_ref: ref });
  if (!error) return null;
  if (error.message.includes("REF_REQUIRED")) return "Enter the SAWPRS reference number to mark someone as registered.";
  if (error.message.includes("ROLE_NOT_ALLOWED")) return "Only a centre account can change this.";
  return "The status did not save. Try again.";
}

export type SaleInput = { code: string; material: Material; grams: number; centsPerKg: number; centreId: string; key: string };
export type SaleResult =
  | { ok: true; amountCents: number; feeCents: number; flags: string[]; replayed: boolean; payout: { status: PayoutStatus; reference: string; demo: boolean } | null }
  | { ok: false; error: "not_configured" | "price" | "unknown_code" | "not_operator" | "signed_out" | "conflict" | "invalid" | "failed"; currentCentsPerKg?: number };

/** Records a weighed sale through the server route, which checks the operator, the centre and the board price. */
export async function recordSale(s: SaleInput): Promise<SaleResult> {
  const { data } = await db().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "signed_out" };
  let res: Response;
  try {
    res = await fetch("/api/v1/centre/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": s.key },
      body: JSON.stringify({
        centre_id: s.centreId,
        reclaimer_qr: s.code,
        material: CODE_BY_MATERIAL[s.material],
        weight_g: s.grams,
        cents_per_kg: s.centsPerKg,
      }),
    });
  } catch {
    return { ok: false, error: "failed" };
  }
  const body = (await res.json().catch(() => ({}))) as {
    receipt?: { amount_cents: number; service_fee_cents?: number; flags?: string[]; replayed: boolean; payout?: PayoutRow | null };
    error?: { code: string; details?: { cents_per_kg?: number } };
  };
  if (res.ok && body.receipt) {
    return { ok: true, amountCents: body.receipt.amount_cents, feeCents: body.receipt.service_fee_cents ?? 0, flags: body.receipt.flags ?? [], replayed: body.receipt.replayed, payout: body.receipt.payout ? { status: body.receipt.payout.status, reference: body.receipt.payout.reference, demo: body.receipt.payout.channel.endsWith("_mock") } : null };
  }
  const code = body.error?.code;
  if (res.status === 501) return { ok: false, error: "not_configured" };
  if (code === "PRICE_CHANGED") return { ok: false, error: "price", currentCentsPerKg: body.error?.details?.cents_per_kg };
  if (code === "UNKNOWN_CODE") return { ok: false, error: "unknown_code" };
  if (code === "NOT_OPERATOR") return { ok: false, error: "not_operator" };
  if (code === "UNAUTHENTICATED") return { ok: false, error: "signed_out" };
  if (code === "IDEMPOTENCY_CONFLICT") return { ok: false, error: "conflict" };
  if (res.status === 422) return { ok: false, error: "invalid" };
  return { ok: false, error: "failed" };
}

// ---------- PRO dashboard ----------
export type ProOverview = { registered: number; active: number; youth: number; tonnes30d: number; feesOwedCents: number; feesPaidCents: number; sawprsRegistered: number; payoutsSentCents: number };

export async function getProOverview(): Promise<ProOverview | null> {
  const { data, error } = await db().rpc("pro_overview");
  if (error) throw error;
  const r = ((data ?? []) as { registered: number; active_reclaimers: number; youth_reclaimers: number; tonnes_30d: number; fees_owed_cents: number; fees_paid_cents: number; sawprs_registered?: number; payouts_sent_cents?: number }[])[0];
  return r
    ? { registered: Number(r.registered), active: Number(r.active_reclaimers), youth: Number(r.youth_reclaimers), tonnes30d: Number(r.tonnes_30d), feesOwedCents: Number(r.fees_owed_cents), feesPaidCents: Number(r.fees_paid_cents), sawprsRegistered: Number(r.sawprs_registered ?? 0), payoutsSentCents: Number(r.payouts_sent_cents ?? 0) }
    : null;
}

export async function getProMaterials(): Promise<{ material: Material; kg: number; sales: number; valueCents: number }[]> {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 3600 * 1000);
  const { data, error } = await db().rpc("pro_material_summary", { from_date: from.toISOString().slice(0, 10), to_date: to.toISOString().slice(0, 10) });
  if (error) throw error;
  const totals = new Map<Material, { kg: number; sales: number; valueCents: number }>();
  for (const r of (data ?? []) as { material: string; kg: number; sales: number; value_cents: number }[]) {
    const m = MATERIAL_BY_CODE[r.material];
    if (!m) continue;
    const t = totals.get(m) ?? { kg: 0, sales: 0, valueCents: 0 };
    t.kg += Number(r.kg);
    t.sales += Number(r.sales);
    t.valueCents += Number(r.value_cents);
    totals.set(m, t);
  }
  return [...totals.entries()].map(([material, t]) => ({ material, ...t }));
}

export async function getOpenAnomalies(): Promise<{ id: string; reasons: string[]; createdAt: string }[]> {
  const { data, error } = await db().from("anomalies").select("id, reasons, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return ((data ?? []) as { id: string; reasons: string[]; created_at: string }[]).map((r) => ({ id: r.id, reasons: r.reasons, createdAt: r.created_at }));
}

// ---------- Electronics: places that take it, and the sell / give / want board ----------
export type EwastePlace = {
  id: string;
  name: string;
  kind: PlaceKind;
  accepts: EwasteCategory[];
  areaLabel: string;
  address: string | null;
  lat: number;
  lng: number;
  pin: "site" | "area";
  phone: string | null;
  website: string | null;
  hours: string | null;
  free: boolean;
  note: string | null;
  confidence: Confidence;
  sourceUrl: string;
  checkedOn: string;
};
type PlaceRow = {
  id: string;
  name: string;
  kind: PlaceKind;
  accepts: string[];
  area_label: string;
  address: string | null;
  lat: number;
  lng: number;
  pin: "site" | "area";
  phone: string | null;
  website: string | null;
  hours: string | null;
  free: boolean;
  note: string | null;
  confidence: Confidence;
  source_url: string;
  checked_on: string;
};

const isCategory = (c: string): c is EwasteCategory => (EWASTE_CATEGORIES as readonly string[]).includes(c);

export function getEwastePlaces(): Promise<Fetched<EwastePlace[]>> {
  return cached<EwastePlace[]>("ccza.ewaste.places.v1", [], async () => {
    const { data, error } = await db()
      .from("ewaste_points")
      .select("id, name, kind, accepts, area_label, address, lat, lng, pin, phone, website, hours, free, note, confidence, source_url, checked_on")
      .order("name");
    if (error) throw error;
    return ((data ?? []) as unknown as PlaceRow[]).map(placeFromRow);
  });
}

function placeFromRow(r: PlaceRow): EwastePlace {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    accepts: r.accepts.filter(isCategory),
    areaLabel: r.area_label,
    address: r.address,
    lat: Number(r.lat),
    lng: Number(r.lng),
    pin: r.pin,
    phone: r.phone,
    website: r.website,
    hours: r.hours,
    free: r.free,
    note: r.note,
    confidence: r.confidence,
    sourceUrl: r.source_url,
    checkedOn: r.checked_on,
  };
}

export type EwasteKind = "sell" | "give" | "want";
export type EwasteListing = {
  id: string;
  kind: EwasteKind;
  category: EwasteCategory;
  title: string;
  condition: Condition;
  priceCents: number | null;
  seller: string;
  areaLabel: string;
  lat: number;
  lng: number;
  note: string | null;
  createdAt: string;
};
type ListingRow = {
  id: string;
  kind: EwasteKind;
  category: string;
  title: string;
  condition: Condition;
  price_cents: number | null;
  seller: string;
  area_label: string;
  lat: number;
  lng: number;
  note: string | null;
  created_at: string;
};

export function getEwasteListings(): Promise<Fetched<EwasteListing[]>> {
  return cached<EwasteListing[]>("ccza.ewaste.listings.v1", [], async () => {
    const { data, error } = await db().rpc("ewaste_listings");
    if (error) throw error;
    return ((data ?? []) as ListingRow[]).flatMap((r) =>
      isCategory(r.category)
        ? [{ id: r.id, kind: r.kind, category: r.category, title: r.title, condition: r.condition, priceCents: r.price_cents, seller: r.seller, areaLabel: r.area_label, lat: Number(r.lat), lng: Number(r.lng), note: r.note, createdAt: r.created_at }]
        : [],
    );
  });
}

export type NewEwastePost = {
  kind: EwasteKind;
  category: EwasteCategory;
  title: string;
  condition: Condition;
  priceCents: number | null;
  seller: string;
  contact: string;
  areaLabel: string;
  lat: number;
  lng: number;
  note: string;
};

export async function createEwastePost(p: NewEwastePost): Promise<string | null> {
  const { error } = await db().rpc("create_ewaste_post", {
    p_kind: p.kind,
    p_category: p.category,
    p_title: p.title,
    p_condition: p.condition,
    p_price_cents: p.priceCents,
    p_seller: p.seller,
    p_contact: p.contact,
    p_area_label: p.areaLabel,
    p_lat: p.lat,
    p_lng: p.lng,
    p_note: p.note || null,
  });
  if (!error) return null;
  const m = error.message;
  if (m.includes("TOO_MANY_POSTS")) return "You already have 10 open listings. Close one first.";
  if (m.includes("BAD_LOCATION")) return "That place is outside South Africa.";
  if (m.includes("BAD_CONTACT")) return "Enter a phone number we can use, like 082 555 0101.";
  if (m.includes("GIVE_IS_FREE")) return "A giveaway has no price.";
  if (m.includes("ROLE_NOT_ALLOWED") || m.includes("NOT_SIGNED_IN")) return "Sign in with a reclaimer or business account to post.";
  return "The listing did not save. Check the details and try again.";
}

export type MyEwastePost = { id: string; kind: EwasteKind; title: string; status: "open" | "closed"; priceCents: number | null; createdAt: string };

export async function getMyEwastePosts(): Promise<MyEwastePost[]> {
  const { data, error } = await db()
    .from("ewaste_posts")
    .select("id, kind, title, status, price_cents, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; kind: EwasteKind; title: string; status: "open" | "closed"; price_cents: number | null; created_at: string }[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    status: r.status,
    priceCents: r.price_cents,
    createdAt: r.created_at,
  }));
}

export async function closeMyEwastePost(id: string): Promise<boolean> {
  const { error } = await db().from("ewaste_posts").update({ status: "closed" }).eq("id", id);
  return !error;
}

/** The poster's number. Only signed-in people get one. */
export async function getEwasteContact(id: string): Promise<string | null> {
  const { data, error } = await db().rpc("ewaste_contact", { p_id: id });
  if (error || typeof data !== "string") return null;
  return data;
}
