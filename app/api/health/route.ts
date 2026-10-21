import { NextResponse } from "next/server";

// Keep-alive target for the scheduled ping. The database check is added once the Supabase project exists.
export async function GET() {
  return NextResponse.json({ ok: true, time: new Date().toISOString() });
}
