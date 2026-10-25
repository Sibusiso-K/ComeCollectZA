// The scanner head: turns TinyCLIP's 512 image features into a score for each material group.
// Pure maths with no browser parts, so the app checks (tools/tests/summary.mjs) can run it against the trained head.

export type WasteGroup = "cardboard" | "glass" | "metal" | "paper" | "plastic" | "trash" | "electronics";

/** public/models/waste-head.json. Version 7 adds one hidden layer, stored in base64 as whole numbers from -127 to 127
 * with one scale per hidden unit, to keep the download small. Earlier versions are linear: W and b only. */
export type HeadFile = {
  version?: number;
  classes: WasteGroup[];
  dim: number;
  mean: number[];
  std: number[];
  hidden?: number;
  W1q?: string;
  W1scale?: number[];
  b1?: number[];
  W: number[][];
  b: number[];
};

export type Head = HeadFile & { W1: Float32Array | null };

/** Unpacks the hidden layer once, when the head loads. */
export function prepareHead(file: HeadFile, decodeBase64: (s: string) => string = atob): Head {
  if (!file.W1q || !file.W1scale || !file.b1 || !file.hidden) return { ...file, W1: null };
  const bytes = Int8Array.from(decodeBase64(file.W1q), (c) => c.charCodeAt(0));
  if (bytes.length !== file.hidden * file.dim) throw new Error("Scanner head is damaged");
  const W1 = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) W1[i] = bytes[i] * file.W1scale[Math.floor(i / file.dim)];
  return { ...file, W1 };
}

/** Normalise, standardise with the training statistics, run the head, then softmax. */
export function scoreEmbedding(embedding: ArrayLike<number>, head: Head): Record<WasteGroup, number> {
  let norm = 0;
  for (let j = 0; j < head.dim; j++) norm += embedding[j] * embedding[j];
  norm = Math.sqrt(norm) || 1;

  let x = new Array<number>(head.dim);
  for (let j = 0; j < head.dim; j++) x[j] = (embedding[j] / norm - head.mean[j]) / head.std[j];

  if (head.W1 && head.b1 && head.hidden) {
    const h = new Array<number>(head.hidden);
    for (let u = 0; u < head.hidden; u++) {
      let sum = head.b1[u];
      const row = u * head.dim;
      for (let j = 0; j < head.dim; j++) sum += head.W1[row + j] * x[j];
      h[u] = sum > 0 ? sum : 0;
    }
    x = h;
  }

  const logits = head.W.map((row, k) => {
    let sum = head.b[k];
    for (let j = 0; j < row.length; j++) sum += row[j] * x[j];
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
