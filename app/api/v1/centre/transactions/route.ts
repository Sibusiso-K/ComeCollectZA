import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CentreTransactionRequest } from "@/lib/contracts";
import { IDEMPOTENCY_KEY } from "@/lib/reclaimer-code";

// Demo service fee rate: 25 cents per kilogram. Set per programme once the real rate is confirmed.
const SERVICE_FEE_CENTS_PER_KG = 25;
// A sale body is under 400 bytes. Anything far larger is refused before parsing.
const MAX_BODY_BYTES = 4096;

function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

// POST /api/v1/centre/transactions
// 1. Checks the Idempotency-Key header and the request body.
// 2. Checks the caller's session, and that they are signed in as an operator at this centre (the database checks it too).
// 3. Checks that the price the operator entered is the centre's current board price.
// 4. Records the sale with record_sale(), which runs in one database transaction.
export async function POST(req: Request) {
  const idempotencyKey = req.headers.get("idempotency-key");
  if (!idempotencyKey) {
    return fail(422, "VALIDATION_FAILED", "Idempotency-Key header is required");
  }
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return fail(422, "VALIDATION_FAILED", "Idempotency-Key must be 8 to 128 letters, digits, dashes or underscores");
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return fail(413, "BODY_TOO_LARGE", "Request body is too large");
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(422, "VALIDATION_FAILED", "Body must be valid JSON");
  }

  const parsed = CentreTransactionRequest.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(422, "VALIDATION_FAILED", issue?.message ?? "Invalid body", { field: issue?.path.join(".") });
  }
  const sale = parsed.data;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return fail(501, "NOT_CONFIGURED", "Sales storage is not configured on this server");
  }

  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) {
    return fail(401, "UNAUTHENTICATED", "Sign in as the centre operator");
  }

  // Everything below runs as the operator, so row level security applies to the reads.
  const operatorDb = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await operatorDb.auth.getUser(token);
  if (userError || !userData.user) {
    return fail(401, "UNAUTHENTICATED", "Your session has expired. Sign in again");
  }
  const operatorId = userData.user.id;

  const { data: centre } = await operatorDb
    .from("centres")
    .select("id, operator_id")
    .eq("id", sale.centre_id)
    .maybeSingle();
  if (!centre || centre.operator_id !== operatorId) {
    return fail(403, "NOT_OPERATOR", "You are not the operator of this centre");
  }

  const { data: priceRows, error: priceError } = await operatorDb
    .from("prices")
    .select("cents_per_kg")
    .eq("centre_id", sale.centre_id)
    .eq("material", sale.material)
    .order("effective_at", { ascending: false })
    .limit(1);
  if (priceError) {
    return fail(500, "PRICE_LOOKUP_FAILED", "Could not read the board price");
  }
  const current = priceRows?.[0]?.cents_per_kg;
  if (current === undefined) {
    return fail(422, "NO_PRICE", "This centre has no price for that material");
  }
  if (current !== sale.cents_per_kg) {
    return fail(409, "PRICE_CHANGED", "The board price has changed. Refresh and confirm the new price", {
      cents_per_kg: current,
    });
  }

  const service = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await service.rpc("record_sale", {
    p_idempotency_key: idempotencyKey,
    p_operator: operatorId,
    p_centre: sale.centre_id,
    p_reclaimer_qr: sale.reclaimer_qr,
    p_material: sale.material,
    p_weight_g: sale.weight_g,
    p_cents_per_kg: sale.cents_per_kg,
    p_load_id: sale.load_id ?? null,
    p_rate_cents_per_kg: SERVICE_FEE_CENTS_PER_KG,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("IDEMPOTENCY_CONFLICT")) {
      return fail(409, "IDEMPOTENCY_CONFLICT", "This Idempotency-Key was used for a different sale");
    }
    if (message.includes("UNKNOWN_CODE")) return fail(404, "UNKNOWN_CODE", "No reclaimer has that code");
    if (message.includes("UNKNOWN_LOAD")) return fail(404, "UNKNOWN_LOAD", "That load does not belong to this reclaimer");
    if (message.includes("NOT_OPERATOR")) return fail(403, "NOT_OPERATOR", "You are not the operator of this centre");
    return fail(500, "SALE_FAILED", "The sale could not be recorded. Try again with the same Idempotency-Key");
  }

  const receipt = data as {
    transaction_id: string;
    replayed: boolean;
    amount_cents: number;
    service_fee_cents?: number;
    flags?: string[];
  };
  return NextResponse.json({ receipt }, { status: receipt.replayed ? 200 : 201 });
}
