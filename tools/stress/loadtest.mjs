// Ramped load test. Read-only. Each stage runs a fixed number of concurrent workers for a fixed time and reports
// requests per second, response time percentiles and errors. Never aim this at a site you do not run.
// Usage: node loadtest.mjs web <base url>           pages and the health route, at 10, 25, 50, 100 and a 200 spike
//        node loadtest.mjs db <env file>            the public read functions on Supabase, at 5, 10 and 20
import { readFileSync } from "node:fs";

const mode = process.argv[2];
const pct = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))] : 0;

async function stage(label, workers, seconds, makeRequest) {
  const times = [];
  const codes = {};
  let errors = 0;
  const end = Date.now() + seconds * 1000;
  async function worker(i) {
    let n = 0;
    while (Date.now() < end) {
      const t0 = performance.now();
      try {
        const r = await makeRequest(i, n++);
        await r.arrayBuffer();
        codes[r.status] = (codes[r.status] ?? 0) + 1;
        if (r.status >= 500 || r.status === 429) errors++;
      } catch { errors++; codes.fail = (codes.fail ?? 0) + 1; }
      times.push(performance.now() - t0);
    }
  }
  const t0 = performance.now();
  await Promise.all(Array.from({ length: workers }, (_, i) => worker(i)));
  const secs = (performance.now() - t0) / 1000;
  times.sort((a, b) => a - b);
  console.log(
    `${label.padEnd(26)} workers ${String(workers).padStart(3)}  ${String(times.length).padStart(6)} requests  ${(times.length / secs).toFixed(0).padStart(5)}/s  ` +
      `p50 ${pct(times, 50).toFixed(0).padStart(4)} ms  p95 ${pct(times, 95).toFixed(0).padStart(5)} ms  p99 ${pct(times, 99).toFixed(0).padStart(5)} ms  max ${times[times.length - 1]?.toFixed(0)} ms  ` +
      `errors ${errors}  codes ${JSON.stringify(codes)}`,
  );
  return { workers, requests: times.length, rps: times.length / secs, p95: pct(times, 95), errors };
}

if (mode === "web") {
  const base = process.argv[3];
  const pages = ["/home", "/prices", "/market", "/ewaste", "/sell", "/impact"];
  console.log(`Web: ${base}  (pages are server-rendered or static; the health route runs code)`);
  for (const w of [10, 25, 50, 100]) await stage("pages (mixed)", w, 15, (i, n) => fetch(base + pages[(i + n) % pages.length]));
  for (const w of [10, 50]) await stage("health route", w, 10, () => fetch(base + "/api/health"));
  await stage("scanner head (34 KB)", 50, 10, () => fetch(base + "/models/waste-head.json"));
  await stage("sales route, bad body", 50, 10, (i, n) => fetch(base + "/api/v1/centre/transactions", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": `load-key-${i}-${n}` }, body: JSON.stringify({ centre_id: "x" }) }));
  await stage("SPIKE: 200 at once", 200, 8, (i, n) => fetch(base + pages[(i + n) % pages.length]));
  await stage("recovery after spike", 10, 8, (i, n) => fetch(base + pages[(i + n) % pages.length]));
} else if (mode === "db") {
  const env = readFileSync(process.argv[3], "utf8");
  const get = (k) => (new RegExp(`^${k}=(.+)$`, "m").exec(env)?.[1] ?? "").trim().replace(/^"|"$/g, "");
  const SUPA = get("NEXT_PUBLIC_SUPABASE_URL"), ANON = get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const rpc = (fn) => fetch(`${SUPA}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: "{}" });
  console.log("Database public reads (live Supabase project, free tier). Gentle on purpose.");
  for (const w of [5, 10, 20]) await stage("board_prices + map + list", w, 10, (i, n) => rpc(["board_prices", "market_points", "ewaste_listings"][(i + n) % 3]));
  await stage("electronics places", 10, 8, () => fetch(`${SUPA}/rest/v1/ewaste_points?select=*`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }));
}
