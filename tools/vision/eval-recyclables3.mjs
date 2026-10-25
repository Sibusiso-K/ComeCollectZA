// Does training on more real recyclable photos raise the score?
// Compares the live head (v4) with two retrained heads on held-out photos from every source:
//   A: adds the TrashBusters recyclable photos (MIT, 8,433 photos from three Kaggle sources, 1,989 tagged real_world)
//   B: A plus the Kaggle e-waste train and val photos
// Held out: 20% of each TrashBusters source and context (never trained on), the usual TrashNet and RealWaste 20%,
// the Commons electronics 20% and the Kaggle electronics test photos.
// Usage: LIVE_HEAD=<path> node eval-recyclables.mjs [A|B]   (a letter writes head-v5.json from that candidate)
import { readFileSync, writeFileSync } from "node:fs";

const load = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8"));
const live = JSON.parse(readFileSync(process.env.LIVE_HEAD, "utf8"));
const classes = live.classes;
const D = live.dim;
const tn = load("./emb_trashnet.json");
const rw = load("./emb_realwaste.json");
const ewAll = load("./emb_electronics.json").filter((d) => d.sub !== "clutter");
const kg = load("./emb_kaggle.json");
const tb = load("./emb_trashbusters.json");
const tb2 = load("./emb_trashbusters_train.json"); // the larger TrashBusters training shards, never used in a test

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
const tbS = split(tb, 21, (d) => `${d.source}|${d.context}|${d.cls}`);
const kgTest = kg.filter((d) => d.split === "test");
const kgTrain = kg.filter((d) => d.split !== "test");

const softmax = (z) => { const m = Math.max(...z); const ex = z.map((v) => Math.exp(v - m)); const s = ex.reduce((a, v) => a + v, 0); return ex.map((v) => v / s); };
const pct = (a, n) => (n ? ((100 * a) / n).toFixed(1) + "%" : "-");
const makeHead = (h) => ({ classes: h.classes, probs: (e) => softmax(h.W.map((r, k) => r.reduce((s, w, j) => s + w * ((e[j] - h.mean[j]) / h.std[j]), h.b[k]))) });
const top = (head, e) => { const p = head.probs(e); return head.classes[p.indexOf(Math.max(...p))]; };
const acc = (head, set) => pct(set.filter((d) => top(head, d.e) === d.cls).length, set.length);
const asElec = (head, set) => pct(set.filter((d) => top(head, d.e) === "electronics").length, set.length);

