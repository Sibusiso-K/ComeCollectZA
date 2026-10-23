// Tests mixed-load detection on 2x2 mosaics built only from held-out TrashNet photos (the head never saw them).
// Each mosaic is scored the way the app does it: the whole picture plus its four quarters.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import sharp from "sharp";
import { AutoProcessor, CLIPModel, RawImage, Tensor } from "@huggingface/transformers";

// Usage, from the vision-work folder in README.md: node mixed-test.mjs ../public/models/waste-head.json
const headPath = process.argv[2];
const head = JSON.parse(readFileSync(headPath, "utf8"));
const MODEL = "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX";
const processor = await AutoProcessor.from_pretrained(MODEL);
const model = await CLIPModel.from_pretrained(MODEL, { dtype: "int8" });
const ids = BigInt64Array.from([49406n, 320n, 1125n, 49407n]);
const dummyText = { input_ids: new Tensor("int64", ids, [1, 4]), attention_mask: new Tensor("int64", new BigInt64Array(4).fill(1n), [1, 4]) };

// Rebuild the exact held-out split from train.mjs (same file order, same seeded shuffle, same 80/20 cut).
const root = fileURLToPath(new URL("./trashnet/dataset-resized/", import.meta.url));
const classes = ["cardboard", "glass", "metal", "paper", "plastic", "trash"];
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const heldOut = {};
for (const cls of classes) {
  const g = readdirSync(join(root, cls)).filter((f) => /\.jpe?g$/i.test(f)).map((f) => join(root, cls, f));
  for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
  heldOut[cls] = g.slice(Math.floor(g.length * 0.8));
}

function score(embedding) {
  let n = 0; for (const v of embedding) n += v * v; n = Math.sqrt(n) || 1;
  const x = Array.from({ length: head.dim }, (_, j) => (embedding[j] / n - head.mean[j]) / head.std[j]);
  const logits = head.W.map((row, k) => row.reduce((s, w, j) => s + w * x[j], head.b[k]));
  const m = Math.max(...logits); const e = logits.map((z) => Math.exp(z - m)); const t = e.reduce((a, b) => a + b, 0);
  const p = e.map((v) => v / t); const k = p.indexOf(Math.max(...p));
  return { group: head.classes[k], confidence: p[k] };
}

async function classifyRaw(buf, w, h) {
  const out = await model({ ...dummyText, ...(await processor(new RawImage(new Uint8ClampedArray(buf), w, h, 3))) });
  return score(out.image_embeds.data);
}

const T = 224;
async function tile(file) { return sharp(file).resize(T, T, { fit: "cover" }).removeAlpha().raw().toBuffer(); }
async function mosaic(files) {
  const tiles = await Promise.all(files.map(tile));
  const big = await sharp({ create: { width: 2 * T, height: 2 * T, channels: 3, background: "#000" } })
    .composite(tiles.map((t, i) => ({ input: t, raw: { width: T, height: T, channels: 3 }, left: (i % 2) * T, top: Math.floor(i / 2) * T })))
    .removeAlpha().raw().toBuffer();
  if (big.length !== 4 * T * T * 3) throw new Error("mosaic buffer is " + big.length + " bytes");
  return big;
}
async function quarters(big) {
  const img = sharp(big, { raw: { width: 2 * T, height: 2 * T, channels: 3 } });
  return Promise.all([0, 1, 2, 3].map((i) => img.clone().extract({ left: (i % 2) * T, top: Math.floor(i / 2) * T, width: T, height: T }).raw().toBuffer()));
}

const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const recyclable = ["cardboard", "glass", "metal", "paper", "plastic"];

const cases = [];
for (let n = 0; n < 120; n++) { const c = pick(recyclable); cases.push({ kind: "single", truth: [c], files: [0, 1, 2, 3].map(() => pick(heldOut[c])) }); }
for (let n = 0; n < 120; n++) { const [a, b] = shuffle(recyclable.slice()); cases.push({ kind: "mixed 2+2", truth: [a, b], files: shuffle([pick(heldOut[a]), pick(heldOut[a]), pick(heldOut[b]), pick(heldOut[b])]) }); }
for (let n = 0; n < 80; n++) { const [a, b] = shuffle(recyclable.slice()); cases.push({ kind: "mixed 3+1", truth: [a, b], files: shuffle([pick(heldOut[a]), pick(heldOut[a]), pick(heldOut[a]), pick(heldOut[b])]) }); }

// Sanity check: single held-out photos through the same raw path should score about 82%.
let ok = 0;
const sample = recyclable.flatMap((c) => heldOut[c].slice(0, 20).map((f) => ({ c, f })));
for (const { c, f } of sample) { if ((await classifyRaw(await tile(f), T, T)).group === c) ok++; }
console.log(`Sanity: single held-out photos right ${ok}/${sample.length}`);

