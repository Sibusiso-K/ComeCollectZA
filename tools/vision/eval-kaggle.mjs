// Step 1: how does the head that is live in the app do on the Kaggle e-waste photos it has never seen?
// Step 2: retrain with the Kaggle train and val photos added, and measure on the Kaggle test photos plus the usual
// held-out TrashNet, RealWaste and Commons photos. Usage: node eval-kaggle.mjs [write]
import { readFileSync, writeFileSync } from "node:fs";

const load = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8"));
const APP = process.argv[3] ?? "";
const live = JSON.parse(readFileSync(process.env.LIVE_HEAD, "utf8"));
const tn = load("./emb_trashnet.json");
const rw = load("./emb_realwaste.json");
const classes = live.classes;
const D = live.dim;
const EXCLUDE = ["clutter"];
const ewAll = load("./emb_electronics.json").filter((d) => !EXCLUDE.includes(d.sub));
const kg = load("./emb_kaggle.json");

function split(data, seed0, key = (d) => d.cls) {
  let seed = seed0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const train = [], test = [];
  for (const k of [...new Set(data.map(key))].sort()) {
    const g = data.filter((d) => key(d) === k);
    for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
    const cut = Math.floor(g.length * 0.8);
    train.push(...g.slice(0, cut)); test.push(...g.slice(cut));
  }
  return { train, test };
}
const tnS = split(tn, 42), rwS = split(rw, 7), ewS = split(ewAll, 11, (d) => d.sub);

const softmax = (z) => { const m = Math.max(...z); const ex = z.map((v) => Math.exp(v - m)); const s = ex.reduce((a, v) => a + v, 0); return ex.map((v) => v / s); };
const pct = (a, n) => (n ? ((100 * a) / n).toFixed(1) + "%" : "-");

function makeHead(h) {
  return { classes: h.classes, probs: (e) => { const x = e.map((v, j) => (v - h.mean[j]) / h.std[j]); return softmax(h.W.map((r, k) => r.reduce((s, w, j) => s + w * x[j], h.b[k]))); } };
}
const top = (head, e) => { const p = head.probs(e); const k = p.indexOf(Math.max(...p)); return { cls: head.classes[k], p: p[k] }; };
const found = (head, set) => pct(set.filter((d) => top(head, d.e).cls === "electronics").length, set.length);
const acc = (head, set) => pct(set.filter((d) => top(head, d.e).cls === d.cls).length, set.length);
const wrongElec = (head, set) => pct(set.filter((d) => top(head, d.e).cls === "electronics").length, set.length);

function train(set) {
  const mean = new Array(D).fill(0), std = new Array(D).fill(0);
  for (const d of set) for (let j = 0; j < D; j++) mean[j] += d.e[j] / set.length;
  for (const d of set) for (let j = 0; j < D; j++) std[j] += (d.e[j] - mean[j]) ** 2 / set.length;
  for (let j = 0; j < D; j++) std[j] = Math.sqrt(std[j]) || 1;
  const X = set.map((d) => d.e.map((x, j) => (x - mean[j]) / std[j]));
  const y = set.map((d) => classes.indexOf(d.cls));
  const K = classes.length;
  const W = Array.from({ length: K }, () => new Array(D).fill(0)), b = new Array(K).fill(0);
  const counts = new Array(K).fill(0); for (const c of y) counts[c]++;
  const weight = counts.map((c) => set.length / (K * Math.max(1, c)));
  const logits = (x) => W.map((w, k) => w.reduce((a, v, j) => a + v * x[j], b[k]));
  for (let epoch = 0; epoch < 400; epoch++) {
    const gW = Array.from({ length: K }, () => new Array(D).fill(0)), gb = new Array(K).fill(0);
    for (let i = 0; i < X.length; i++) {
      const p = softmax(logits(X[i]));
      for (let k = 0; k < K; k++) {
        const err = (p[k] - (k === y[i] ? 1 : 0)) * weight[y[i]];
        gb[k] += err; for (let j = 0; j < D; j++) gW[k][j] += err * X[i][j];
      }
    }
    for (let k = 0; k < K; k++) { b[k] -= (0.05 * gb[k]) / X.length; for (let j = 0; j < D; j++) W[k][j] -= 0.05 * (gW[k][j] / X.length + 0.01 * W[k][j]); }
  }
  return { classes, dim: D, mean, std, W, b };
}

const kgTest = kg.filter((d) => d.split === "test");
const kgTrain = kg.filter((d) => d.split !== "test");

// Are the Kaggle photos copies of each other across splits? Count test photos whose nearest train photo is almost identical.
const dot = (a, b) => { let s = 0; for (let j = 0; j < a.length; j++) s += a[j] * b[j]; return s; };
let near = 0;
for (const t of kgTest.slice(0, 300)) { let best = -1; for (const r of kgTrain) { const s = dot(t.e, r.e); if (s > best) best = s; } if (best > 0.97) near++; }
console.log(`Near-duplicates: ${near} of 300 Kaggle test photos have a train photo with cosine similarity above 0.97`);

const liveHead = makeHead(live);
console.log("\n== Step 1: the live head (version " + live.version + "), no Kaggle photos seen ==");
console.log("Kaggle test photos found as electronics:", found(liveHead, kgTest), "of", kgTest.length);
const byKind = [...new Set(kgTest.map((d) => d.sub))].sort().map((s) => { const g = kgTest.filter((d) => d.sub === s); return `${s} ${found(liveHead, g)}`; });
console.log("by kind:", byKind.join(", "));
const miss = {}; for (const d of kgTest) { const c = top(liveHead, d.e).cls; if (c !== "electronics") miss[c] = (miss[c] ?? 0) + 1; }
console.log("misses were called:", JSON.stringify(miss));

console.log("\n== Step 2: retrain with the Kaggle train and val photos ==");
const trained = train([...tnS.train, ...rwS.train, ...ewS.train, ...kgTrain]);
const head5 = makeHead(trained);
console.log("Kaggle test found:      live", found(liveHead, kgTest), " -> new", found(head5, kgTest));
console.log("Commons electronics:    live", found(liveHead, ewS.test), " -> new", found(head5, ewS.test));
console.log("TrashNet test accuracy: live", acc(liveHead, tnS.test), " -> new", acc(head5, tnS.test));
console.log("RealWaste test accuracy: live", acc(liveHead, rwS.test), " -> new", acc(head5, rwS.test));
console.log("Recyclables wrongly called electronics (TrashNet, RealWaste): live", wrongElec(liveHead, tnS.test), wrongElec(liveHead, rwS.test), " -> new", wrongElec(head5, tnS.test), wrongElec(head5, rwS.test));

if (process.argv[2] === "write") { writeFileSync(new URL("./head-v5.json", import.meta.url), JSON.stringify(trained)); console.log("wrote head-v5.json"); }
