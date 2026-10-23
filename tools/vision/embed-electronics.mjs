// Embeds the Commons electronics photos with the same TinyCLIP int8 model and dummy text prompt the app uses.
// Usage: node embed-electronics.mjs <folder with manifest.json> <output json>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AutoProcessor, CLIPModel, RawImage, Tensor } from "@huggingface/transformers";

const MODEL = "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX";
const processor = await AutoProcessor.from_pretrained(MODEL);
const model = await CLIPModel.from_pretrained(MODEL, { dtype: "int8" });
const ids = BigInt64Array.from([49406n, 320n, 1125n, 49407n]);
const dummyText = { input_ids: new Tensor("int64", ids, [1, 4]), attention_mask: new Tensor("int64", new BigInt64Array(4).fill(1n), [1, 4]) };

function normalise(v) {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return Array.from(v, (x) => x / n);
}

const root = process.argv[2];
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const out = [];
for (const m of manifest) {
  if (m.drop) continue;
  try {
    const image = await RawImage.read(join(root, m.file));
    const o = await model({ ...dummyText, ...(await processor(image)) });
    out.push({ cls: "electronics", sub: m.group, src: m.file, e: normalise(o.image_embeds.data) });
  } catch (err) {
    console.log("skip", m.file, String(err).slice(0, 80));
  }
}
writeFileSync(process.argv[3], JSON.stringify(out));
console.log("wrote", out.length, "embeddings to", process.argv[3]);
