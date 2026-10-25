// Builds the demo video from a recording made by record.mjs: the live app in a phone frame, with captions,
// a user-journey tracker, an opening problem card and closing cards. 1920x1080, 30 fps, silent.
// The team's voice is added afterwards with mix.sh, using the timings in docs/pitch/DEMO_SCRIPT.md.
// Usage: node tools/demo/compose.mjs <recording dir> <signed-in code shot> <signed-in money shot> <out.mp4>
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";

const [REC, CODE_SHOT, MONEY_SHOT, OUT] = process.argv.slice(2);
const FF = process.env.FFMPEG ?? execFileSync("python", ["-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"], { encoding: "utf8" }).trim();
const WORK = join(REC, "build");
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
const ff = (args) => execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });

const { frames, marks } = JSON.parse(readFileSync(join(REC, "timeline.json"), "utf8"));
const t0 = frames[0].t;
const at = Object.fromEntries(marks.map((m) => [m.name, m.t - t0]));

// 1. The screencast has frames only when the screen changed. Turn it into a steady 30 fps phone video.
const list = frames.map((f, i) => `file 'frames/${f.file}'\nduration ${((frames[i + 1]?.t ?? t0 + at.end + 0.5) - f.t).toFixed(4)}`);
writeFileSync(join(REC, "frames.txt"), list.join("\n") + `\nfile 'frames/${frames.at(-1).file}'\n`);
ff(["-f", "concat", "-safe", "0", "-i", join(REC, "frames.txt"), "-vf", "fps=30,scale=780:1688:out_range=tv,setsar=1,format=yuv420p", "-color_range", "tv", "-c:v", "libx264", "-crf", "16", "-preset", "medium", join(WORK, "phone.mp4")]);

// 2. Scenes. Each app scene is a slice of the recording with its own caption and journey step.
const STEPS = ["Scan", "Best price", "Weigh", "Show code", "Get paid"];
const app = [
  { from: 0, to: 3.6, caption: "Opens in any phone browser, in 11 languages", sub: "No app store, no download." },
  { from: at.home, to: at.home + 6.6, caption: "Scan a load, or check today's prices", sub: "Home has the scanner and every centre's board." },
  { from: at.sell, to: at.price, step: 0, caption: "Scan the load", sub: "The AI runs on the phone, even with no data. Tap a part of the photo to see what it thought." },
  { from: at.price, to: at.weigh, step: 1, caption: "Centres ranked by price", sub: "Best price first, per kilogram and per tonne." },
  { from: at.weigh, to: at.load, step: 2, caption: "Type the weight, see the money", sub: "6.4 kg of PET at the best centre is about R24.32." },
  { from: at.load, to: at.prices, step: 2, caption: "Add it to My load", sub: "A running total for the trip. The code for the centre needs a free account." },
  { from: at.prices, to: at.market, step: 1, caption: "Every centre's price, in one place", sub: "Board prices plus sourced 2026 market ranges." },
  { from: at.market, to: at.ewaste, caption: "A market map", sub: "Centres that buy, and businesses with material to sell." },
  { from: at.ewaste, to: at.end, caption: "Old electronics have a safe way out", sub: "Scan it, then see what to do and where to take it." },
];
const stills = [
  { shot: CODE_SHOT, dur: 4.2, step: 3, caption: "Show your code at the centre", sub: "The centre scans it and records the weighed sale." },
  { shot: MONEY_SHOT, dur: 4.6, step: 4, caption: "Every sale and payout in My money", sub: "Fees owed and paid, and impact, from weighed sales." },
];

