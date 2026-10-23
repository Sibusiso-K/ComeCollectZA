// Turns every image into TinyCLIP image features and the class prompts into text features. Saves both as JSON.
import { readdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { AutoProcessor, AutoTokenizer, CLIPModel, RawImage } from "@huggingface/transformers";

const MODEL = "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX";
const processor = await AutoProcessor.from_pretrained(MODEL);
const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
const model = await CLIPModel.from_pretrained(MODEL, { dtype: "int8" });

const dummyText = tokenizer(["a photo"], { padding: true, truncation: true });

function normalise(v) {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return Array.from(v, (x) => x / n);
}

async function imageEmbedding(path) {
  const image = await RawImage.read(path);
  const inputs = await processor(image);
  const out = await model({ ...dummyText, ...inputs });
  return normalise(out.image_embeds.data);
}

async function textEmbeddings(prompts) {
  const inputs = tokenizer(prompts, { padding: true, truncation: true });
  const dummyImage = await processor(await RawImage.read(fileURLToPath(new URL("./images/CAN_AL_0.jpg", import.meta.url))));
  const out = await model({ ...inputs, pixel_values: dummyImage.pixel_values });
  const dim = out.text_embeds.dims[1];
  return prompts.map((_, i) => normalise(out.text_embeds.data.slice(i * dim, (i + 1) * dim)));
}

// TrashNet
const root = fileURLToPath(new URL("./trashnet/dataset-resized/", import.meta.url));
const classes = ["cardboard", "glass", "metal", "paper", "plastic", "trash"];
const items = [];
const t0 = Date.now();
for (const cls of classes) {
  const files = readdirSync(join(root, cls)).filter((f) => /\.jpe?g$/i.test(f));
  for (const f of files) items.push({ cls, file: join(root, cls, f) });
}
console.log("images", items.length);
const trashnet = [];
let i = 0;
for (const it of items) {
  trashnet.push({ cls: it.cls, e: await imageEmbedding(it.file) });
  if (++i % 250 === 0) console.log(i, ((Date.now() - t0) / 1000).toFixed(0) + " s");
}
writeFileSync(new URL("./emb_trashnet.json", import.meta.url), JSON.stringify(trashnet));

// Wikimedia test photos
const manifest = JSON.parse(readFileSync(new URL("./manifest.json", import.meta.url), "utf8"));
const wild = [];
for (const m of manifest) {
  wild.push({ material: m.material, file: m.file, e: await imageEmbedding(fileURLToPath(new URL("./images/" + m.file, import.meta.url))) });
}
writeFileSync(new URL("./emb_wild.json", import.meta.url), JSON.stringify(wild));

// Zero-shot prompts for TrashNet's six classes
const prompts = {
  cardboard: "a photo of cardboard",
  glass: "a photo of a glass bottle or jar",
  metal: "a photo of a metal can",
  paper: "a photo of paper",
  plastic: "a photo of a plastic bottle",
  trash: "a photo of rubbish",
};
const text = await textEmbeddings(classes.map((c) => prompts[c]));
writeFileSync(new URL("./emb_text.json", import.meta.url), JSON.stringify({ classes, prompts, text }));
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + " s, dim " + trashnet[0].e.length);
