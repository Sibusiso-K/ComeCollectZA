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
const compile = (file, fix, dir = "app") => {
  let src = readFileSync(join(root, "lib", dir, `${file}.ts`), "utf8");
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
compile("head", (s) => s, "vision");
const head = await import(pathToFileURL(join(out, "head.mjs")).href);
compile("market-prices", (s) => s, "");
compile("advice", (s) =>
  s.replace(/import type \{ MySale \} from "\.\/api";/, "").replace(/from "\.\/logic"/g, 'from "./logic.mjs"').replace(/from "\.\.\/market-prices"/g, 'from "./market-prices.mjs"'));
const { adviceFor, forecastNext30 } = await import(pathToFileURL(join(out, "advice.mjs")).href);

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
check("scan rules: electronics point to the electronics guide and never count as a material in a mix", () => {
  const g = (group, confidence) => ({ group, confidence });
  const sure = logic.interpretScan({ whole: g("electronics", 0.88), quarters: [g("electronics", 0.8), g("metal", 0.9), g("electronics", 0.7), g("plastic", 0.4)], ms: 1 });
  assert.deepEqual(sure, { kind: "electronics", confidence: 0.88, sure: true });
  const maybe = logic.interpretScan({ whole: g("electronics", 0.55), quarters: [g("trash", 0.5), g("metal", 0.4), g("electronics", 0.6), g("plastic", 0.4)], ms: 1 });
  assert.equal(maybe.kind, "electronics");
  assert.equal(maybe.sure, false);
  const quarters = logic.interpretScan({ whole: g("metal", 0.45), quarters: [g("electronics", 0.9), g("electronics", 0.8), g("electronics", 0.75), g("metal", 0.6)], ms: 1 });
  assert.equal(quarters.kind, "electronics");
  const cans = logic.interpretScan({ whole: g("metal", 0.8), quarters: [g("metal", 0.9), g("electronics", 0.92), g("metal", 0.8), g("metal", 0.75)], ms: 1 });
  assert.equal(cans.kind, "fact", "a strong electronics quarter does not turn a can load into a mix");
  const question = logic.interpretScan({ whole: g("plastic", 0.6), quarters: [g("electronics", 0.95), g("glass", 0.6), g("plastic", 0.6), g("trash", 0.4)], ms: 1 });
  assert.deepEqual(question.options, ["plastic", "glass"]);
  assert.deepEqual(logic.GROUP_TO_MATERIALS.electronics, []);
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
check("a load adds each item at the price it was added with", () => {
  const total = logic.loadTotalCents([
    { id: "a", material: "cans", grams: 6400, centsPerKg: 1020, centre: "Orlando East" },
    { id: "b", material: "glass", grams: 1000, centsPerKg: 40, centre: "Klipspruit" },
  ]);
  assert.equal(total, 6528 + 40);
  assert.equal(logic.loadTotalCents([]), 0);
});
check("a black or blank photo is refused, a dark or plain real one is not", () => {
  const photo = (colour) => {
    const a = new Uint8ClampedArray(20000 * 4);
    for (let i = 0; i < 20000; i++) a.set([...colour(i), 255], i * 4);
    return a;
  };
  assert.ok(logic.isBlankPhoto(photo(() => [0, 0, 0])), "all black");
  assert.ok(logic.isBlankPhoto(photo(() => [200, 200, 200])), "a blank wall");
  assert.ok(logic.isBlankPhoto(photo((i) => [3 + (i % 5), 3 + (i % 5), 3 + (i % 5)])), "covered lens with sensor noise");
  assert.ok(logic.isBlankPhoto([]), "no pixels");
  assert.ok(!logic.isBlankPhoto(photo((i) => (i % 37 < 3 ? [180, 170, 150] : [2, 2, 2]))), "a lamp on a black table");
  assert.ok(!logic.isBlankPhoto(photo((i) => [134 + (i % 13), 114 + (i % 13), 90])), "plain cardboard, close up");
});
check("the scanner head's hidden layer matches a hand-worked case", () => {
  // Stored bytes 127, 0, 0, -127 with scales 1/127 and 2/127 give the first layer [[1, 0], [0, -2]].
  const tiny = head.prepareHead({
    classes: ["glass", "metal"], dim: 2, mean: [0, 0], std: [1, 1], hidden: 2,
    W1q: Buffer.from(Int8Array.of(127, 0, 0, -127).buffer).toString("base64"), W1scale: [1 / 127, 2 / 127], b1: [0, 1],
    W: [[1, 0], [0, 1]], b: [0, 0],
  });
  // [3, 4] is normalised to [0.6, 0.8]. Hidden: 0.6 and max(0, -1.6 + 1) = 0, so glass is 1 / (1 + e^-0.6).
  assert.ok(Math.abs(head.scoreEmbedding([3, 4], tiny).glass - 1 / (1 + Math.exp(-0.6))) < 1e-6);
  // [4, -3] gives [0.8, -0.6]. Hidden: 0.8 and 1.2 + 1 = 2.2, so metal is 1 / (1 + e^-1.4).
  assert.ok(Math.abs(head.scoreEmbedding([4, -3], tiny).metal - 1 / (1 + Math.exp(-1.4))) < 1e-6);
  // An older linear head, with no hidden layer, still scores.
  const linear = head.prepareHead({ classes: ["glass", "metal"], dim: 2, mean: [0, 0], std: [1, 1], W: [[1, 0], [0, 1]], b: [0, 0] });
  assert.ok(Math.abs(head.scoreEmbedding([3, 4], linear).metal - 1 / (1 + Math.exp(-0.2))) < 1e-6);
});
check("the shipped scanner head loads and scores all seven groups", () => {
  const shipped = head.prepareHead(JSON.parse(readFileSync(join(root, "public", "models", "waste-head.json"), "utf8")));
  assert.equal(shipped.classes.length, 7);
  assert.equal(shipped.W1.length, shipped.hidden * 512);
  const e = Array.from({ length: 512 }, (_, i) => Math.sin(i * 7.1));
  const scores = Object.values(head.scoreEmbedding(e, shipped));
  assert.equal(scores.length, 7);
  assert.ok(scores.every(Number.isFinite));
  assert.ok(Math.abs(scores.reduce((a, v) => a + v, 0) - 1) < 1e-9);
});

const centres = (...prices) => prices.map((p, i) => ({ centre: `Centre ${i + 1}`, centsPerKg: p }));
check("advice: a centre paying 10% more or better comes first, before anything else", () => {
  const a = adviceFor("hdpe", 300, centres(300, 340, 310));
  assert.deepEqual(a, { verdict: "compare", centre: "Centre 2", centsPerKg: 340 });
  // Exactly 10% more counts. Just under does not.
  assert.equal(adviceFor("hdpe", 300, centres(300, 330)).verdict, "compare");
  assert.notEqual(adviceFor("hdpe", 300, centres(300, 329)).verdict, "compare");
  // Even PET, whose price fell, sends the person to the better centre first.
  assert.equal(adviceFor("pet", 350, centres(350, 400)).verdict, "compare");
});
check("advice: PET and cans have a reported fall, so the advice is to sell", () => {
  assert.deepEqual(adviceFor("pet", 365, centres(365, 380)), { verdict: "sell", reason: "falling", dropPercent: 50 });
  assert.deepEqual(adviceFor("cans", 990, centres(990)), { verdict: "sell", reason: "falling", dropPercent: 29 });
});
check("advice: with no reported fall it follows where the price sits in the usual range", () => {
  assert.deepEqual(adviceFor("glass", 78, centres(78)), { verdict: "sell", reason: "high" }); // 95% of 40 to 80
  assert.equal(adviceFor("cardboard", 62, centres(62)).verdict, "wait"); // 3% of 60 to 120
  assert.equal(adviceFor("hdpe", 320, centres(320)).verdict, "fair"); // 40% of 200 to 500
  assert.equal(adviceFor("paper", 75, centres(75)).verdict, "sell"); // 70% of 40 to 90
});
check("advice: a falling market is not called low or high, and an empty board still answers", () => {
  assert.equal(adviceFor("pet", 250, centres(250)).verdict, "sell");
  assert.equal(adviceFor("glass", 60, []).verdict, "fair");
});
const fsale = (iso, cents) => ({ id: iso, createdAt: iso, material: "pet", grams: 1000, centsPerKg: cents, amountCents: cents, centre: "C", fee: null });
const later = new Date("2026-11-20T10:00:00Z");
check("forecast: needs three sales over a week, so one sale gives nothing", () => {
  assert.equal(forecastNext30([fsale("2026-11-19T10:00:00Z", 2336)], later), null);
  assert.equal(forecastNext30([fsale("2026-11-19T10:00:00Z", 2000), fsale("2026-11-18T10:00:00Z", 2000), fsale("2026-11-17T10:00:00Z", 2000)], later), null);
});
check("forecast: daily rate over the days since the first recent sale, times 30, plus or minus a quarter", () => {
  // 4 sales of R50 across 10 days: R200 over 10 days is R20 a day, so R600 in 30 days.
  const four = ["2026-11-10T10:00:00Z", "2026-11-13T10:00:00Z", "2026-11-16T10:00:00Z", "2026-11-19T10:00:00Z"].map((d) => fsale(d, 5000));
  const f = forecastNext30(four, later);
  assert.deepEqual(f, { cents: 60000, lowCents: 45000, highCents: 75000, sales: 4, days: 10 });
});
check("forecast: ignores sales older than 28 days and uses at most a 28 day window", () => {
  const old = fsale("2026-09-01T10:00:00Z", 99999);
  const recent = ["2026-10-23T12:00:00Z", "2026-11-05T10:00:00Z", "2026-11-18T10:00:00Z"].map((d) => fsale(d, 2800));
  const f = forecastNext30([old, ...recent], later);
  assert.equal(f.sales, 3);
  assert.equal(f.days, 28);
  assert.equal(f.cents, 9000); // R84 over 28 days is R3 a day, so R90 in 30 days
});

console.log(`\n${passed} passed, 0 failed.`);
