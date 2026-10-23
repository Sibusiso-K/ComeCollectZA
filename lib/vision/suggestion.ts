import type { MaterialCode } from "@/lib/materials";
import type { Prediction, WasteGroup } from "./waste-classifier";

// The classifier knows six broad groups. This maps a group to the materials the app prices.
// Plastic stays ambiguous (PET or HDPE), so the reclaimer always makes the final tap.
const CANDIDATES: Record<WasteGroup, MaterialCode[]> = {
  cardboard: ["CARDBOARD"],
  glass: ["GLASS"],
  metal: ["CAN_AL"],
  paper: ["PAPER_WHITE"],
  plastic: ["PET", "HDPE"],
  trash: [],
};

const GROUP_LABEL: Record<WasteGroup, string> = {
  cardboard: "Cardboard",
  glass: "Glass",
  metal: "Metal cans",
  paper: "Paper",
  plastic: "Plastic",
  trash: "Not a recyclable we buy",
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