const LOGO = (s) => `<svg viewBox="0 0 512 512" width="${s}" height="${s}"><rect width="512" height="512" rx="116" fill="#0F4A2A"/><path d="M331 179 A118 118 0 1 0 331 345" fill="none" stroke="#fff" stroke-width="58" stroke-linecap="round"/><circle cx="272" cy="262" r="46" fill="#A6E85A"/><path d="M338 166 C352 118 402 108 426 122 C424 176 382 200 338 166 Z" fill="#A6E85A"/></svg>`;
// The closing QR code opens the live app. Same library the app uses for reclaimer codes.
const QR = renderToStaticMarkup(createElement(QRCodeSVG, { value: "https://comecollectza.vercel.app", size: 300, marginSize: 1, fgColor: "#0b2415", bgColor: "#ffffff" }));
const SOWETO = pathToFileURL(realpathSync.native(join(import.meta.dirname, "../../public/images/soweto/towers.jpg"))).href;
const CSS = `
*{box-sizing:border-box;margin:0}
html,body{width:1920px;height:1080px;overflow:hidden;font-family:Manrope,system-ui,sans-serif;color:#fff;background:#06140b}
.green{position:absolute;inset:0;background:radial-gradient(1200px 800px at 75% 40%,#1f5a35 0%,#0b2415 60%,#06140b 100%)}
.soweto{position:absolute;inset:0;background:url('${SOWETO}') center/cover;opacity:.14;filter:blur(3px) saturate(.8)}
.brand{position:absolute;left:110px;top:80px;display:flex;align-items:center;gap:18px;font-weight:800;font-size:36px}
.brand b{color:#a6e85a}
.steps{position:absolute;left:110px;top:200px;display:flex;gap:12px;font-weight:800;font-size:23px;letter-spacing:.06em}
.steps i{font-style:normal;padding:10px 20px;border-radius:999px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.55)}
.steps i.on{background:#a6e85a;color:#0b2415}
.steps i.done{color:#a6e85a}
.copy{position:absolute;left:110px;top:330px;width:960px}
.chip{display:inline-block;font-weight:800;font-size:24px;letter-spacing:.12em;padding:10px 22px;border-radius:999px;margin-bottom:28px}
.live{background:#a6e85a;color:#0b2415}.example{background:#f5b544;color:#1a1205}
h1{font-size:76px;line-height:1.05;font-weight:800;letter-spacing:-.02em}
p.sub{margin-top:26px;font-size:38px;line-height:1.3;font-weight:600;color:rgba(255,255,255,.84)}
.phone{position:absolute;left:1226px;top:86px;width:434px;height:908px;border-radius:58px;background:#0b1410;box-shadow:0 60px 120px -40px rgba(0,0,0,.85),inset 0 0 0 2px #2b3a31}
.foot{position:absolute;left:110px;bottom:60px;font-size:24px;font-weight:600;color:rgba(255,255,255,.6)}
.card{position:absolute;left:110px;right:110px;top:240px}
.cols{display:flex;gap:40px;margin-top:40px}
.col{flex:1;background:rgba(255,255,255,.08);border-radius:28px;padding:36px 40px}
.col h2{font-size:34px;font-weight:800;margin-bottom:18px}.col.ok h2{color:#a6e85a}.col.not h2{color:#f5b544}
.col li{font-size:31px;line-height:1.35;font-weight:600;margin:0 0 12px 32px}
.end{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:130px}
.end .left{display:flex;flex-direction:column;align-items:flex-start}
.end h1{font-size:110px;margin-top:30px}.end h1 b{color:#a6e85a}
.end .tag{margin-top:16px;font-size:46px;font-weight:700}
.end .url{margin-top:40px;font-size:40px;font-weight:800;color:#0b2415;background:#a6e85a;padding:16px 44px;border-radius:999px}
.end .meta{margin-top:30px;font-size:32px;font-weight:700;color:#7fd1ff}
.qr{background:#fff;border-radius:36px;padding:30px 30px 22px;text-align:center;box-shadow:0 50px 100px -40px rgba(0,0,0,.8)}
.qr svg{display:block}
.qr p{margin-top:16px;font-size:30px;font-weight:800;color:#0b2415}
.credit{position:absolute;left:0;right:0;bottom:30px;text-align:center;font-size:19px;color:rgba(255,255,255,.55)}
`;
const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&display=swap" rel="stylesheet"><style>${CSS}</style></head><body><div class="green"></div><div class="soweto"></div>${body}</body></html>`;
const BRAND = `<div class="brand">${LOGO(56)}<span>ComeCollect<b>ZA</b></span></div>`;
const tracker = (step) => `<div class="steps">${STEPS.map((s, i) => `<i class="${step === i ? "on" : step !== undefined && i < step ? "done" : ""}">${i + 1}. ${s.toUpperCase()}</i>`).join("")}</div>`;
const appScene = (s, example) =>
  page(`${BRAND}${tracker(s.step)}<div class="copy"><span class="chip ${example ? "example" : "live"}">${example ? "EXAMPLE DATA, SIGNED IN" : "LIVE APP"}</span><h1>${s.caption}</h1><p class="sub">${s.sub}</p></div><div class="phone"></div><div class="foot">comecollectza.vercel.app</div>`);

