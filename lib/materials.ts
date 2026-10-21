export const MATERIAL_CODES = [
  "PET",
  "HDPE",
  "CAN_AL",
  "CARDBOARD",
  "PAPER_WHITE",
  "GLASS",
  "OTHER",
] as const;

export type MaterialCode = (typeof MATERIAL_CODES)[number];

// token is the CSS variable name (without the leading --) used to colour the material everywhere.
export const MATERIALS: Record<Exclude<MaterialCode, "OTHER">, { label: string; token: string }> = {
  PET: { label: "PET bottles", token: "pet" },
  HDPE: { label: "HDPE", token: "hdpe" },
  CAN_AL: { label: "Cans", token: "can" },
  CARDBOARD: { label: "Cardboard", token: "card" },
  PAPER_WHITE: { label: "Paper", token: "paper" },
  GLASS: { label: "Glass", token: "glass" },
};
