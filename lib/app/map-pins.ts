// Pin colours and the shape of a pin. Kept apart from the map component so pages can use them without loading Leaflet.
export const TONE = { buy: "#2e9e5b", sell: "#f5b544", ewaste: "#8b6df0", ewastePost: "#e8639a" } as const;

/** What the map needs to draw one pin. Names and notes never enter the map HTML. */
export type MapPin = { id: string; name: string; lat: number; lng: number; tone: string; solid: boolean };
