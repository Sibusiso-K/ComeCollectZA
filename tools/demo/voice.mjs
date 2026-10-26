// Builds the voiced demo video: the recorded voice cut line by line onto the scene timeline, a ducked music bed,
// and the scenes cut a quarter second before each spoken line (the same method as the pitch video, tools/pitch/build.sh).
//
//   node tools/demo/voice.mjs <voice dir> <recording dir> <code screenshot> <home screenshot> <out.mp4>
//
// The voice dir holds take.m4a (the recording) and transcript.json (faster-whisper word timings, from tools/pitch/transcribe.py).
// The recording dir is the one record.mjs wrote. Needs FFMPEG, or imageio_ffmpeg for Python.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeMusic } from "./music.mjs";

const [VOICE, REC, CODE_SHOT, HOME_SHOT, OUT] = process.argv.slice(2);
const FF = process.env.FFMPEG ?? execFileSync("python", ["-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"], { encoding: "utf8" }).trim();
const ff = (args) => execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });

const segs = JSON.parse(readFileSync(join(VOICE, "transcript.json"), "utf8"));
const wordsOf = (i) => segs[i].words;

// 1. Spoken groups, as Whisper segment numbers. Lines that run on without a pause are one cut.
const GROUPS = [[0, 1], [2], [3], [4], [5, 6, 7], [8], [9], [10], [11], [12, 13], [14], [15], [16], [17], [18, 19]];
const src = GROUPS.map((g) => ({ s: wordsOf(g[0])[0].s, e: wordsOf(g.at(-1)).at(-1).e }));

// 2. Put each group on the new timeline. The pauses in the take are shortened to between 0.35 and 0.6 s.
const START = 0.4;
const TAIL = 3.8; // QR code stays up after the last word
const place = [];
src.forEach((g, i) => {
  const t = i === 0 ? START : place[i - 1] + (src[i - 1].e - src[i - 1].s) + Math.min(0.6, Math.max(0.35, g.s - src[i - 1].e));
  place.push(t);
});
const toNew = (t) => {
  const i = src.findLastIndex((g) => g.s <= t + 1e-6);
  return place[i] + (t - src[i].s);
};

// 3. Scenes start a quarter second before the line that introduces them. Anchors are source times.
const LEAD = 0.25;
const ANCHORS = {
  app: [13.96, 16.88, 22.3, 31.66, 34.52, wordsOf(9).find((w) => w.w === "add").s, 43.98, 49.22, 52.56],
  stills: [60.34, 64.3],
  proof: 68.26,
  close: 76.62,
};
const startsAt = [0, ...ANCHORS.app, ...ANCHORS.stills, ANCHORS.proof, ANCHORS.close].map((t, i) => (i === 0 ? 0 : toNew(t) - LEAD));
const LEN = place.at(-1) + (src.at(-1).e - src.at(-1).s) + 0.14 + TAIL;
const dur = startsAt.map((t, i) => (i + 1 < startsAt.length ? startsAt[i + 1] : LEN) - t).map((d) => +d.toFixed(3));
const durations = { intro: dur[0], app: dur.slice(1, 10), stills: dur.slice(10, 12), proof: dur[12], close: dur[13], shift: { 2: 1.1 } };
writeFileSync(join(VOICE, "durations.json"), JSON.stringify(durations, null, 1));
console.log("length", LEN.toFixed(2), JSON.stringify(durations));

// 4. Clean the whole take once, then cut each group and place it.
ff(["-i", join(VOICE, "take.m4a"), "-ac", "1", "-ar", "48000", "-af", "highpass=f=90,afftdn=nr=14:nf=-45,acompressor=threshold=0.04:ratio=3:attack=5:release=90:makeup=2,loudnorm=I=-15:TP=-1.5:LRA=7", join(VOICE, "clean.wav")]);
const filt = [];
src.forEach((g, i) => {
  const a = g.s - 0.1;
  const b = g.e + 0.14;
  const delay = Math.round((place[i] - 0.1) * 1000);
  filt.push(`[0:a]atrim=start=${a.toFixed(3)}:end=${b.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${(b - a - 0.04).toFixed(3)}:d=0.04,adelay=${delay}|${delay}[l${i}]`);
});
const mix = src.map((_, i) => `[l${i}]`).join("");
ff(["-i", join(VOICE, "clean.wav"), "-filter_complex", `${filt.join(";")};${mix}amix=inputs=${src.length}:normalize=0:duration=longest,apad=whole_dur=${LEN.toFixed(3)},atrim=0:${LEN.toFixed(3)},aformat=channel_layouts=stereo`, join(VOICE, "voice.wav")]);

// 5. Music, which ducks under the voice, then the final mix.
writeMusic(join(VOICE, "music.wav"), LEN, place, place[4], place.at(-1));
ff(["-i", join(VOICE, "voice.wav"), "-i", join(VOICE, "music.wav"), "-filter_complex",
  `[1:a]volume=0.55[m];[0:a]asplit=2[v][sc];[m][sc]sidechaincompress=threshold=0.03:ratio=9:attack=15:release=450:makeup=1[md];[v][md]amix=inputs=2:normalize=0,alimiter=limit=0.95,loudnorm=I=-15:TP=-1.5:LRA=7,atrim=0:${LEN.toFixed(3)}[a]`,
  "-map", "[a]", "-ar", "44100", join(VOICE, "mix.wav")]);

// 6. Scenes, with the lengths the voice sets, then put the sound on.
execFileSync("node", [join(import.meta.dirname, "compose.mjs"), REC, CODE_SHOT, HOME_SHOT, join(VOICE, "silent.mp4"), "--real", "--durations", join(VOICE, "durations.json")], { stdio: "inherit", env: { ...process.env, FFMPEG: FF } });
ff(["-i", join(VOICE, "silent.mp4"), "-i", join(VOICE, "mix.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", LEN.toFixed(3), "-movflags", "+faststart", OUT]);
console.log("wrote", OUT);
