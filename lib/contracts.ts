import { z } from "zod";
import { MATERIAL_CODES } from "./materials";
import { RECLAIMER_CODE } from "./reclaimer-code";

export const MaterialCodeSchema = z.enum(MATERIAL_CODES);

// Body of POST /api/v1/centre/transactions. The Idempotency-Key header and the operator session are checked separately.
export const CentreTransactionRequest = z.strictObject({
  centre_id: z.uuid(),
  reclaimer_qr: z.string().max(39).regex(RECLAIMER_CODE, "reclaimer_qr is not a ComeCollectZA code"),
  material: MaterialCodeSchema,
  weight_g: z.number().int().min(1).max(500000),
  cents_per_kg: z.number().int().positive().max(100000),
  load_id: z.uuid().optional(),
});

export type CentreTransactionRequest = z.infer<typeof CentreTransactionRequest>;
