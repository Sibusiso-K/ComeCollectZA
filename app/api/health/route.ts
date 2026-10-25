import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Keep-alive and uptime target for the scheduled ping in .github/workflows/keepalive.yml.
// It reads the public price board, so every ping is real database activity and the free Supabase project
// does not pause. It answers 503 when the database cannot be reached, which fails the ping and sends an alert.
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const time = new Date().toISOString();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ ok: false, database: "not configured", time }, { status: 503, headers: noStore });
  }

  const db = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await db.rpc("board_prices");
  if (error) {
    return NextResponse.json({ ok: false, database: "unreachable", time }, { status: 503, headers: noStore });
  }
  return NextResponse.json({ ok: true, database: "ok", time }, { headers: noStore });
}
