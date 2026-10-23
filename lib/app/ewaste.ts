// Electronics ("e-waste"): what to do with each kind of item, and the helpers the finder and the sell board use.
// Plain data and pure functions only, so the checks in tools/tests/ewaste.mjs can run them without a browser.

export const EWASTE_CATEGORIES = [
  "phone",
  "computer",
  "tv",
  "large_appliance",
  "small_appliance",
  "battery",
  "cables",
  "lighting",
  "printer",
  "other",
] as const;
export type EwasteCategory = (typeof EWASTE_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<EwasteCategory, string> = {
  phone: "Phone or tablet",
  computer: "Laptop or computer",
  tv: "TV or monitor",
  large_appliance: "Fridge, stove or washing machine",
  small_appliance: "Kettle, iron or microwave",
  battery: "Batteries",
  cables: "Cables and chargers",
  lighting: "Light bulbs and tubes",
  printer: "Printer",
  other: "Something else",
};

export type Condition = "works" | "repair" | "parts";
export const CONDITIONS: Condition[] = ["works", "repair", "parts"];
export const CONDITION_LABEL: Record<Condition, string> = {
  works: "It works",
  repair: "Broken, could be fixed",
  parts: "Dead, good for parts",
};

export type PlaceKind = "retail_bin" | "municipal" | "recycler" | "buyer";
export const PLACE_KIND_LABEL: Record<PlaceKind, string> = {
  retail_bin: "Shop bin",
  municipal: "Municipal site",
  recycler: "Recycler",
  buyer: "Buyer",
};
export type Confidence = "confirmed" | "listed" | "unsure";
export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  confirmed: "Confirmed",
  listed: "Listed online",
  unsure: "Check first",
};

export type StepAction = "sell" | "find" | "tradein" | "batteries";
export type Step = { title: string; body: string; action?: StepAction };
export type Advice = { headline: string; steps: Step[]; care: string[] };

const WIPE_PHONE = "Back up what you need. Sign out of your Google or Apple account and turn off Find My Device. Do a factory reset. Take out the SIM card and memory card.";
const WIPE_COMPUTER = "Back up your files. Sign out of your accounts. Reset the computer and choose to remove everything, or take out the hard drive and keep it.";
const FIRE = "A swollen or hot battery can catch fire. Do not charge it, do not squash it, and keep it away from other things.";

