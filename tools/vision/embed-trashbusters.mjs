// Embeds the recyclable photos from TrashBusters/combined (MIT) with the app's TinyCLIP model.
// Photos are in <root>/<source>/<label>/<file>. manifest.json holds the context (real_world or default) and the split.
// Usage: node embed-trashbusters.mjs <photos folder> <output json>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AutoProcessor, CLIPModel, RawImage, Tensor } from "@huggingface/transformers";

const MODEL = "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX";
const processor = await AutoProcessor.from_pretrained(MODEL);
const model = await CLIPModel.from_pretrained(MODEL, { dtype: "int8" });
const ids = BigInt64Array.from([49406n, 320n, 1125n, 49407n]);
const dummyText = { input_ids: new Tensor("int64", ids, [1, 4]), attention_mask: new Tensor("int64", new BigInt64Array(4).fill(1n), [1, 4]) };
const normalise = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return Array.from(v, (x) => x / n); };

const root = process.argv[2];
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const out = [];
const t0 = Date.now();
for (let i = 0; i < manifest.length; i++) {
  const m = manifest[i];
  try {
    const image = await RawImage.read(join(root, m.file));
    const o = await model({ ...dummyText, ...(await processor(image)) });
    out.push({ cls: m.label, source: m.source, context: m.context ?? "default", src: m.file, e: normalise(o.image_embeds.data) });
  } catch (err) { console.log("skip", m.file, String(err).slice(0, 60)); }
  if ((i + 1) % 500 === 0) console.log(i + 1, "of", manifest.length, ((Date.now() - t0) / 1000).toFixed(0) + " s");
}
writeFileSync(process.argv[3], JSON.stringify(out));
console.log("wrote", out.length);
