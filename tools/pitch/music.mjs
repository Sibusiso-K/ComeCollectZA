// Music bed for the final pitch video, built around the recorded voice.
// Notes and chords land on the start of each spoken line. Calm tempo (84 BPM) with a soft pulse only in the
// solution and value sections, so it never rushes the voice. The mix ducks it further under speech.
// Everything is synthesised here from scratch (no samples, nothing to license).
import { writeFileSync } from "node:fs";

const SR = 44100;
const LEN = 19.6;
const N = Math.round(SR * LEN);
const L = new Float32Array(N);
const R = new Float32Array(N);
// Line starts on the final timeline (seconds). L3 begins the solution, L7 the end card.
const S = [0.4, 3.45, 5.95, 9.18, 10.97, 13.42, 15.16];
const SOL = 5.7;
const END = 14.9;
const BEAT = 60 / 84;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

function add(t0, dur, fn, gain = 1, pan = 0) {
  const s0 = Math.floor(t0 * SR);
  const n = Math.floor(dur * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < n && s0 + i < N; i++) {
    if (s0 + i < 0) continue;
    const v = fn(i / SR);
    L[s0 + i] += v * gl;
    R[s0 + i] += v * gr;
  }
}
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
const piano = (f, d = 1.4) => (t) => env(t, 0.006, d) * (Math.sin(2 * Math.PI * f * t) + 0.32 * Math.sin(4 * Math.PI * f * t) + 0.1 * Math.sin(6 * Math.PI * f * t));
const pad = (notes, len) => (t) => {
  const a = Math.min(1, t / 0.7) * Math.min(1, (len - t) / 0.7);
  let v = 0;
  for (const m of notes) { const f = hz(m); v += Math.sin(2 * Math.PI * f * t) + 0.8 * Math.sin(2 * Math.PI * f * 1.003 * t); }
  return (a * v) / notes.length;
};
const kick = (t) => Math.exp(-t / 0.14) * Math.sin(2 * Math.PI * (48 + 80 * Math.exp(-t / 0.035)) * t);
let seed = 11;
const noise = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
const hat = (t) => Math.exp(-t / 0.03) * noise();
const bass = (f, d) => (t) => env(t, 0.012, d) * Math.tanh(1.8 * Math.sin(2 * Math.PI * f * t));

// One chord per line: Am, F (the tension), then C, G, Am, F, and C to finish on.
const chords = [
  [57, 60, 64], [53, 57, 60], [48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69], [48, 60, 64, 67, 72],
];
const tops = [76, 72, 79, 74, 76, 72, 79]; // the single note that rings at the start of each line
const roots = [45, 41, 48, 43, 45, 41, 48];

S.forEach((t, i) => {
  const next = i + 1 < S.length ? S[i + 1] : LEN;
  const len = next - t + 0.5;
  add(t - 0.05, len, pad(chords[i], len), i === 6 ? 0.2 : 0.13);
  add(t, 2.2, piano(hz(tops[i]), 1.2), i >= 2 ? 0.17 : 0.14, i % 2 ? 0.3 : -0.3);
  add(t, Math.min(len, 1.6), bass(hz(roots[i] - 12), 0.7), 0.17);
});
// A second, higher note in the middle of each solution line, so the melody moves with the words.
[7.2, 10.0, 11.9, 14.1].forEach((t, i) => add(t, 1.2, piano(hz([84, 79, 83, 81][i]), 0.7), 0.1, i % 2 ? -0.4 : 0.4));

// Slow, soft pulse through the solution and value sections only.
for (let t = SOL + 0.25; t < END - 0.2; t += BEAT) {
  add(t, 0.5, kick, 0.3);
  add(t + BEAT / 2, 0.08, hat, 0.05, 0.4);
}
// Riser into the solution, and a soft impact when the solution begins.
add(SOL - 1.3, 1.3, (t) => (t / 1.3) ** 2.5 * noise() * 0.45 + (t / 1.3) ** 3 * Math.sin(2 * Math.PI * (180 + 500 * (t / 1.3)) * t) * 0.12, 0.45);
add(SOL, 1.0, (t) => Math.exp(-t / 0.3) * noise() * 0.3 + kick(t), 0.35);
// The end card: one warm chord, a kick, and a long fade.
add(S[6], 0.9, kick, 0.4);

let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const g = Math.min(1, t / 0.3) * Math.min(1, (LEN - t) / 2.0);
  L[i] = Math.tanh(L[i] * g * 1.2);
  R[i] = Math.tanh(R[i] * g * 1.2);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const k = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * k * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * k * 32767), 46 + i * 4); }
writeFileSync(new URL("./music3.wav", import.meta.url), buf);
console.log("wrote music3.wav", LEN, "s");
