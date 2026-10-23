// Soweto and nearby areas with a point near the middle of each, for people who would rather pick an area than share
// their location. Coordinates come from OpenStreetMap place names. A listing's pin is moved about 250 m on top of this.
export type Area = { label: string; lat: number; lng: number };

export const AREAS: Area[] = [
  { label: "Orlando West", lat: -26.2206, lng: 27.9147 },
  { label: "Orlando East", lat: -26.2379, lng: 27.9279 },
  { label: "Meadowlands", lat: -26.2208, lng: 27.8994 },
  { label: "Dobsonville", lat: -26.2239, lng: 27.8667 },
  { label: "Dube", lat: -26.2386, lng: 27.8928 },
  { label: "Mofolo", lat: -26.2394, lng: 27.8833 },
  { label: "Diepkloof", lat: -26.2419, lng: 27.9503 },
  { label: "Jabulani", lat: -26.2422, lng: 27.8569 },
  { label: "Zola", lat: -26.2422, lng: 27.8364 },
  { label: "Naledi", lat: -26.2481, lng: 27.8236 },
  { label: "Pimville", lat: -26.2711, lng: 27.9059 },
  { label: "Kliptown", lat: -26.2729, lng: 27.8877 },
  { label: "Chiawelo", lat: -26.2734, lng: 27.8612 },
  { label: "Protea Glen", lat: -26.2722, lng: 27.8169 },
  { label: "Eldorado Park", lat: -26.2956, lng: 27.8971 },
  { label: "Alexandra", lat: -26.1044, lng: 28.0989 },
];

/** The area whose name matches the start of what the person typed at sign-up, if any. */
export function areaFor(text: string | null | undefined): Area | null {
  const t = (text ?? "").trim().toLowerCase();
  if (!t) return null;
  return AREAS.find((a) => t.startsWith(a.label.toLowerCase())) ?? AREAS.find((a) => a.label.toLowerCase().startsWith(t.split(/[\s,]/)[0])) ?? null;
}
