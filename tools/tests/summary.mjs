// Checks the money, fee and impact maths in lib/app against hand-worked cases, including South African
// day and month boundaries. Run with: npm run test:app
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("../../", import.meta.url));
const ts = createRequire(join(root, "package.json"))("typescript");
const out = mkdtempSync(join(tmpdir(), "ccza-summary-"));
mkdirSync(out, { recursive: true });

// Turn the TypeScript modules into plain JavaScript in a temp folder. They have no other dependencies.
const compile = (file, fix) => {
  let src = readFileSync(join(root, "lib", "app", `${file}.ts`), "utf8");
  src = fix(src);
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  writeFileSync(join(out, `${file}.mjs`), js);
};
compile("logic", (s) => s);
compile("ewaste", (s) => s);
compile("areas", (s) => s);
compile("summary", (s) => s.replace(/import type \{ MySale \} from "\.\/api";/, "").replace(/from "\.\/logic"/g, 'from "./logic.mjs"'));
const { monthTotals, feeTotals, feeRecoveryPercent, impactSeries } = await import(pathToFileURL(join(out, "summary.mjs")).href);
const logic = await import(pathToFileURL(join(out, "logic.mjs")).href);

const mk = (id, iso, material, grams, cpk, fee) => ({
  id, createdAt: iso, material, grams, centsPerKg: cpk, amountCents: Math.floor((grams * cpk) / 1000), centre: "C", fee,
});
const now = new Date("2026-10-23T12:00:00Z"); // 14:00 in South Africa, a Friday
const sales = [
  mk("today", "2026-10-23T06:00:00Z", "cans", 6400, 1000, { cents: 96, status: "owed" }),
  mk("after-midnight", "2026-10-22T22:30:00Z", "pet", 10000, 400, { cents: 150, status: "paid" }), // 00:30 on 23 Oct in SA
  mk("six-days-ago", "2026-10-17T10:00:00Z", "glass", 50000, 40, { cents: 750, status: "missing" }),
  mk("seven-days-ago", "2026-10-16T10:00:00Z", "paper", 20000, 70, null),
  mk("first-of-oct", "2026-09-30T22:30:00Z", "cardboard", 30000, 90, null), // 00:30 on 1 Oct in SA
  mk("september", "2026-09-29T10:00:00Z", "hdpe", 1000, 300, null),
  mk("nov-last-year", "2025-11-05T10:00:00Z", "cans", 1000, 1000, null),
  mk("oct-last-year", "2025-10-20T10:00:00Z", "cans", 1000, 1000, null),
];

let passed = 0;
const check = (name, fn) => {
  fn();
  passed++;
  console.log("PASS", name);
};

