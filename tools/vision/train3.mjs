// Version 3 of the scanner head: the six material groups plus "electronics".
// Trains on TrashNet, RealWaste and openly licensed Wikimedia Commons photos of electronics, with a held-out 20% of
// each. Same method as train2.mjs (a linear head on TinyCLIP features). Usage: node train3.mjs [write]
import { readFileSync, writeFileSync } from "node:fs";

const load = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8"));
const tn = load("./emb_trashnet.json");
const rw = load("./emb_realwaste.json");
const ew = load("./emb_electronics.json");
const classes = [...load("./emb_text.json").classes, "electronics"];
const K = classes.length;
const D = tn[0].e.length;

// Seeded split per class (and per subgroup for electronics), the same seeds as before for TrashNet and RealWaste.
function split(data, seed0, key = (d) => d.cls) {
  let seed = seed0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const train = [];
  const test = [];
  for (const k of [...new Set(data.map(key))].sort()) {
    const g = data.filter((d) => key(d) === k);
    for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
    const cut = Math.floor(g.length * 0.8);
    train.push(...g.slice(0, cut));
    test.push(...g.slice(cut));
  }
  return { train, test };
}
const tnS = split(tn, 42);
const rwS = split(rw, 7);
let ewS = split(ew, 11, (d) => d.sub);
// HOLDOUT="toaster,hair dryer": those kinds of item never appear in training, so the test shows how it copes with unseen devices.
if (process.env.HOLDOUT) {
  const q = Object.fromEntries(JSON.parse(readFileSync(new URL("./electronics/manifest.json", import.meta.url), "utf8")).map((m) => [m.file, m.query]));
  const out = process.env.HOLDOUT.split(",");
  ewS = { train: ew.filter((d) => !out.includes(q[d.src])), test: ew.filter((d) => out.includes(q[d.src])) };
}

const softmax = (z) => { const m = Math.max(...z); const ex = z.map((v) => Math.exp(v - m)); const s = ex.reduce((a, v) => a + v, 0); return ex.map((v) => v / s); };

function train(set, cls) {
  const KK = cls.length;
  const mean = new Array(D).fill(0);
  const std = new Array(D).fill(0);
  for (const d of set) for (let j = 0; j < D; j++) mean[j] += d.e[j] / set.length;
  for (const d of set) for (let j = 0; j < D; j++) std[j] += (d.e[j] - mean[j]) ** 2 / set.length;
  for (let j = 0; j < D; j++) std[j] = Math.sqrt(std[j]) || 1;
  const prep = (e) => e.map((x, j) => (x - mean[j]) / std[j]);
  const X = set.map((d) => prep(d.e));
  const y = set.map((d) => cls.indexOf(d.cls));
  const W = Array.from({ length: KK }, () => new Array(D).fill(0));
  const b = new Array(KK).fill(0);
  const counts = new Array(KK).fill(0);
  for (const c of y) counts[c]++;
  const weight = counts.map((c) => set.length / (KK * Math.max(1, c)));
  const logits = (x) => W.map((w, k) => w.reduce((a, v, j) => a + v * x[j], b[k]));
  const lr = 0.05;
  const l2 = 0.01;
  for (let epoch = 0; epoch < 400; epoch++) {
    const gW = Array.from({ length: KK }, () => new Array(D).fill(0));
    const gb = new Array(KK).fill(0);
    for (let i = 0; i < X.length; i++) {
      const p = softmax(logits(X[i]));
      for (let k = 0; k < KK; k++) {
        const err = (p[k] - (k === y[i] ? 1 : 0)) * weight[y[i]];
        gb[k] += err;
        for (let j = 0; j < D; j++) gW[k][j] += err * X[i][j];
      }
    }
    for (let k = 0; k < KK; k++) {
      b[k] -= (lr * gb[k]) / X.length;
      for (let j = 0; j < D; j++) W[k][j] -= lr * (gW[k][j] / X.length + l2 * W[k][j]);
    }
  }
  const probs = (e) => softmax(logits(prep(e)));
  return { classes: cls, dim: D, mean, std, W, b, probs };
}

const top = (head, e) => { const p = head.probs(e); const k = p.indexOf(Math.max(...p)); return { cls: head.classes[k], p: p[k] }; };
const pct = (a, n) => (n ? ((100 * a) / n).toFixed(1) + "%" : "-");
function acc(head, set) {
  let ok = 0;
  for (const d of set) if (top(head, d.e).cls === d.cls) ok++;
  return pct(ok, set.length);
}
const falseElectronics = (head, set) => pct(set.filter((d) => top(head, d.e).cls === "electronics").length, set.length);

// Version 2, retrained here the same way, as the baseline for the six groups.
const six = classes.slice(0, 6);
const v2 = train([...tnS.train, ...rwS.train], six);
const v3 = train([...tnS.train, ...rwS.train, ...ewS.train], classes);

console.log("Held-out photos: TrashNet", tnS.test.length, "| RealWaste", rwS.test.length, "| electronics", ewS.test.length);
console.log("v2 (six groups)    TrashNet", acc(v2, tnS.test), " RealWaste", acc(v2, rwS.test));
console.log("v3 (with electronics) TrashNet", acc(v3, tnS.test), " RealWaste", acc(v3, rwS.test), " electronics found", acc(v3, ewS.test));
console.log("v3 recyclables wrongly called electronics: TrashNet", falseElectronics(v3, tnS.test), " RealWaste", falseElectronics(v3, rwS.test));

// Electronics found, by kind of item.
const subs = [...new Set(ewS.test.map((d) => d.sub))].sort();
console.log("v3 electronics found by kind: " + subs.map((s) => { const g = ewS.test.filter((d) => d.sub === s); return `${s} ${acc(v3, g)} (${g.length})`; }).join(", "));
// What the misses were called.
const miss = {};
for (const d of ewS.test) { const t = top(v3, d.e).cls; if (t !== "electronics") miss[t] = (miss[t] ?? 0) + 1; }
console.log("v3 electronics misses were called:", JSON.stringify(miss));

// At the app's 70% rule.
for (const [name, set] of [["RealWaste", rwS.test], ["electronics", ewS.test]]) {
  let sure = 0; let ok = 0;
  for (const d of set) { const t = top(v3, d.e); if (t.p >= 0.7) { sure++; if (t.cls === d.cls) ok++; } }
  console.log(`v3 at 70% sure on ${name}: answers ${pct(sure, set.length)} of photos, right ${pct(ok, sure)} of those`);
}

if (process.argv[2] === "write") {
  writeFileSync(new URL("./head-v3.json", import.meta.url), JSON.stringify({ classes, dim: D, mean: v3.mean, std: v3.std, W: v3.W, b: v3.b }));
  console.log("wrote head-v3.json");
}
