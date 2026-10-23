// Writes a smaller copy of the trained head into the app's public folder. Usage: node export-head.mjs <output path>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const out = process.argv[2];
const h = JSON.parse(readFileSync(new URL("./head.json", import.meta.url), "utf8"));
const r = (a) => a.map((x) => Math.round(x * 10000) / 10000);

const head = {
  version: 1,
  model: "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX",
  trainedOn: "TrashNet (MIT), 2019 photos. 82% on 508 held-out photos.",
  classes: h.classes,
  dim: h.dim,
  mean: r(h.mean),
  std: r(h.std),
  W: h.W.map(r),
  b: r(h.b),
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(head));
console.log("wrote", out, (JSON.stringify(head).length / 1024).toFixed(0) + " KB", "classes", head.classes.join(","), "dim", head.dim);
