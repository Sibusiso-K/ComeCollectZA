// Writes the version 3 head (six material groups plus electronics) in the format the app loads.
// Usage: node export-v3.mjs <output path>
import { readFileSync, writeFileSync } from "node:fs";

const out = process.argv[2];
const h = JSON.parse(readFileSync(new URL("./head-v3.json", import.meta.url), "utf8"));
const r = (a) => a.map((x) => Math.round(x * 10000) / 10000);

const head = {
  version: 3,
  model: "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX",
  trainedOn:
    "TrashNet (MIT, 2,527 photos), RealWaste (CC BY 4.0, 4,752 real landfill photos) and 1,391 openly licensed Wikimedia Commons photos of electronics (credits in docs/ELECTRONICS_PHOTO_CREDITS.md). Held out: 81.4% on 952 RealWaste photos, 78.0% on 508 TrashNet photos, 98.2% of 282 electronics photos found.",
  classes: h.classes,
  dim: h.dim,
  mean: r(h.mean),
  std: r(h.std),
  W: h.W.map(r),
  b: r(h.b),
};
writeFileSync(out, JSON.stringify(head));
console.log("wrote", out, (JSON.stringify(head).length / 1024).toFixed(0) + " KB", "version", head.version, "classes", head.classes.join(","));
