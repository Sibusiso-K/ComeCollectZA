// Music bed for the voiced demo video, built around the recorded voice. Same approach as tools/pitch/music.mjs:
// everything is synthesised here from scratch (no samples, nothing to license), and the mix ducks it under speech.
// A chord and a ringing note land on the start of each spoken group. A soft pulse runs from the scan to the close.
import { writeFileSync } from "node:fs";

const SR = 44100;

export function writeMusic(path, LEN, starts, pulseFrom, pulseTo) {
  const N = Math.round(SR * LEN);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
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

  // Am, F, C, G, round and round, ending on a full C.
  const progression = [
    { chord: [57, 60, 64], top: 76, root: 45 },
    { chord: [53, 57, 60], top: 72, root: 41 },
    { chord: [48, 60, 64, 67], top: 79, root: 48 },
    { chord: [43, 59, 62, 67], top: 74, root: 43 },
  ];
  const last = starts.length - 1;
  starts.forEach((t, i) => {
    const next = i < last ? starts[i + 1] : LEN;
    const len = next - t + 0.5;
    const p = i === last ? { chord: [48, 60, 64, 67, 72], top: 79, root: 48 } : progression[i % 4];
    add(t - 0.05, len, pad(p.chord, len), i === last ? 0.2 : 0.13);
    add(t, 2.2, piano(hz(p.top), 1.2), i >= 2 ? 0.17 : 0.14, i % 2 ? 0.3 : -0.3);
    add(t, Math.min(len, 1.6), bass(hz(p.root - 12), 0.7), 0.17);
  });

  // Slow, soft pulse from the scan to just before the close.
  for (let t = pulseFrom + 0.25; t < pulseTo - 0.2; t += BEAT) {
    add(t, 0.5, kick, 0.3);
    add(t + BEAT / 2, 0.08, hat, 0.05, 0.4);
  }
  // Riser into the scan, where the product starts, and a soft impact on it.
  add(pulseFrom - 1.3, 1.3, (t) => (t / 1.3) ** 2.5 * noise() * 0.45 + (t / 1.3) ** 3 * Math.sin(2 * Math.PI * (180 + 500 * (t / 1.3)) * t) * 0.12, 0.45);
  add(pulseFrom, 1.0, (t) => Math.exp(-t / 0.3) * noise() * 0.3 + kick(t), 0.35);
  // The close: a kick on the last line and a long fade.
  add(starts[last], 0.9, kick, 0.4);

  let peak = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const g = Math.min(1, t / 0.3) * Math.min(1, (LEN - t) / 2.5);
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
  writeFileSync(path, buf);
}
