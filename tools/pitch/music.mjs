// Original 20-second music bed for the pitch video, synthesised from scratch (no samples, nothing to license).
// 0 to 6.3 s: the problem. Sparse minor piano over a low pulse.
// 6.0 to 6.3 s: a noise riser into the solution.
// 6.3 to 17.4 s: the solution. Major progression (C, G, Am, F) at 100 BPM with kick, clap, hats, bass and a pluck arpeggio.
// 17.4 to 20 s: the end card. One warm C major chord, fading out.
import { writeFileSync } from "node:fs";

const SR = 44100;
const LEN = 20;
const N = SR * LEN;
const L = new Float32Array(N);
const R = new Float32Array(N);
const BPM = 100;
const BEAT = 60 / BPM;
const SOL = 6.3;
const END = 17.4;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

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

// Piano-like pluck: a few harmonics with fast decay.
const piano = (f, d = 1.2) => (t) => env(t, 0.005, d) * (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) + 0.12 * Math.sin(6 * Math.PI * f * t));
// Soft pad: detuned sines with a slow swell.
const pad = (notes, len) => (t) => {
  const a = Math.min(1, t / 0.8) * Math.min(1, (len - t) / 0.6);
  let v = 0;
  for (const m of notes) { const f = hz(m); v += Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.003 * t) * 0.8; }
  return (a * v) / notes.length;
};
const kick = (t) => Math.exp(-t / 0.12) * Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-t / 0.03)) * t);
let seed = 7;
const noise = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
const clap = (t) => Math.exp(-t / 0.09) * noise() * (t < 0.012 || (t > 0.02 && t < 0.03) || t > 0.04 ? 1 : 0.3);
const hat = (t) => Math.exp(-t / 0.025) * noise();
const bass = (f, d) => (t) => env(t, 0.01, d) * Math.tanh(2 * Math.sin(2 * Math.PI * f * t));

// ---- Problem: A minor, sparse.
add(0, SOL + 0.3, pad([57, 60, 64], SOL + 0.3), 0.12);
const melody = [69, 72, 76, 72, 69, 67, 64, 67];
melody.forEach((m, i) => add(0.4 + i * 0.72, 2.2, piano(hz(m), 1.0), 0.16, i % 2 ? 0.3 : -0.3));
for (let t = 0.0; t < SOL - 0.2; t += BEAT * 2) add(t, 0.5, (x) => Math.exp(-x / 0.18) * Math.sin(2 * Math.PI * 55 * x), 0.35);

// ---- Riser into the solution.
add(SOL - 1.4, 1.4, (t) => (t / 1.4) ** 2.5 * noise() * 0.6 + (t / 1.4) ** 3 * Math.sin(2 * Math.PI * (200 + 600 * (t / 1.4)) * t) * 0.15, 0.5);

// ---- Solution: C G Am F, one chord per bar (4 beats).
const chords = [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]];
const bar = BEAT * 4;
let c = 0;
for (let t = SOL; t < END - 0.01; t += bar, c++) {
  const ch = chords[c % 4];
  const len = Math.min(bar, END - t) + 0.3;
  add(t, len, pad(ch.slice(1), len), 0.13);
  for (let b = 0; b < 4 && t + b * BEAT < END; b++) {
    add(t + b * BEAT, 0.6, kick, 0.55);
    if (b % 2 === 1) add(t + b * BEAT, 0.25, clap, 0.22, 0.1);
    add(t + b * BEAT + BEAT / 2, 0.08, hat, 0.08, 0.4);
    add(t + b * BEAT, BEAT * 0.9, bass(hz(ch[0]), 0.5), 0.18);
  }
  // Pluck arpeggio in eighths.
  const arp = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12];
  for (let k = 0; k < 8 && t + (k * BEAT) / 2 < END; k++) add(t + (k * BEAT) / 2, 0.6, piano(hz(arp[k % 4]), 0.25), 0.1, k % 2 ? 0.45 : -0.45);
}
// Impact on the first beat of the solution.
add(SOL, 1.2, (t) => Math.exp(-t / 0.35) * noise() * 0.5 + kick(t), 0.45);

// ---- End card: C major, fading out.
add(END, LEN - END, pad([48, 60, 64, 67, 72], LEN - END + 0.1), 0.22);
add(END, LEN - END, piano(hz(72), 1.8), 0.2);
add(END, LEN - END, piano(hz(76), 1.8), 0.14, 0.3);
add(END, 0.8, kick, 0.5);

// Master: fade in and out, soft limit, normalise to -1 dBFS peak.
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const g = Math.min(1, t / 0.3) * Math.min(1, (LEN - t) / 1.5);
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
writeFileSync(new URL("./music.wav", import.meta.url), buf);
console.log("wrote music.wav", LEN, "s");
