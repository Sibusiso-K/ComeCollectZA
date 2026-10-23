import type { MaterialCode } from "@/lib/materials";
import type { LoadPrediction, Prediction, WasteGroup } from "./waste-classifier";

// The classifier knows six broad groups. This maps a group to the materials the app prices.
// Plastic stays ambiguous (PET or HDPE), so the reclaimer always makes the final tap.
const CANDIDATES: Record<WasteGroup, MaterialCode[]> = {
  cardboard: ["CARDBOARD"],
  glass: ["GLASS"],
  metal: ["CAN_AL"],
  paper: ["PAPER_WHITE"],
  plastic: ["PET", "HDPE"],
  trash: [],
  electronics: [],
};

const GROUP_LABEL: Record<WasteGroup, string> = {
  cardboard: "Cardboard",
  glass: "Glass",
  metal: "Metal cans",
  paper: "Paper",
  plastic: "Plastic",
  trash: "Not a recyclable we buy",
  electronics: "Electronics",
};

export type Suggestion = {
  label: string;
  candidates: MaterialCode[];
  confidence: number;
  // sure: show the suggestion first. maybe: show it as a question. unsure: ask the reclaimer to choose.
  level: "sure" | "maybe" | "unsure";
};

// At 70% confidence the head was right 91% of the time on held-out photos. Below 50% it is a guess.
export const SURE_AT = 0.7;
export const MAYBE_AT = 0.5;

export function suggestFrom(prediction: Prediction): Suggestion {
  const level = prediction.confidence >= SURE_AT ? "sure" : prediction.confidence >= MAYBE_AT ? "maybe" : "unsure";
  return {
    label: GROUP_LABEL[prediction.group],
    candidates: CANDIDATES[prediction.group],
    confidence: prediction.confidence,
    level,
  };
}

// Mixed loads. A quarter counts when it is at least MIX_FIRST sure. A second material must be at least MIX_SECOND
// sure, which keeps false alarms down. On 2x2 mosaics of held-out TrashNet photos (tools/vision/mixed-test.mjs),
// single-material loads were called mixed 8% of the time, and both materials were found in 64% of mixed loads.
export const MIX_FIRST = 0.7;
export const MIX_SECOND = 0.85;

export type MixPart = { label: string; candidates: MaterialCode[]; quarters: number };
export type Mix = { parts: MixPart[] };

export function mixFrom(load: LoadPrediction): Mix | null {
  const strong = load.quarters
    .filter((q) => q.group !== "trash" && q.confidence >= MIX_FIRST)
    .sort((a, b) => b.confidence - a.confidence);
  const groups: WasteGroup[] = [];
  for (const q of strong) {
    if (!groups.includes(q.group) && (groups.length === 0 || q.confidence >= MIX_SECOND)) groups.push(q.group);
  }
  if (groups.length < 2) return null;
  const parts = groups
    .map((group) => ({
      label: GROUP_LABEL[group],
      candidates: CANDIDATES[group],
      quarters: load.quarters.filter((q) => q.group === group).length,
    }))
    .sort((a, b) => b.quarters - a.quarters);
  return { parts };
}

// When the whole picture is unsure but at least three quarters agree strongly, trust the quarters.
// This helps with close-ups and piles that fill the frame, where the whole picture looks unlike any training photo.
export function bestGuess(load: LoadPrediction): Prediction {
  if (load.whole.confidence >= SURE_AT) return load.whole;
  const strong = load.quarters.filter((q) => q.group !== "trash" && q.confidence >= MIX_FIRST);
  for (const q of strong) {
    const agree = strong.filter((other) => other.group === q.group);
    if (agree.length >= 3) {
      const confidence = agree.reduce((sum, a) => sum + a.confidence, 0) / agree.length;
      return { ...q, confidence, ms: load.ms };
    }
  }
  return load.whole;
}
