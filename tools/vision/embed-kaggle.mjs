// Embeds the Kaggle e-waste photos (akshat103/e-waste-image-dataset, Apache-2.0) with the app's TinyCLIP model.
// Every class is an electronic item, so all of them are labelled "electronics". The sub label is the original class
// and the split is the folder it came in (train, val or test). Usage: node embed-kaggle.mjs <dataset root> <output json>
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AutoProcessor, CLIPModel, RawImage, Tensor } from "@huggingface/transformers";

const MODEL = "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX";
const processor = await AutoProcessor.from_pretrained(MODEL);
const model = await CLIPModel.from_pretrained(MODEL, { dtype: "int8" });
const ids = BigInt64Array.from([49406n, 320n, 1125n, 49407n]);
const dummyText = { input_ids: new Tensor("int64", ids, [1, 4]), attention_mask: new Tensor("int64", new BigInt64Array(4).fill(1n), [1, 4]) };
const normalise = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return Array.from(v, (x) => x / n); };

const root = process.argv[2];
const out = [];
for (const split of ["train", "val", "test"]) {
  for (const cls of readdirSync(join(root, split))) {
    for (const f of readdirSync(join(root, split, cls))) {
      if (!/\.(jpe?g|png)$/i.test(f)) continue;
      try {
        const image = await RawImage.read(join(root, split, cls, f));
        const o = await model({ ...dummyText, ...(await processor(image)) });
        out.push({ cls: "electronics", sub: cls, split, src: `${split}/${cls}/${f}`, e: normalise(o.image_embeds.data) });
      } catch (err) { console.log("skip", f, String(err).slice(0, 60)); }
    }
  }
  console.log(split, out.length);
}
writeFileSync(process.argv[3], JSON.stringify(out));
console.log("wrote", out.length);