check("month totals use South African time and exclude September", () => {
  const m = monthTotals(sales, now);
  assert.equal(m.grams, 6400 + 10000 + 50000 + 20000 + 30000);
  assert.equal(m.byMaterial.cardboard.grams, 30000);
  assert.equal(m.byMaterial.hdpe.grams, 0);
  assert.equal(m.cents, 6400 + 4000 + 2000 + 1400 + 2700);
});
check("fee totals and recovery percent", () => {
  assert.deepEqual(feeTotals(sales), { paidCents: 150, owedCents: 96, missingCents: 750 });
  assert.equal(feeRecoveryPercent(sales), 15);
  assert.equal(feeRecoveryPercent([sales[3]]), null);
});
check("week: seven daily buckets, today last, the 00:30 sale counted today", () => {
  const w = impactSeries(sales, "week", now);
  assert.equal(w.labels.length, 7);
  assert.equal(w.labels[6], "Fri");
  assert.equal(w.grams[6], 16400);
  assert.equal(w.grams[0], 50000);
  assert.equal(w.totalGrams, 66400);
});
check("month: four weekly buckets", () => {
  const m = impactSeries(sales, "month", now);
  assert.deepEqual(m.grams, [31000, 0, 20000, 66400]);
  assert.equal(m.totalGrams, 117400);
});
check("year: twelve monthly buckets, Nov to Oct", () => {
  const y = impactSeries(sales, "year", now);
  assert.equal(y.labels[0], "Nov");
  assert.equal(y.labels[11], "Oct");
  assert.equal(y.grams[11], 116400);
  assert.equal(y.grams[10], 1000);
  assert.equal(y.grams[0], 1000);
  assert.equal(y.totalGrams, 118400);
  assert.equal(y.payCents, 17800);
  assert.equal(y.co2Grams, 293326);
});
check("money and weight parsing never use floats", () => {
  assert.equal(logic.parseKgToGrams("6.4"), 6400);
  assert.equal(logic.parseKgToGrams("0.001"), 1);
  assert.equal(logic.parseKgToGrams("6.4567"), null);
  assert.equal(logic.parseKgToGrams("abc"), null);
  assert.equal(logic.parseRandToCents("3.50"), 350);
  assert.equal(logic.parseRandToCents("3.5"), 350);
  assert.equal(logic.parseRandToCents("0"), null);
  assert.equal(logic.parseRandToCents("3.505"), null);
  assert.equal(logic.saleCents(6400, 1020), 6528);
  assert.equal(logic.formatRand(6528), "R65.28");
  assert.equal(logic.formatPerTonne(1020), "R10 200/t");
});
check("scan rules: fact, question, mixed, unsure, and quarters win when the whole is unsure", () => {
  const g = (group, confidence) => ({ group, confidence });
  assert.equal(logic.interpretScan({ whole: g("metal", 0.93), quarters: [g("metal", 0.9), g("metal", 0.9), g("metal", 0.9), g("trash", 0.4)], ms: 1 }).kind, "fact");
  assert.equal(logic.interpretScan({ whole: g("cardboard", 0.6), quarters: [g("cardboard", 0.6), g("paper", 0.6), g("cardboard", 0.6), g("trash", 0.5)], ms: 1 }).kind, "question");
  assert.equal(logic.interpretScan({ whole: g("cardboard", 0.72), quarters: [g("cardboard", 0.91), g("cardboard", 0.84), g("plastic", 0.89), g("metal", 0.87)], ms: 1 }).kind, "mixed");
  assert.equal(logic.interpretScan({ whole: g("trash", 0.34), quarters: [g("paper", 0.4), g("trash", 0.5), g("glass", 0.3), g("plastic", 0.35)], ms: 1 }).kind, "unsure");
  const viaQuarters = logic.interpretScan({ whole: g("paper", 0.6), quarters: [g("paper", 0.8), g("paper", 0.75), g("paper", 0.72), g("glass", 0.3)], ms: 1 });
  assert.equal(viaQuarters.kind, "fact");
  assert.equal(viaQuarters.viaQuarters, true);
});

// ---- Electronics (lib/app/ewaste.ts, lib/app/areas.ts) ----
const ew = await import(pathToFileURL(join(out, "ewaste.mjs")).href);
const areas = await import(pathToFileURL(join(out, "areas.mjs")).href);