// Adam on flat typed arrays. EPOCHS, LR, L2 and OLDW (extra weight on the TrashNet and RealWaste photos) come from the environment.
const EPOCHS = Number(process.env.EPOCHS ?? 400), LR = Number(process.env.LR ?? 0.02), L2 = Number(process.env.L2 ?? 0.001), OLDW = Number(process.env.OLDW ?? 1);
const isOld = new Set([...tnS.train, ...rwS.train]);
function train(set) {
  const n = set.length, K = classes.length;
  const mean = new Array(D).fill(0), std = new Array(D).fill(0);
  for (const d of set) for (let j = 0; j < D; j++) mean[j] += d.e[j] / n;
  for (const d of set) for (let j = 0; j < D; j++) std[j] += (d.e[j] - mean[j]) ** 2 / n;
  for (let j = 0; j < D; j++) std[j] = Math.sqrt(std[j]) || 1;
  const X = new Float32Array(n * D);
  for (let i = 0; i < n; i++) for (let j = 0; j < D; j++) X[i * D + j] = (set[i].e[j] - mean[j]) / std[j];
  const y = Int32Array.from(set, (d) => classes.indexOf(d.cls));
  const sw = Float32Array.from(set, (d) => (isOld.has(d) ? OLDW : 1));
  const cw = new Float64Array(K); for (let i = 0; i < n; i++) cw[y[i]] += sw[i];
  const wt = Float32Array.from({ length: n }, (_, i) => (sw[i] * n) / (K * cw[y[i]]));
  const W = new Float64Array(K * D), b = new Float64Array(K);
  const mW = new Float64Array(K * D), vW = new Float64Array(K * D), mb = new Float64Array(K), vb = new Float64Array(K);
  const gW = new Float64Array(K * D), gb = new Float64Array(K), z = new Float64Array(K);
  let tot = 0; for (let i = 0; i < n; i++) tot += wt[i];
  for (let ep = 1; ep <= EPOCHS; ep++) {
    gW.fill(0); gb.fill(0);
    for (let i = 0; i < n; i++) {
      const off = i * D;
      let m = -1e9;
      for (let k = 0; k < K; k++) { let a = b[k]; const wo = k * D; for (let j = 0; j < D; j++) a += W[wo + j] * X[off + j]; z[k] = a; if (a > m) m = a; }
      let sum = 0; for (let k = 0; k < K; k++) { z[k] = Math.exp(z[k] - m); sum += z[k]; }
      for (let k = 0; k < K; k++) { const err = (z[k] / sum - (k === y[i] ? 1 : 0)) * wt[i]; gb[k] += err; const wo = k * D; for (let j = 0; j < D; j++) gW[wo + j] += err * X[off + j]; }
    }
    const b1 = 0.9, b2 = 0.999, c1 = 1 - b1 ** ep, c2 = 1 - b2 ** ep;
    for (let q = 0; q < K * D; q++) { const g = gW[q] / tot + L2 * W[q]; mW[q] = b1 * mW[q] + (1 - b1) * g; vW[q] = b2 * vW[q] + (1 - b2) * g * g; W[q] -= (LR * (mW[q] / c1)) / (Math.sqrt(vW[q] / c2) + 1e-8); }
    for (let k = 0; k < K; k++) { const g = gb[k] / tot; mb[k] = b1 * mb[k] + (1 - b1) * g; vb[k] = b2 * vb[k] + (1 - b2) * g * g; b[k] -= (LR * (mb[k] / c1)) / (Math.sqrt(vb[k] / c2) + 1e-8); }
  }
  return { classes, dim: D, mean, std, W: Array.from({ length: K }, (_, k) => Array.from(W.subarray(k * D, (k + 1) * D))), b: Array.from(b) };
}

const base = [...tnS.train, ...rwS.train, ...ewS.train];
const trainedA = train([...base, ...tbS.train, ...kgTrain]);
const trainedB = train([...base, ...tbS.train, ...tb2, ...kgTrain]);
const heads = { "live v5": makeHead(live), "A: v5 data again": makeHead(trainedA), "B: + full dataset": makeHead(trainedB) };

const rows = [];
const tbReal = tbS.test.filter((d) => d.context === "real_world");
const bySource = [...new Set(tb.map((d) => d.source))].sort();
const tests = [
  ["TrashNet test (508)", (h) => acc(h, tnS.test)],
  ["RealWaste test (952, real photos)", (h) => acc(h, rwS.test)],
  [`NEW recyclables test (${tbS.test.length}, all sources)`, (h) => acc(h, tbS.test)],
  [`NEW real-world photos test (${tbReal.length})`, (h) => acc(h, tbReal)],
  ...bySource.map((s) => [`NEW ${s} test (${tbS.test.filter((d) => d.source === s).length})`, (h) => acc(h, tbS.test.filter((d) => d.source === s))]),
  [`Commons electronics found (${ewS.test.length})`, (h) => asElec(h, ewS.test)],
  [`Kaggle electronics found (${kgTest.length})`, (h) => asElec(h, kgTest)],
  ["Recyclables wrongly called electronics (TrashNet)", (h) => asElec(h, tnS.test)],
  ["Recyclables wrongly called electronics (RealWaste)", (h) => asElec(h, rwS.test)],
  ["Recyclables wrongly called electronics (NEW)", (h) => asElec(h, tbS.test)],
];
const names = Object.keys(heads);
console.log("".padEnd(54) + names.map((n) => n.padEnd(24)).join(""));
for (const [label, fn] of tests) console.log(label.padEnd(54) + names.map((n) => fn(heads[n]).padEnd(24)).join(""));

const pick = process.argv[2];
if (pick === "A" || pick === "B") {
  writeFileSync(new URL("./head-v5.json", import.meta.url), JSON.stringify(pick === "A" ? trainedA : trainedB));
  console.log("wrote head-v5.json from candidate", pick);
}
