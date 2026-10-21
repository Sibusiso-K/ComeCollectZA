import { NextResponse } from "next/server";
import { CentreTransactionRequest } from "@/lib/contracts";

// POST /api/v1/centre/transactions
// The request is validated here. Storing the sale and requesting the payout come next,
// so the route answers 501 until the database and payout adapter are connected.
export async function POST(req: Request) {
  if (!req.headers.get("idempotency-key")) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Idempotency-Key header is required" } },
      { status: 422 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Body must be valid JSON" } },
      { status: 422 },
    );
  }

  const parsed = CentreTransactionRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: parsed.error.issues[0]?.message ?? "Invalid body",
          details: parsed.error.issues,
        },
      },
      { status: 422 },
    );
  }

  return NextResponse.json(
    { error: { code: "NOT_IMPLEMENTED", message: "Sales are not connected to the database yet" } },
    { status: 501 },
  );
}
