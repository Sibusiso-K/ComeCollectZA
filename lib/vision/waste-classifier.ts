// On-device waste material classifier. Runs entirely in the browser: photos never leave the phone.
//
// Model: TinyCLIP ViT-8M (MIT licence), int8, about 23 MB. Served by this app from /models/tinyclip/ and
// the runtime from /ort/ (see tools/vision/fetch-assets.mjs). The service worker keeps both, so after the
// first download the scanner works with no data at all.
// Head: a small linear classifier trained on TrashNet image features (public/models/waste-head.json).
// Browser only. Import this from client components, and call loadClassifier() on demand.

export type WasteGroup = "cardboard" | "glass" | "metal" | "paper" | "plastic" | "trash";

export type Prediction = {
  group: WasteGroup;
  confidence: number;
  scores: Record<WasteGroup, number>;
  ms: number;
};

export type ClassifierInput = Blob | HTMLCanvasElement;

export type Classifier = {
  classify: (input: ClassifierInput) => Promise<Prediction>;
};

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

  return {
    async classify(input) {
      const started = performance.now();
      const image = input instanceof Blob ? await RawImage.fromBlob(input) : await RawImage.fromCanvas(input);
      const pixels = await processor(image);
      const output = await model({ ...dummyText, ...pixels });
      const scores = scoreEmbedding(output.image_embeds.data as Float32Array, head);
      const best = head.classes.reduce((a, c) => (scores[c] > scores[a] ? c : a), head.classes[0]);
      return { group: best, confidence: scores[best], scores, ms: Math.round(performance.now() - started) };
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
