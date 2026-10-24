// On-device waste material classifier. Runs entirely in the browser: photos never leave the phone.
//
// Model: TinyCLIP ViT-8M (MIT licence), int8, about 23 MB. Served by this app from /models/tinyclip/ and
// the runtime from /ort/ (see tools/vision/fetch-assets.mjs). The service worker keeps both, so after the
// first download the scanner works with no data at all.
// Head: a small linear classifier on TinyCLIP image features (public/models/waste-head.json), trained on TrashNet,
// RealWaste and openly licensed photos of electronics. See docs/MODELS.md.
// Browser only. Import this from client components, and call loadClassifier() on demand.

import { isBlankPhoto } from "@/lib/app/logic";

export type WasteGroup = "cardboard" | "glass" | "metal" | "paper" | "plastic" | "trash" | "electronics";

/** The error a scan throws when the photo is too dark or blank to read. */
export const BLANK_PHOTO = "BLANK_PHOTO";

export type Prediction = {
  group: WasteGroup;
  confidence: number;
  scores: Record<WasteGroup, number>;
  ms: number;
};

export type ClassifierInput = Blob | HTMLCanvasElement;

// A load is scored as a whole and as four quarters, so a mixed pile shows up as quarters that disagree.
export type LoadPrediction = {
  whole: Prediction;
  quarters: Prediction[];
  ms: number;
};

export type Classifier = {
  classify: (input: ClassifierInput) => Promise<Prediction>;
  classifyLoad: (input: ClassifierInput) => Promise<LoadPrediction>;
};

const MAX_SIDE = 448;

// Draws a photo or frame onto a canvas no bigger than MAX_SIDE, so five passes stay quick on a cheap phone.
async function toCanvas(input: ClassifierInput): Promise<HTMLCanvasElement> {
  if (input instanceof HTMLCanvasElement) return input;
  const bitmap = await createImageBitmap(input);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

// Lets the browser paint and handle taps before the next pass.
const yieldToPage = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function quartersOf(canvas: HTMLCanvasElement): HTMLCanvasElement[] {
  const w = Math.floor(canvas.width / 2);
  const h = Math.floor(canvas.height / 2);
  return [0, 1, 2, 3].map((i) => {
    const part = document.createElement("canvas");
    part.width = w;
    part.height = h;
    part.getContext("2d")?.drawImage(canvas, (i % 2) * w, Math.floor(i / 2) * h, w, h, 0, 0, w, h);
    return part;
  });
}

type Head = {
  classes: WasteGroup[];
  dim: number;
  mean: number[];
  std: number[];
  W: number[][];
  b: number[];
};

// Local folder under /models/. Source: onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX, pinned revision.
const MODEL_ID = "tinyclip";

// The combined CLIP model also wants text input. These are the CLIP token ids for "a photo"
// (start, "a", "photo", end), checked against the model's own tokenizer, so the 5 MB tokenizer is not downloaded.
const DUMMY_TOKEN_IDS = [49406, 320, 1125, 49407];

let loading: Promise<Classifier> | null = null;

// Loads the model once and shares it. onProgress receives 0 to 1 while the model file downloads.
export function loadClassifier(onProgress?: (fraction: number) => void): Promise<Classifier> {
  if (!loading) {
    loading = build(onProgress).catch((error) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

async function build(onProgress?: (fraction: number) => void): Promise<Classifier> {
  const { AutoProcessor, CLIPModel, RawImage, Tensor, env } = await import("@huggingface/transformers");
  // Everything comes from this app, never from a CDN. The service worker caches it, so the library's own cache is off.
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = "/models/";
  env.useBrowserCache = false;
  env.useWasmCache = false;
  const wasm = env.backends.onnx.wasm;
  if (wasm) {
    wasm.wasmPaths = { mjs: "/ort/ort-wasm-simd-threaded.mjs", wasm: "/ort/ort-wasm-simd-threaded.wasm" };
    wasm.numThreads = 1;
  }

  const [processor, model, head] = await Promise.all([
    AutoProcessor.from_pretrained(MODEL_ID),
    CLIPModel.from_pretrained(MODEL_ID, {
      dtype: "int8",
      progress_callback: (event: { status?: string; file?: string; progress?: number }) => {
        if (event.status === "progress" && event.file?.endsWith(".onnx") && typeof event.progress === "number") {
          onProgress?.(Math.min(1, event.progress / 100));
        }
      },
    }),
    fetch("/models/waste-head.json").then((response) => response.json() as Promise<Head>),
  ]);

  const ids = BigInt64Array.from(DUMMY_TOKEN_IDS.map(BigInt));
  const dummyText = {
    input_ids: new Tensor("int64", ids, [1, ids.length]),
    attention_mask: new Tensor("int64", new BigInt64Array(ids.length).fill(BigInt(1)), [1, ids.length]),
  };

  async function classify(input: ClassifierInput): Promise<Prediction> {
    const started = performance.now();
    const image = input instanceof Blob ? await RawImage.fromBlob(input) : await RawImage.fromCanvas(input);
    const pixels = await processor(image);
    const output = await model({ ...dummyText, ...pixels });
    const scores = scoreEmbedding(output.image_embeds.data as Float32Array, head);
    const best = head.classes.reduce((a, c) => (scores[c] > scores[a] ? c : a), head.classes[0]);
    return { group: best, confidence: scores[best], scores, ms: Math.round(performance.now() - started) };
  }

  // One load at a time. A scan that was cancelled keeps running to the end, so a new photo waits for it rather than
  // sharing the model with it.
  let queue: Promise<unknown> = Promise.resolve();
  async function scoreLoad(input: ClassifierInput): Promise<LoadPrediction> {
    const started = performance.now();
    const canvas = await toCanvas(input);
    const ctx = canvas.getContext("2d");
    if (ctx && isBlankPhoto(ctx.getImageData(0, 0, canvas.width, canvas.height).data)) throw new Error(BLANK_PHOTO);
    await yieldToPage();
    const whole = await classify(canvas);
    const quarters: Prediction[] = [];
    for (const part of quartersOf(canvas)) {
      // The model runs on the page's own thread. Without a break between passes, all five run as one task and the
      // screen cannot respond (not even to Cancel) until the scan ends, which takes seconds on a cheap phone.
      await yieldToPage();
      quarters.push(await classify(part));
    }
    return { whole, quarters, ms: Math.round(performance.now() - started) };
  }

  return {
    classify,
    classifyLoad(input) {
      const run = queue.then(() => scoreLoad(input));
      queue = run.catch(() => undefined);
      return run;
    },
  };
}

// Normalise, standardise with the training statistics, apply the linear head, then softmax.
function scoreEmbedding(embedding: Float32Array, head: Head): Record<WasteGroup, number> {
  let norm = 0;
  for (let j = 0; j < embedding.length; j++) norm += embedding[j] * embedding[j];
  norm = Math.sqrt(norm) || 1;

  const x = new Array<number>(head.dim);
  for (let j = 0; j < head.dim; j++) x[j] = (embedding[j] / norm - head.mean[j]) / head.std[j];

  const logits = head.W.map((row, k) => {
    let sum = head.b[k];
    for (let j = 0; j < head.dim; j++) sum += row[j] * x[j];
    return sum;
  });
  const max = Math.max(...logits);
  const exp = logits.map((z) => Math.exp(z - max));
  const total = exp.reduce((a, v) => a + v, 0);

  const scores = {} as Record<WasteGroup, number>;
  head.classes.forEach((group, k) => {
    scores[group] = exp[k] / total;
  });
  return scores;
}