/** The order of options for one item: reuse first, then repair, then recycle. */
export function adviceFor(category: EwasteCategory, condition: Condition): Advice {
  const works = condition === "works";
  const repair = condition === "repair";
  const sell: Step = { title: "Sell it or give it away", body: "Something that still works is worth more used than as scrap. Post it on this board and people nearby can contact you.", action: "sell" };
  const forRepair: Step = { title: "Sell it to someone who repairs", body: "Repairers pay for broken phones, laptops and appliances. Say what is wrong in the post.", action: "sell" };
  const forParts: Step = { title: "Offer it for parts", body: "Even a dead device has a screen, a battery or a board that someone can use. Say it is for parts.", action: "sell" };
  const drop: Step = { title: "Take it to a drop-off point", body: "Free shop bins and recyclers keep the poisons out of the ground and send the metals back to be used again.", action: "find" };

  switch (category) {
    case "phone":
      return {
        headline: works ? "A phone that works can pay you back." : "Even a broken phone has value.",
        steps: works
          ? [sell, { title: "Trade it in", body: "Phone shops and networks take old phones towards a new one, usually as a discount or credit, not cash. The offer is checked in the shop.", action: "tradein" }, drop]
          : [repair ? forRepair : forParts, drop],
        care: [WIPE_PHONE, FIRE],
      };
    case "computer":
      return {
        headline: works ? "A working laptop is worth selling." : "A broken laptop still has parts that sell.",
        steps: works ? [sell, drop] : [repair ? forRepair : forParts, drop],
        care: [WIPE_COMPUTER, FIRE],
      };
    case "tv":
      return {
        headline: works ? "A working TV or monitor sells well second hand." : "A broken screen must not go in the bin.",
        steps: works ? [sell, drop] : [drop, forRepair],
        care: ["Never break open a screen. Old flat screens have a backlight with mercury, and old tube TVs hold lead.", "TVs are heavy and the glass cuts. Carry with two people."],
      };
    case "large_appliance":
      return {
        headline: works ? "A working fridge, stove or washing machine sells fast." : "A broken big appliance is mostly metal that someone will take.",
        steps: works
          ? [sell, drop]
          : [{ title: "Offer it as scrap or for repair", body: "Steel, copper and aluminium inside are worth money to scrap buyers. Post it so they can come to you.", action: "sell" }, drop],
        care: ["Do not cut or break the pipes on a fridge or freezer. The gas inside harms the air.", "Ask the shop you buy a new one from whether they will take the old one."],
      };
    case "small_appliance":
      return {
        headline: works ? "Kettles, irons and microwaves that work are easy to give away." : "Broken small appliances can go in a shop bin.",
        steps: works ? [sell, drop] : [repair ? forRepair : drop, drop].filter((s, i, a) => a.indexOf(s) === i),
        care: ["Unplug it and let it cool before you carry it."],
      };
    case "battery":
      return {
        headline: "Never put batteries in the bin.",
        steps: [
          { title: "Use a battery box at a shop", body: "Makro, Pick n Pay, Woolworths and Leroy Merlin stores have boxes near the entrance. Ask if you cannot see one.", action: "batteries" },
          drop,
        ],
        care: [
          "Tape over the ends of lithium and 9 volt batteries so they cannot touch metal.",
          FIRE,
          "Car batteries are different. Scrap yards usually buy them, so ask what they pay.",
        ],
      };
    case "cables":
      return {
        headline: "Old cables and chargers hold copper.",
        steps: [
          { title: "Sell the copper by weight", body: "Scrap dealers pay by the kilogram. Clean copper wire pays most. Ask for today's price before you carry anything.", action: "sell" },
          drop,
        ],
        care: ["Do not burn cable to strip it. The smoke is poisonous. Cut or pull the plastic off instead."],
      };
    case "lighting":
      return {
        headline: "Tube lights and energy savers hold a little mercury.",
        steps: [
          { title: "Take them to a recycler or shop bin", body: "Do not put them in the bin. If you carry them, keep them in their box so they do not break.", action: "find" },
        ],
        care: ["If one breaks, open a window and leave the room for a few minutes. Do not vacuum. Sweep it up with stiff paper and put it in a sealed jar.", "LED bulbs have no mercury and can go with other electronics."],
      };
    case "printer":
      return {
        headline: works ? "A working printer is easy to sell or give away." : "A broken printer goes to a recycler.",
        steps: works ? [sell, drop] : [repair ? forRepair : drop, drop].filter((s, i, a) => a.indexOf(s) === i),
        care: ["Take out the ink or toner first. Toner dust is bad to breathe, so do not shake it."],
      };
    default:
      return {
        headline: works ? "If it works, someone may want it." : "Ask before you throw it away.",
        steps: works ? [sell, drop] : [repair ? forRepair : forParts, drop],
        care: ["If it has a plug or a battery, it does not belong in the bin."],
      };
  }
}

// ---------- Options that are not a place on the map ----------

export type NationalOption = { id: string; title: string; body: string; url: string; source: string; checkedOn: string; for: EwasteCategory[] };

