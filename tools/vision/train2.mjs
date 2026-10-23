// Retrains the scanner head on TrashNet and RealWaste (real landfill photos). Same method as train.mjs.
// Test sets are held out from each dataset: the TrashNet 20% used before, and a new 20% of RealWaste.
import { readFileSync, writeFileSync } from "node:fs";

const tn = JSON.parse(readFileSync(new URL("./emb_trashnet.json", import.meta.url), "utf8"));
const rw = JSON.parse(readFileSync(new URL("./emb_realwaste.json", import.meta.url), "utf8"));
const { classes } = JSON.parse(readFileSync(new URL("./emb_text.json", import.meta.url), "utf8"));
const K = classes.length;
const D = tn[0].e.length;

// Same seeded split as train.mjs, so the TrashNet test set matches the 508 photos reported before.
function split(data, seed0) {
  let seed = seed0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const train = [];
  const test = [];
  for (const cls of classes) {
    const g = data.filter((d) => d.cls === cls);
    for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
    const cut = Math.floor(g.length * 0.8);
    train.push(...g.slice(0, cut));
    test.push(...g.slice(cut));
  }
  return { train, test };
}
const tnSplit = split(tn, 42);
const rwSplit = split(rw, 7);

function train(set) {
  const mean = new Array(D).fill(0);
  const std = new Array(D).fill(0);
  for (const d of set) for (let j = 0; j < D; j++) mean[j] += d.e[j] / set.length;
  for (const d of set) for (let j = 0; j < D; j++) std[j] += (d.e[j] - mean[j]) ** 2 / set.length;
  for (let j = 0; j < D; j++) std[j] = Math.sqrt(std[j]) || 1;
  const prep = (e) => e.map((x, j) => (x - mean[j]) / std[j]);
  const X = set.map((d) => prep(d.e));
  const y = set.map((d) => classes.indexOf(d.cls));
  const W = Array.from({ length: K }, () => new Array(D).fill(0));
  const b = new Array(K).fill(0);
  const counts = new Array(K).fill(0);
  for (const c of y) counts[c]++;
  const weight = counts.map((c) => set.length / (K * c));
  const softmax = (z) => { const m = Math.max(...z); const ex = z.map((v) => Math.exp(v - m)); const s = ex.reduce((a, v) => a + v, 0); return ex.map((v) => v / s); };
  const logits = (x) => W.map((w, k) => w.reduce((a, v, j) => a + v * x[j], b[k]));
  const lr = 0.05;
  const l2 = 0.01;
  for (let epoch = 0; epoch < 400; epoch++) {
    const gW = Array.from({ length: K }, () => new Array(D).fill(0));
    const gb = new Array(K).fill(0);
    for (let i = 0; i < X.length; i++) {
      const p = softmax(logits(X[i]));
      for (let k = 0; k < K; k++) {
        const err = (p[k] - (k === y[i] ? 1 : 0)) * weight[y[i]];
        gb[k] += err;
        for (let j = 0; j < D; j++) gW[k][j] += err * X[i][j];
      }
    }
    for (let k = 0; k < K; k++) {
      b[k] -= (lr * gb[k]) / X.length;
      for (let j = 0; j < D; j++) W[k][j] -= lr * (gW[k][j] / X.length + l2 * W[k][j]);
    }
  }
  return { classes, dim: D, mean, std, W, b, predict: (e) => { const z = logits(prep(e)); return z.indexOf(Math.max(...z)); } };
}

function accuracy(set, predict) {
  let ok = 0;
  const per = classes.map(() => ({ n: 0, ok: 0 }));
  for (const d of set) {
    const t = classes.indexOf(d.cls);
    per[t].n++;
    if (predict(d.e) === t) { ok++; per[t].ok++; }
  }
  return { pct: (100 * ok) / set.length, n: set.length, per: classes.map((c, i) => c + " " + Math.round((100 * per[i].ok) / Math.max(1, per[i].n)) + "%").join(", ") };
}

const report = (name, a, b) => console.log(name.padEnd(46), ("TrashNet test " + a.pct.toFixed(1) + "% (" + a.n + ")").padEnd(30), "RealWaste test " + b.pct.toFixed(1) + "% (" + b.n + ")");

// A. The head in the app today (trained on TrashNet only).
const current = JSON.parse(readFileSync("C:/Users/Dell Latitude/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/scratch-workspaces/19f0e3ec-3aa1-482b-8ad3-f892469278d2/6897abfc-eddd-413d-a69b-19eb6750f629/scratch-2026-10-18-ba21cf/comecollectza/public/models/waste-head.json", "utf8"));
const currentPredict = (e) => {
  let n = 0; for (const v of e) n += v * v; n = Math.sqrt(n) || 1;
  const x = e.map((v, j) => (v / n - current.mean[j]) / current.std[j]);
  const z = current.W.map((row, k) => row.reduce((s, w, j) => s + w * x[j], current.b[k]));
  return z.indexOf(Math.max(...z));
};
// Classes in the app head are the same six names in the same order.
const currentClasses = current.classes;
const toIndex = (pred) => (e) => classes.indexOf(currentClasses[pred(e)]);
report("A. Head in the app today", accuracy(tnSplit.test, toIndex(currentPredict)), accuracy(rwSplit.test, toIndex(currentPredict)));

// B. Retrained on TrashNet train only (should match the 82% reported before).
const headB = train(tnSplit.train);
report("B. Retrained, TrashNet only", accuracy(tnSplit.test, headB.predict), accuracy(rwSplit.test, headB.predict));

// C. Retrained on TrashNet train plus RealWaste train.
const headC = train([...tnSplit.train, ...rwSplit.train]);
const accC_tn = accuracy(tnSplit.test, headC.predict);
const accC_rw = accuracy(rwSplit.test, headC.predict);
report("C. Retrained, TrashNet + RealWaste", accC_tn, accC_rw);
console.log("   RealWaste per class: " + accC_rw.per);

// D. RealWaste only, to see how much the real photos alone give.
const headD = train(rwSplit.train);
report("D. Retrained, RealWaste only", accuracy(tnSplit.test, headD.predict), accuracy(rwSplit.test, headD.predict));

// Confidence check for C on RealWaste: how often the top answer is right when it is at least 70% sure.
let sure = 0; let sureOk = 0;
for (const d of rwSplit.test) {
  let n = 0; for (const v of d.e) n += v * v; n = Math.sqrt(n) || 1;
  const x = d.e.map((v, j) => (v / n - headC.mean[j]) / headC.std[j]);
  const z = headC.W.map((row, k) => row.reduce((s, w, j) => s + w * x[j], headC.b[k]));
  const m = Math.max(...z); const ex = z.map((v) => Math.exp(v - m)); const t = ex.reduce((a, v) => a + v, 0);
  const p = ex.map((v) => v / t); const k = p.indexOf(Math.max(...p));
  if (p[k] >= 0.7) { sure++; if (classes[k] === d.cls) sureOk++; }
}
console.log("C at 70% sure on RealWaste: answers " + ((100 * sure) / rwSplit.test.length).toFixed(0) + "% of photos, right " + ((100 * sureOk) / Math.max(1, sure)).toFixed(0) + "% of those");

const pick = process.argv[2];
if (pick === "C") {
  writeFileSync(new URL("./head-v2.json", import.meta.url), JSON.stringify({ classes, dim: D, mean: headC.mean, std: headC.std, W: headC.W, b: headC.b }));
  console.log("wrote head-v2.json");
}