check("every item and state has advice, and none of it uses an em dash", () => {
  for (const c of ew.EWASTE_CATEGORIES) {
    assert.ok(ew.CATEGORY_LABEL[c], `label for ${c}`);
    for (const cond of ew.CONDITIONS) {
      const a = ew.adviceFor(c, cond);
      assert.ok(a.headline.length > 5 && a.steps.length >= 1 && a.care.length >= 1, `${c}/${cond}`);
      const text = [a.headline, ...a.steps.flatMap((s) => [s.title, s.body]), ...a.care].join(" ");
      assert.ok(!text.includes("—"), `${c}/${cond} has an em dash`);
      assert.equal(new Set(a.steps.map((s) => s.title)).size, a.steps.length, `${c}/${cond} repeats a step`);
    }
  }
  assert.ok(!JSON.stringify(ew.NATIONAL_OPTIONS).includes("—"));
});
check("advice puts reuse before recycling, and batteries never go in the bin", () => {
  const working = ew.adviceFor("phone", "works");
  assert.equal(working.steps[0].action, "sell");
  assert.ok(working.steps.some((s) => s.action === "tradein"));
  assert.equal(ew.adviceFor("phone", "parts").steps.at(-1).action, "find");
  const battery = ew.adviceFor("battery", "works");
  assert.equal(battery.steps[0].action, "batteries");
  assert.ok(/tape/i.test(battery.care.join(" ")));
  assert.ok(/mercury/i.test(ew.adviceFor("lighting", "works").headline + ew.adviceFor("lighting", "works").care.join(" ")));
});
check("national options each have an https source and a check date", () => {
  for (const o of ew.NATIONAL_OPTIONS) {
    assert.match(o.url, /^https:\/\//);
    assert.match(o.checkedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(o.for.length > 0 && o.source);
  }
  assert.ok(ew.optionsFor("battery").some((o) => o.id === "retail-batteries"));
  assert.ok(ew.optionsFor("phone", "tradein").every((o) => o.id.startsWith("tradein")));
});
check("distance, sorting and age of a listing", () => {
  const crownMines = { lat: -26.21614, lng: 28.00974 };
  const woodmead = { lat: -26.05934, lng: 28.09224 };
  const km = ew.distanceKm(crownMines, woodmead);
  assert.ok(km > 18.5 && km < 20.5, `got ${km}`);
  assert.equal(ew.distanceKm(crownMines, crownMines), 0);
  assert.equal(ew.formatKm(0.4), "under 1 km");
  assert.equal(ew.formatKm(3.26), "3.3 km");
  assert.equal(ew.formatKm(19.3), "19 km");
  const near = ew.sortPlaces([{ name: "B", ...woodmead }, { name: "A", ...crownMines }], { lat: -26.2206, lng: 27.9147 });
  assert.equal(near[0].name, "A");
  assert.ok(near[0].km < near[1].km);
  assert.deepEqual(ew.sortPlaces([{ name: "B", ...woodmead }, { name: "A", ...crownMines }], null).map((p) => p.name), ["A", "B"]);
  assert.equal(ew.daysSince("2026-10-23", new Date("2026-10-23T10:00:00Z")), 0);
  assert.equal(ew.daysSince("2026-10-13", new Date("2026-10-23T10:00:00Z")), 10);
});
check("South African numbers become call and WhatsApp links", () => {
  for (const raw of ["082 555 0101", "0825550101", "+27 82 555 0101", "27825550101", "(082) 555-0101"]) {
    assert.equal(ew.internationalDigits(raw), "27825550101", raw);
  }
  assert.equal(ew.internationalDigits("12345"), null);
  assert.equal(ew.internationalDigits("+1 202 555 0101"), null);
  const l = ew.contactLinks("082 555 0101", "Hi & hello");
  assert.equal(l.call, "tel:+27825550101");
  assert.equal(l.whatsapp, "https://wa.me/27825550101?text=Hi%20%26%20hello");
  assert.equal(ew.contactLinks("+1 202 555 0101", "x").whatsapp, null);
  assert.ok(ew.isValidContact("082 555 0101") && !ew.isValidContact("call me") && !ew.isValidContact("12345"));
});
check("areas sit inside Gauteng and match what people type", () => {
  for (const a of areas.AREAS) assert.ok(a.lat < -25.9 && a.lat > -26.4 && a.lng > 27.7 && a.lng < 28.2, a.label);
  assert.equal(areas.areaFor("Orlando West, Soweto").label, "Orlando West");
  assert.equal(areas.areaFor("kliptown").label, "Kliptown");
  assert.equal(areas.areaFor(""), null);
  assert.equal(areas.areaFor("Cape Town"), null);
});

console.log(`\n${passed} passed, 0 failed.`);