const cards = {
  intro: page(`${BRAND}<div class="copy" style="top:300px;width:1500px"><span class="chip example">THE PROBLEM</span><h1>60,000 to 90,000 reclaimers collect South Africa's recycling.</h1><p class="sub">Prices are hidden, sales are not recorded, and the service fee they are owed goes unpaid.</p></div><div class="foot">Sources: NWMS and Regenize estimates, Sunday Times (Sep 2026), GroundUp</div>`),
  proof: page(`${BRAND}<div class="card"><h1>Built and live, not yet proven with sales</h1><div class="cols"><div class="col ok"><h2>Built and live</h2><ul><li>AI scanner on the phone: right on 79.8% of real photos it never saw</li><li>Works offline after one download</li><li>78 database checks and 18 app checks pass</li><li>Free, open tools. No paid AI</li></ul></div><div class="col not"><h2>Not yet</h2><ul><li>No real sales or payouts yet</li><li>Not yet tested with reclaimers</li><li>Next 30 days: 5 reclaimers, 1 PRO, 1 centre pilot</li></ul></div></div></div>`),
  close: page(`<div class="end"><div class="left">${LOGO(150)}<h1>ComeCollect<b>ZA</b></h1><div class="tag">Fair pay for every kilo.</div><div class="url">comecollectza.vercel.app</div><div class="meta">Demo login is on the last slide of our deck</div></div><div class="qr">${QR}<p>Scan to open the app</p></div></div><div class="credit">Scan photos: Grendelkhan (CC BY-SA 4.0) and AvWijk (public domain), Wikimedia Commons. Live app screens; steps 4 and 5 use example data. Team JBB, FNB App of the Year Hackathon 2026.</div>`),
};

// 3. Render every scene to a PNG in headless Chrome.
const PORT = 9557;
const PROFILE = join(process.env.TEMP, "cdp-demo-compose");
rmSync(PROFILE, { recursive: true, force: true });
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--hide-scrollbars", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 60 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch { /* starting */ }
  if (!target) await sleep(500);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
const events = [];
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id !== undefined) { const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } } else events.push(m.method); };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
async function shoot(name, html) {
  const file = join(WORK, `${name}.html`);
  writeFileSync(file, html);
  events.length = 0;
  await send("Page.navigate", { url: pathToFileURL(file).href });
  for (let i = 0; i < 80 && !events.includes("Page.loadEventFired"); i++) await sleep(250);
  await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
  await sleep(300);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(WORK, `${name}.png`), Buffer.from(shot.data, "base64"));
}
for (const [i, s] of app.entries()) await shoot(`app${i}`, appScene(s, false));
for (const [i, s] of stills.entries()) await shoot(`still${i}`, appScene(s, true));
for (const [name, html] of Object.entries(cards)) await shoot(name, html);
await shoot("mask", `<!doctype html><html><body style="margin:0;background:#000;width:406px;height:880px"><div style="width:406px;height:880px;border-radius:44px;background:#fff"></div></body></html>`);
try { await send("Browser.close"); } catch { /* closing */ }
chrome.kill();

// 4. Encode each segment, then join them.
// Every segment gets the same format and colour range, so they can be joined without re-encoding.
const ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-color_range", "tv", "-r", "30"];
const fades = (d) => `fade=t=in:st=0:d=0.2,fade=t=out:st=${(d - 0.2).toFixed(2)}:d=0.2`;
const PHONE = "[1:v]scale=406:880,setsar=1,format=rgba[ph];[2:v]crop=406:880:0:0,format=gray[m];[ph][m]alphamerge[p];[0:v][p]overlay=1240:100:shortest=1,scale=out_range=tv,format=yuv420p";
const segs = [];
const seg = (name, args) => { ff([...args, ...ENC, join(WORK, `${name}.mp4`)]); segs.push(`${name}.mp4`); };
const card = (name, d) => seg(`s_${name}`, ["-loop", "1", "-t", String(d), "-i", join(WORK, `${name}.png`), "-vf", `scale=1920:1080:out_range=tv,setsar=1,format=yuv420p,${fades(d)}`, "-t", String(d)]);

card("intro", 6);
for (const [i, s] of app.entries()) {
  const d = s.to - s.from;
  seg(`s_app${i}`, ["-loop", "1", "-i", join(WORK, `app${i}.png`), "-ss", s.from.toFixed(3), "-t", d.toFixed(3), "-i", join(WORK, "phone.mp4"), "-loop", "1", "-i", join(WORK, "mask.png"),
    "-filter_complex", `${PHONE},${fades(d)}`, "-t", d.toFixed(3)]);
}
for (const [i, s] of stills.entries()) {
  seg(`s_still${i}`, ["-loop", "1", "-i", join(WORK, `still${i}.png`), "-loop", "1", "-t", String(s.dur), "-i", s.shot, "-loop", "1", "-i", join(WORK, "mask.png"),
    "-filter_complex", `${PHONE},${fades(s.dur)}`, "-t", String(s.dur)]);
}
card("proof", 7);
card("close", 7.5);

writeFileSync(join(WORK, "segments.txt"), segs.map((s) => `file '${s}'`).join("\n") + "\n");
ff(["-f", "concat", "-safe", "0", "-i", join(WORK, "segments.txt"), "-c", "copy", "-movflags", "+faststart", OUT]);
const probe = spawnSync(FF, ["-hide_banner", "-i", OUT], { encoding: "utf8" }).stderr;
console.log(OUT, probe.match(/Duration: [^,]+/)?.[0] ?? "");
process.exit(0);
