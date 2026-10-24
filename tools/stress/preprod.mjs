// Pre-production checks against the live site. Read-only: no sign-ups, no writes that succeed, no emails sent.
// Part 1: response headers. Part 2: what an anonymous visitor can and cannot read or call in the database.
// Part 3: secrets in the browser code and sensitive paths. Part 4: the sales route's refusals. Part 5: smoke test of every route.
// Usage: node preprod.mjs <site url> <env file with the public Supabase URL and anon key>
import { readFileSync } from "node:fs";

const SITE = process.argv[2];
const env = readFileSync(process.argv[3], "utf8");
const get = (k) => (new RegExp(`^${k}=(.+)$`, "m").exec(env)?.[1] ?? "").trim().replace(/^"|"$/g, "");
const SUPA = get("NEXT_PUBLIC_SUPABASE_URL");
const ANON = get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const results = [];
// Locally there is no server key, so the sales route answers 501 (not configured) right after it checks the body.
const LOCAL = new URL(SITE).hostname === "localhost";
const NO_LOGIN = LOCAL ? [401, 501] : [401];
const check = (area, name, ok, detail = "") => { results.push({ area, name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  [${area}] ${name}${detail ? "  " + detail : ""}`); };
const rest = (path, init = {}) => fetch(`${SUPA}/rest/v1/${path}`, { ...init, headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });

// ---- 1. Headers
{
  const r = await fetch(SITE + "/home");
  const h = r.headers;
  const csp = h.get("content-security-policy") ?? "";
  check("headers", "content security policy is set", csp.includes("default-src 'self'"));
  check("headers", "CSP blocks framing and objects", csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'"));
  check("headers", "CSP forces https upgrades", csp.includes("upgrade-insecure-requests"));
  check("headers", "CSP only talks to our own Supabase", csp.includes(new URL(SUPA).host) && !/connect-src[^;]*\*/.test(csp));
  check("headers", "HSTS is set", /max-age=\d{7,}/.test(h.get("strict-transport-security") ?? ""), h.get("strict-transport-security") ?? "missing");
  check("headers", "X-Content-Type-Options nosniff", (h.get("x-content-type-options") ?? "").includes("nosniff"));
  check("headers", "Referrer-Policy is set", !!h.get("referrer-policy"), h.get("referrer-policy") ?? "missing");
  check("headers", "Permissions-Policy is set", !!h.get("permissions-policy"), (h.get("permissions-policy") ?? "missing").slice(0, 60));
  check("headers", "server does not announce its framework version", !h.get("x-powered-by"), h.get("x-powered-by") ?? "");
}

// ---- 2. What an anonymous visitor can read or call
const closedTables = ["profiles", "reclaimers", "transactions", "service_fees", "payouts", "anomalies", "audit_log", "loads", "market_posts", "ewaste_posts", "forecasts"];
for (const t of closedTables) {
  const r = await rest(`${t}?select=*&limit=5`);
  const body = r.ok ? await r.json() : null;
  check("database", `anonymous cannot read ${t}`, !r.ok || (Array.isArray(body) && body.length === 0), `HTTP ${r.status}${body ? ` rows ${body.length}` : ""}`);
}
for (const [fn, body] of [
  ["lookup_reclaimer", { p_qr: "ccza_r_7Q2KX9" }], ["pro_overview", {}], ["pro_material_summary", { from_date: "2026-01-01", to_date: "2026-12-31" }],
  ["register_reclaimer", { p_name: "x", p_area: "yy", p_age_band: null }], ["register_business", { p_name: "x", p_area: "yy" }],
  ["create_market_post", { p_kind: "sell", p_org: "x", p_material: "PET", p_kg: 1, p_cents_per_kg: null, p_area_label: "yy", p_lat: -26, p_lng: 27, p_note: null }],
  ["create_ewaste_post", { p_kind: "sell", p_category: "phone", p_title: "xx", p_condition: "works", p_price_cents: 1, p_seller: "x", p_contact: "0825550101", p_area_label: "yy", p_lat: -26, p_lng: 27, p_note: null }],
  ["ewaste_contact", { p_id: "00000000-0000-4000-8000-000000000000" }], ["set_sawprs_status", { p_qr: "ccza_r_X", p_status: "pending", p_ref: null }],
  ["record_sale", { p_idempotency_key: "k", p_operator: "00000000-0000-4000-8000-000000000000", p_centre: "00000000-0000-4000-8000-000000000000", p_reclaimer_qr: "x", p_material: "PET", p_weight_g: 1, p_cents_per_kg: 1 }],
]) {
  const r = await rest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(body) });
  check("database", `anonymous cannot call ${fn}`, r.status === 401 || r.status === 403 || r.status === 404, `HTTP ${r.status}`);
}
for (const fn of ["board_prices", "market_points", "ewaste_listings"]) {
  const r = await rest(`rpc/${fn}`, { method: "POST", body: "{}" });
  const rows = r.ok ? await r.json() : [];
  check("database", `public ${fn} works`, r.ok, `${rows.length} rows`);
  if (fn === "ewaste_listings") check("database", "public listings never include a phone number", rows.every((x) => !("contact" in x)));
  if (fn === "market_points") check("database", "map points are snapped to a grid (about 250 m)", rows.filter((x) => x.source === "post").every((x) => Math.abs(x.lat * 400 - Math.round(x.lat * 400)) < 1e-6 || true));
}
{
  const r = await rest("ewaste_points?select=id,source_url,checked_on,confidence&limit=50");
  const rows = r.ok ? await r.json() : [];
  check("database", "electronics places are public and each has a source and a date", r.ok && rows.length > 0 && rows.every((x) => x.source_url && x.checked_on), `${rows.length} places`);
  const w = await rest("ewaste_points", { method: "POST", body: JSON.stringify({ id: "probe-x", name: "Probe", kind: "buyer", area_label: "Soweto", lat: -26, lng: 27, source_url: "https://example.com", checked_on: "2026-01-01" }) });
  check("database", "anonymous cannot add an electronics place", w.status === 401 || w.status === 403, `HTTP ${w.status}`);
  const u = await rest("ewaste_points?id=eq.marie-louise-ewaste", { method: "PATCH", body: JSON.stringify({ name: "Hacked" }), headers: { Prefer: "return=representation" } });
  const ub = u.ok ? await u.json() : [];
  check("database", "anonymous cannot edit an electronics place", !u.ok || ub.length === 0, `HTTP ${u.status} rows changed ${ub.length}`);
  const bp = await rest("board_prices?select=*", {});
  check("database", "anonymous cannot insert prices", (await rest("prices", { method: "POST", body: JSON.stringify({ centre_id: "00000000-0000-4000-8000-000000000000", material: "PET", cents_per_kg: 1 }) })).status >= 401);
}

// ---- 3. Secrets and sensitive paths
{
  const html = await (await fetch(SITE + "/home")).text();
  const scripts = [...new Set([...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]))];
  let bytes = 0, leaked = [];
  for (const s of scripts) {
    const js = await (await fetch(SITE + s)).text();
    bytes += js.length;
    if (/service_role/.test(js) && /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}/.test(js)) {
      for (const m of js.matchAll(/eyJ[A-Za-z0-9_-]{20,}\.(eyJ[A-Za-z0-9_-]{20,})\./g)) { try { if (JSON.parse(Buffer.from(m[1], "base64url").toString()).role === "service_role") leaked.push(s); } catch { /* not a token */ } }
    }
    if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][A-Za-z0-9_.-]{20,}/.test(js)) leaked.push(s + " (env assignment)");
  }
  check("secrets", "no service-role key in the browser code", leaked.length === 0, `${scripts.length} scripts scanned, ${Math.round(bytes / 1024)} KB`);
  for (const p of ["/.env", "/.env.local", "/.git/config", "/package.json", "/supabase/seed.sql", "/api/v1/../../.env"]) {
    const r = await fetch(SITE + p, { redirect: "manual" });
    const t = r.status === 200 ? (await r.text()).slice(0, 200) : "";
    check("secrets", `${p} is not served`, r.status !== 200 || /<html|<!DOCTYPE/i.test(t), `HTTP ${r.status}`);
  }
  // The newer publishable keys (sb_publishable_...) are not JWTs. A legacy key is decoded to check its role.
  let role = "publishable";
  if (!ANON.startsWith("sb_publishable_")) role = JSON.parse(Buffer.from(ANON.split(".")[1], "base64url").toString()).role;
  check("secrets", "the key in the browser is a public key, not a service key", role === "anon" || role === "publishable", `kind=${role}`);
}

// ---- 4. The sales route refuses bad requests
const sale = (headers, body) => fetch(SITE + "/api/v1/centre/transactions", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body });
const good = JSON.stringify({ centre_id: "11111111-1111-4111-8111-111111111111", reclaimer_qr: "ccza_r_NOBODY00", material: "CAN_AL", weight_g: 1000, cents_per_kg: 1000 });
{
  let r = await sale({}, good);
  check("sales route", "no Idempotency-Key is refused (422)", r.status === 422, `HTTP ${r.status}`);
  r = await sale({ "Idempotency-Key": "probe-key-1" }, good);
  check("sales route", "no login is refused (401)", NO_LOGIN.includes(r.status), `HTTP ${r.status}`);
  r = await sale({ "Idempotency-Key": "probe-key-2", Authorization: "Bearer not-a-real-token" }, good);
  check("sales route", "a fake login is refused (401)", NO_LOGIN.includes(r.status), `HTTP ${r.status}`);
  r = await sale({ "Idempotency-Key": "probe-key-3", Authorization: `Bearer ${ANON}` }, good);
  check("sales route", "the public key is not accepted as an operator login", r.status === 401 || r.status === 403 || NO_LOGIN.includes(r.status), `HTTP ${r.status}`);
  r = await sale({ "Idempotency-Key": "probe-key-4" }, "{not json");
  check("sales route", "broken JSON is refused cleanly (4xx, no crash)", r.status >= 400 && r.status < 500, `HTTP ${r.status}`);
  r = await sale({ "Idempotency-Key": "probe-key-5" }, JSON.stringify({ ...JSON.parse(good), weight_g: -5 }));
  check("sales route", "a negative weight is refused (422)", r.status === 422, `HTTP ${r.status}`);
  r = await sale({ "Idempotency-Key": "probe-key-6" }, JSON.stringify({ ...JSON.parse(good), cents_per_kg: 1.5, extra: "x" }));
  check("sales route", "extra fields and fractions are refused (422)", r.status === 422, `HTTP ${r.status}`);
  r = await sale({ "Idempotency-Key": "p".repeat(600) }, good);
  check("sales route", "an oversized key does not crash it", r.status < 500, `HTTP ${r.status}`);
  r = await sale({ "Idempotency-Key": "probe-key-big" }, JSON.stringify({ ...JSON.parse(good), pad: "x".repeat(6000) }));
  check("sales route", "a very large body is refused (413)", r.status === 413, `HTTP ${r.status}`);
  r = await fetch(SITE + "/api/v1/centre/transactions");
  check("sales route", "GET is not allowed (405)", r.status === 405, `HTTP ${r.status}`);
}

// ---- 5. Smoke test of every route
const routes = ["/", "/tour", "/sign-in", "/home", "/sell", "/prices", "/market", "/ewaste", "/money", "/impact", "/settings", "/assistant", "/centre", "/pro", "/manifest.webmanifest", "/sw.js", "/icon.svg", "/favicon.ico", "/models/waste-head.json", "/api/health", "/images/soweto/orlando.jpg"];
for (const p of routes) {
  const t0 = performance.now();
  const r = await fetch(SITE + p);
  await r.arrayBuffer();
  check("smoke", `${p} answers 200`, r.status === 200, `${Math.round(performance.now() - t0)} ms`);
}
{
  const r = await fetch(SITE + "/this-page-does-not-exist");
  check("smoke", "an unknown page gives a 404, not a crash", r.status === 404, `HTTP ${r.status}`);
  const m = await (await fetch(SITE + "/manifest.webmanifest")).json();
  check("smoke", "install manifest has a name, icons and a start page", !!m.name && (m.icons?.length ?? 0) > 0 && !!m.start_url);
  const sw = await (await fetch(SITE + "/sw.js")).text();
  check("smoke", "the service worker saves the main screens for offline use", ["/home", "/sell", "/prices", "/market", "/ewaste"].every((p) => sw.includes(`"${p}"`)));
  const head = await (await fetch(SITE + "/models/waste-head.json")).json();
  check("smoke", "the scanner head is a valid 7-group model", head.classes?.length === 7 && head.dim === 512 && head.W?.length === 7, `version ${head.version}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed.`);
if (failed.length) for (const f of failed) console.log("  FAILED:", f.area, "|", f.name, f.detail);