const results = [];
const t0 = Date.now();
for (const c of cases) {
  const big = await mosaic(c.files);
  const whole = await classifyRaw(big, 2 * T, 2 * T);
  const qs = [];
  for (const q of await quarters(big)) qs.push(await classifyRaw(q, T, T));
  results.push({ ...c, whole, qs });
}
const perScan = (Date.now() - t0) / cases.length;

// Rule: a material counts if it wins a quarter with at least MIN confidence. Trash never counts.
function found(r, min) {
  const groups = new Set(r.qs.filter((q) => q.confidence >= min && q.group !== "trash").map((q) => q.group));
  return [...groups];
}
for (const min of [0.5, 0.6, 0.7]) {
  console.log(`\nRule: quarter wins with >= ${min * 100}% confidence`);
  for (const kind of ["single", "mixed 2+2", "mixed 3+1"]) {
    const rs = results.filter((r) => r.kind === kind);
    if (kind === "single") {
      const falseMixed = rs.filter((r) => found(r, min).length >= 2).length;
      const right = rs.filter((r) => { const f = found(r, min); return f.length === 1 && f[0] === r.truth[0]; }).length;
      console.log(`  ${kind}: called mixed ${falseMixed}/${rs.length} (${Math.round((100 * falseMixed) / rs.length)}%), right single material ${right}/${rs.length} (${Math.round((100 * right) / rs.length)}%)`);
    } else {
      const flagged = rs.filter((r) => found(r, min).length >= 2).length;
      const both = rs.filter((r) => { const f = found(r, min); return r.truth.every((t) => f.includes(t)); }).length;
      const exact = rs.filter((r) => { const f = found(r, min); return f.length === 2 && r.truth.every((t) => f.includes(t)); }).length;
      console.log(`  ${kind}: flagged mixed ${flagged}/${rs.length} (${Math.round((100 * flagged) / rs.length)}%), found both materials ${both}/${rs.length} (${Math.round((100 * both) / rs.length)}%), exactly those two ${exact}/${rs.length} (${Math.round((100 * exact) / rs.length)}%)`);
    }
  }
}
// Variant rules on the same results.
const strongGroups = (r, second) => {
  const strong = r.qs.filter((q) => q.group !== "trash" && q.confidence >= 0.7).sort((a, b) => b.confidence - a.confidence);
  const groups = [];
  for (const q of strong) if (!groups.includes(q.group) && (groups.length === 0 || q.confidence >= second)) groups.push(q.group);
  return groups;
};
const variants = {
  "70% quarters, whole picture under 90% sure": (r) => (r.whole.confidence < 0.9 ? found(r, 0.7) : [r.whole.group]),
  "second material needs 85%": (r) => strongGroups(r, 0.85),
  "second material needs 90%": (r) => strongGroups(r, 0.9),
  "whole under 90% and second needs 85%": (r) => (r.whole.confidence >= 0.9 ? [r.whole.group] : strongGroups(r, 0.85)),
};
const pct = (a, b) => Math.round((100 * a) / b) + "%";
for (const [name, rule] of Object.entries(variants)) {
  const single = results.filter((r) => r.kind === "single");
  const m22 = results.filter((r) => r.kind === "mixed 2+2");
  const m31 = results.filter((r) => r.kind === "mixed 3+1");
  const fm = single.filter((r) => rule(r).length >= 2).length;
  const f22 = m22.filter((r) => rule(r).length >= 2).length;
  const b22 = m22.filter((r) => r.truth.every((t) => rule(r).includes(t))).length;
  const f31 = m31.filter((r) => rule(r).length >= 2).length;
  const b31 = m31.filter((r) => r.truth.every((t) => rule(r).includes(t))).length;
  console.log(`VARIANT ${name}: single called mixed ${pct(fm, 120)}; 2+2 flagged ${pct(f22, 120)}, both found ${pct(b22, 120)}; 3+1 flagged ${pct(f31, 80)}, both found ${pct(b31, 80)}`);
}
// The app's bestGuess(): trust three strongly agreeing quarters when the whole picture is under 70% sure.
function bestGuess(r) {
  if (r.whole.confidence >= 0.7) return r.whole.group;
  const strong = r.qs.filter((q) => q.group !== "trash" && q.confidence >= 0.7);
  for (const q of strong) if (strong.filter((o) => o.group === q.group).length >= 3) return q.group;
  return r.whole.group;
}
console.log(`Best guess (whole, or 3 agreeing quarters), single mosaics right: ${results.filter((r) => r.kind === "single" && bestGuess(r) === r.truth[0]).length}/120`);
console.log(`\nWhole-picture only, single mosaics right: ${results.filter((r) => r.kind === "single" && r.whole.group === r.truth[0]).length}/120`);
console.log(`Laptop time per load (5 passes): ${Math.round(perScan)} ms`);
