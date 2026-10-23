// Embeds every RealWaste photo with the same TinyCLIP int8 model and dummy text prompt the app uses.
// RealWaste (UCI, CC BY 4.0): real landfill photos. Its nine classes are mapped to the six app groups.
import { readdirSync, writeFileSync, statSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { AutoProcessor, CLIPModel, RawImage, Tensor } from "@huggingface/transformers";

const MODEL = "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX";
const processor = await AutoProcessor.from_pretrained(MODEL);
const model = await CLIPModel.from_pretrained(MODEL, { dtype: "int8" });
const ids = BigInt64Array.from([49406n, 320n, 1125n, 49407n]);
const dummyText = { input_ids: new Tensor("int64", ids, [1, 4]), attention_mask: new Tensor("int64", new BigInt64Array(4).fill(1n), [1, 4]) };

const MAP = {
  "Cardboard": "cardboard",
  "Glass": "glass",
  "Metal": "metal",
  "Paper": "paper",
  "Plastic": "plastic",
  "Miscellaneous Trash": "trash",
  "Textile Trash": "trash",
  "Food Organics": "trash",
  "Vegetation": "trash",
};

function normalise(v) {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return Array.from(v, (x) => x / n);
}

const root = process.argv[2];
const files = [];
for (const dir of readdirSync(root, { withFileTypes: true })) {
  if (!dir.isDirectory() || !MAP[dir.name]) continue;
  const stack = [join(root, dir.name)];
  while (stack.length) {
    const here = stack.pop();
    for (const entry of readdirSync(here, { withFileTypes: true })) {
      const p = join(here, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (/\.(jpe?g|png)$/i.test(entry.name)) files.push({ cls: MAP[dir.name], file: p });
    }
  }
}
console.log("images", files.length);

const out = [];
const t0 = Date.now();
for (let i = 0; i < files.length; i++) {
  try {
    const image = await RawImage.read(files[i].file);
    const inputs = await processor(image);
    const o = await model({ ...dummyText, ...inputs });
    out.push({ cls: files[i].cls, src: basename(files[i].file), e: normalise(o.image_embeds.data) });
  } catch (err) {
    console.log("skip", files[i].file, String(err).slice(0, 80));
  }
  if ((i + 1) % 250 === 0) console.log(i + 1, ((Date.now() - t0) / 1000).toFixed(0) + " s");
}
writeFileSync(process.argv[3], JSON.stringify(out));
console.log("wrote", out.length, "embeddings to", process.argv[3]);
