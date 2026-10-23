// Writes the combined head (TrashNet plus RealWaste) in the format the app loads. Usage: node export-v2.mjs <output path>
import { readFileSync, writeFileSync } from "node:fs";

const out = process.argv[2];
const h = JSON.parse(readFileSync(new URL("./head-v2.json", import.meta.url), "utf8"));
const r = (a) => a.map((x) => Math.round(x * 10000) / 10000);

const head = {
  version: 2,
  model: "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX",
  trainedOn: "TrashNet (MIT, 2,527 photos of single items) and RealWaste (CC BY 4.0, 4,752 real landfill photos). 81.7% on 952 held-out RealWaste photos, 78.9% on 508 held-out TrashNet photos.",
  classes: h.classes,
  dim: h.dim,
  mean: r(h.mean),
  std: r(h.std),
  W: h.W.map(r),
  b: r(h.b),
};
writeFileSync(out, JSON.stringify(head));
console.log("wrote", out, (JSON.stringify(head).length / 1024).toFixed(0) + " KB", "version", head.version, "classes", head.classes.join(","));
