import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pipeline } from "@huggingface/transformers";

const manifest = JSON.parse(readFileSync(new URL("./manifest.json", import.meta.url), "utf8"));

// One phrase per material. The model picks the phrase that best matches the photo.
const PROMPTS = {
  CAN_AL: "a pile of crushed aluminium drink cans",
  PET: "a pile of clear plastic drink bottles",
  CARDBOARD: "flattened brown cardboard boxes",
  GLASS: "glass bottles and jars",
  PAPER_WHITE: "a stack of white paper",
  HDPE: "white plastic milk jugs and detergent bottles",
};
const labels = Object.values(PROMPTS);
const byLabel = Object.fromEntries(Object.entries(PROMPTS).map(([k, v]) => [v, k]));

const candidates = [
  { id: "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX", dtype: "int8" },
  { id: "Xenova/clip-vit-base-patch32", dtype: "q8" },
];

for (const { id, dtype } of candidates) {
  console.log("\n=== " + id + " (" + dtype + ")");
  const t0 = Date.now();
  const classify = await pipeline("zero-shot-image-classification", id, { dtype });
  console.log("load " + ((Date.now() - t0) / 1000).toFixed(1) + " s");

  const perClass = {};
  const confusion = {};
  let correct = 0;
  let totalMs = 0;
  for (const item of manifest) {
    const t = Date.now();
    const out = await classify(fileURLToPath(new URL("./images/" + item.file, import.meta.url)), labels, { hypothesis_template: "{}" });
    totalMs += Date.now() - t;
    const pred = byLabel[out[0].label];
    perClass[item.material] ??= { n: 0, ok: 0 };
    perClass[item.material].n++;
    if (pred === item.material) { perClass[item.material].ok++; correct++; }
    else { const k = item.material + " -> " + pred; confusion[k] = (confusion[k] ?? 0) + 1; }
  }
  console.log("accuracy " + correct + "/" + manifest.length + " = " + ((100 * correct) / manifest.length).toFixed(0) + "%");
  console.log("avg time " + (totalMs / manifest.length).toFixed(0) + " ms per photo (Node CPU)");
  for (const [k, v] of Object.entries(perClass)) console.log("  " + k.padEnd(12) + v.ok + "/" + v.n);
  console.log("top confusions:", Object.entries(confusion).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => k + " x" + v).join(", "));
}
