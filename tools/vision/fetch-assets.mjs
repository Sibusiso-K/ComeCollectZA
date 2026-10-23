// Puts the scanner's model and runtime under public/ so the app serves them itself.
// Runs before every build (npm run prebuild). Files are checked by SHA-256 and skipped when already present.
// Output (git-ignored): public/models/tinyclip/ and public/ort/.
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

const REPO = "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX";
const REVISION = "9463a9c508a344c837ffefe9d724f3827bf2dc79";
const MODEL_DIR = "public/models/tinyclip";

// Only what the image path needs. The tokenizer is skipped: the dummy text prompt is hard-coded as token ids.
const MODEL_FILES = [
  { path: "config.json" },
  { path: "preprocessor_config.json" },
  { path: "onnx/model_int8.onnx", sha256: "844d1a46ab18acf50c989e541b12fe3b6dc7f8d6004725b4e992d142788e0600" },
];

// The plain SIMD build (14 MB) is enough for the WebAssembly backend. The default asyncify build is 27 MB.
const ORT_FILES = ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"];

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function fetchModelFile({ path, sha256: expected }) {
  const target = join(MODEL_DIR, path);
  if (existsSync(target) && (!expected || sha256(await readFile(target)) === expected)) return "kept";
  const response = await fetch(`https://huggingface.co/${REPO}/resolve/${REVISION}/${path}`);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (expected && sha256(buffer) !== expected) throw new Error(`${path}: SHA-256 does not match`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return "downloaded";
}

await mkdir("public/ort", { recursive: true });
for (const name of ORT_FILES) {
  await copyFile(join("node_modules/onnxruntime-web/dist", name), join("public/ort", name));
}
for (const file of MODEL_FILES) {
  console.log(`scanner asset ${file.path}: ${await fetchModelFile(file)}`);
}
console.log("scanner runtime copied to public/ort");
