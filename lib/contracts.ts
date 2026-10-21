import { z } from "zod";
import { MATERIAL_CODES } from "./materials";

export const MaterialCodeSchema = z.enum(MATERIAL_CODES);

// Body of POST /api/v1/centre/transactions. The Idempotency-Key header is checked separately.
export const CentreTransactionRequest = z.object({
  reclaimer_qr: z.string().min(4).max(64),
  material: MaterialCodeSchema,
  weight_g: z.number().int().min(1).max(500000),
  cents_per_kg: z.number().int().positive(),
  load_id: z.uuid().optional(),
});

export type CentreTransactionRequest = z.infer<typeof CentreTransactionRequest>;
