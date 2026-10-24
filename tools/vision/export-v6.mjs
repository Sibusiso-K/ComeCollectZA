// Writes the version 5 head (six material groups plus electronics) in the format the app loads.
// Usage: node export-v3.mjs <output path>
import { readFileSync, writeFileSync } from "node:fs";

const out = process.argv[2];
const h = JSON.parse(readFileSync(new URL("./head-v5.json", import.meta.url), "utf8"));
const r = (a) => a.map((x) => Math.round(x * 10000) / 10000);

const head = {
  version: 6,
  model: "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX",
  trainedOn:
    "TrashNet (MIT), RealWaste (CC BY 4.0), 28,114 recycling photos from TrashBusters/combined (MIT, three public datasets), 1,826 openly licensed Wikimedia Commons electronics photos and the Kaggle e-waste set (Apache-2.0). Held out: 80.6% RealWaste, 76.6% TrashNet, 75.8% on the mixed recycling photos (69.1% real-world), 98.7% Kaggle electronics found.",
  classes: h.classes,
  dim: h.dim,
  mean: r(h.mean),
  std: r(h.std),
  W: h.W.map(r),
  b: r(h.b),
};
writeFileSync(out, JSON.stringify(head));
console.log("wrote", out, (JSON.stringify(head).length / 1024).toFixed(0) + " KB", "version", head.version, "classes", head.classes.join(","));
