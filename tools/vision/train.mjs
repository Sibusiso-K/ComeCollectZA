// Trains a softmax classifier head on TinyCLIP image features and compares it with zero-shot matching.
import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("./emb_trashnet.json", import.meta.url), "utf8"));
const wild = JSON.parse(readFileSync(new URL("./emb_wild.json", import.meta.url), "utf8"));
const { classes, text } = JSON.parse(readFileSync(new URL("./emb_text.json", import.meta.url), "utf8"));
const K = classes.length;
const D = data[0].e.length;

// Seeded shuffle so the split is repeatable.
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const byClass = classes.map((c) => data.filter((d) => d.cls === c));
const train = [];
const test = [];
for (const group of byClass) {
  const g = group.slice();
  for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
  const cut = Math.floor(g.length * 0.8);
  train.push(...g.slice(0, cut));
  test.push(...g.slice(cut));
}
console.log("train", train.length, "test", test.length);

// Standardise using training statistics only.
const mean = new Array(D).fill(0);
const std = new Array(D).fill(0);
for (const d of train) for (let j = 0; j < D; j++) mean[j] += d.e[j] / train.length;
for (const d of train) for (let j = 0; j < D; j++) std[j] += (d.e[j] - mean[j]) ** 2 / train.length;
for (let j = 0; j < D; j++) std[j] = Math.sqrt(std[j]) || 1;
const prep = (e) => e.map((x, j) => (x - mean[j]) / std[j]);

const X = train.map((d) => prep(d.e));
const y = train.map((d) => classes.indexOf(d.cls));
const W = Array.from({ length: K }, () => new Array(D).fill(0));
const b = new Array(K).fill(0);
// Balance classes so the small "trash" class is not ignored.
const counts = new Array(K).fill(0);
for (const c of y) counts[c]++;
const weight = counts.map((c) => train.length / (K * c));

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

function evaluate(set, predict, label) {
  const per = classes.map(() => ({ n: 0, ok: 0 }));
  const conf = {};
  let ok = 0;
  for (const d of set) {
    const t = classes.indexOf(d.cls);
    const p = predict(d.e);
    per[t].n++;
    if (p === t) { per[t].ok++; ok++; } else { const k = classes[t] + " -> " + classes[p]; conf[k] = (conf[k] ?? 0) + 1; }
  }
  console.log("\n" + label + ": " + ok + "/" + set.length + " = " + ((100 * ok) / set.length).toFixed(1) + "%");
  console.log("  " + per.map((p, i) => classes[i] + " " + p.ok + "/" + p.n).join("  "));
  console.log("  top confusions: " + Object.entries(conf).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => k + " x" + v).join(", "));
}

const argmax = (z) => z.indexOf(Math.max(...z));
const headPredict = (e) => argmax(logits(prep(e)));
const zeroShot = (e) => argmax(text.map((t) => t.reduce((a, v, j) => a + v * e[j], 0)));

evaluate(test, zeroShot, "ZERO-SHOT on held-out TrashNet photos");
evaluate(test, headPredict, "TRAINED HEAD on held-out TrashNet photos");

// Confidence behaviour: how accurate is the head when it is confident?
const scored = test.map((d) => { const p = softmax(logits(prep(d.e))); const k = argmax(p); return { conf: p[k], ok: classes[k] === d.cls }; });
for (const th of [0.5, 0.7, 0.9]) {
  const kept = scored.filter((s) => s.conf >= th);
  console.log("confidence >= " + th + ": answers " + kept.length + "/" + scored.length + " (" + ((100 * kept.length) / scored.length).toFixed(0) + "%), correct " + ((100 * kept.filter((s) => s.ok).length) / Math.max(1, kept.length)).toFixed(0) + "%");
}

// The noisy Wikimedia photos, grouped to TrashNet classes. Treat as a rough guide only, because many labels are wrong.
const toGroup = { CAN_AL: "metal", PET: "plastic", HDPE: "plastic", CARDBOARD: "cardboard", GLASS: "glass", PAPER_WHITE: "paper" };
const wildSet = wild.map((w) => ({ cls: toGroup[w.material], e: w.e }));
evaluate(wildSet, zeroShot, "ZERO-SHOT on noisy web photos (grouped)");
evaluate(wildSet, headPredict, "TRAINED HEAD on noisy web photos (grouped)");

writeFileSync(new URL("./head.json", import.meta.url), JSON.stringify({ classes, dim: D, mean, std, W, b }));
console.log("\nsaved head.json");