export const NATIONAL_OPTIONS: NationalOption[] = [
  {
    id: "ewasa-map",
    title: "eWASA recycling map",
    body: "The national producer body keeps a map of drop-off points, recyclers and collectors. Use it to find a place near you that is not on our map yet.",
    url: "https://ewasa.org/recycle_map/",
    source: "eWASA",
    checkedOn: "2026-10-23",
    for: ["phone", "computer", "tv", "large_appliance", "small_appliance", "battery", "cables", "lighting", "printer", "other"],
  },
  {
    id: "retail-batteries",
    title: "Battery boxes at Makro, Pick n Pay, Woolworths and Leroy Merlin",
    body: "Most branches have a box near the entrance. Branches change, so ask at the door.",
    url: "https://ewasa.org/?p=9082",
    source: "eWASA, portable batteries",
    checkedOn: "2026-10-23",
    for: ["battery"],
  },
  {
    id: "tradein-cellc",
    title: "Cell C trade-in",
    body: "Take a phone to a Cell C shop. The offer depends on the model, size and condition, and usually comes off your monthly bill.",
    url: "https://www.cellc.co.za/cellc/static-content/PDF/cellc-tradein-tradeup-faq.pdf",
    source: "Cell C",
    checkedOn: "2026-10-23",
    for: ["phone"],
  },
  {
    id: "tradein-istore",
    title: "iStore trade-in",
    body: "Gives an estimate for Apple and other phones. It is confirmed when the phone is checked in the shop. Turn off Find My iPhone first.",
    url: "https://www.istore.co.za/cellular-monthly-trade-in",
    source: "iStore",
    checkedOn: "2026-10-23",
    for: ["phone", "computer"],
  },
  {
    id: "tradein-cellucity",
    title: "Cellucity trade-in",
    body: "Has an online estimate for old phones. The final value is set when the phone is checked.",
    url: "https://cellucity.co.za/the-benefits-of-trading-in-your-old-device/",
    source: "Cellucity",
    checkedOn: "2026-10-23",
    for: ["phone"],
  },
  {
    id: "pikitup",
    title: "Pikitup garden sites (Johannesburg)",
    body: "The city's drop-off sites take recyclables, and some take small electronics and batteries. Phone before you go to ask what they take that week.",
    url: "https://ewasa.org/?p=9082",
    source: "eWASA, municipal drop-offs",
    checkedOn: "2026-10-23",
    for: ["battery", "small_appliance", "cables", "phone"],
  },
];

export function optionsFor(category: EwasteCategory | "all", action?: StepAction): NationalOption[] {
  return NATIONAL_OPTIONS.filter((o) => {
    if (action === "tradein") return o.id.startsWith("tradein");
    if (action === "batteries") return o.id === "retail-batteries" || o.id === "pikitup";
    return category === "all" || o.for.includes(category);
  });
}

// ---------- Places ----------

export type PlaceLike = { lat: number; lng: number };

/** Straight-line distance in kilometres. */
export function distanceKm(a: PlaceLike, b: PlaceLike): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatKm(km: number): string {
  if (km < 1) return "under 1 km";
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Sort by distance when the person's position is known, otherwise by name. */
export function sortPlaces<T extends PlaceLike & { name: string }>(places: T[], from: PlaceLike | null): (T & { km: number | null })[] {
  const withKm = places.map((p) => ({ ...p, km: from ? distanceKm(from, p) : null }));
  return withKm.sort((a, b) => (a.km !== null && b.km !== null ? a.km - b.km : a.name.localeCompare(b.name)));
}

/** How many days ago a date (YYYY-MM-DD) was, counted in whole days. */
export function daysSince(isoDate: string, now: Date = new Date()): number {
  const then = Date.parse(`${isoDate}T00:00:00Z`);
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}

// ---------- Contact ----------

/** South African number to international digits, or null if it does not look like one. */
export function internationalDigits(raw: string): string | null {
  const s = raw.replace(/[\s()-]/g, "");
  let digits: string;
  if (/^\+27\d{9}$/.test(s)) digits = s.slice(1);
  else if (/^27\d{9}$/.test(s)) digits = s;
  else if (/^0\d{9}$/.test(s)) digits = `27${s.slice(1)}`;
  else return null;
  return digits;
}

export const isValidContact = (raw: string) => /^\+?[0-9 ()-]{9,20}$/.test(raw.trim());

export function contactLinks(raw: string, message: string): { call: string; whatsapp: string | null } {
  const d = internationalDigits(raw);
  return {
    call: `tel:${d ? `+${d}` : raw.replace(/[^0-9+]/g, "")}`,
    whatsapp: d ? `https://wa.me/${d}?text=${encodeURIComponent(message)}` : null,
  };
}
