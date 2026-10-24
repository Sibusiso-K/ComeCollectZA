// Renders the pitch video's scenes as 1920x1080 PNGs in headless Chrome (Manrope, brand colours).
// Scene 1 is a transparent overlay that goes over the landfill clip.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const TEMP = realpathSync.native(process.env.TEMP);
const P = join(TEMP, "pitch");
const OUT = join(P, "scenes2");
mkdirSync(OUT, { recursive: true });
const url = (p) => pathToFileURL(p).href;
const SHOT = (f) => url(join(TEMP, "mock", "shots", f));
const STOCK = (f) => url(join(P, "stock", f));
const SOWETO = url("C:/Users/Dell Latitude/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/scratch-workspaces/19f0e3ec-3aa1-482b-8ad3-f892469278d2/6897abfc-eddd-413d-a69b-19eb6750f629/scratch-2026-10-18-ba21cf/comecollectza/public/images/soweto/towers.jpg");

const LOGO = (s) => `<svg viewBox="0 0 512 512" width="${s}" height="${s}"><rect width="512" height="512" rx="116" fill="#0F4A2A"/><path d="M331 179 A118 118 0 1 0 331 345" fill="none" stroke="#fff" stroke-width="58" stroke-linecap="round"/><circle cx="272" cy="262" r="46" fill="#A6E85A"/><path d="M338 166 C352 118 402 108 426 122 C424 176 382 200 338 166 Z" fill="#A6E85A"/></svg>`;

const CSS = `
*{box-sizing:border-box;margin:0}
html,body{width:1920px;height:1080px;overflow:hidden;font-family:Manrope,system-ui,sans-serif;color:#fff}
.full{position:absolute;inset:0;background-size:cover;background-position:center}
.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,18,11,.92) 0%,rgba(6,18,11,.78) 38%,rgba(6,18,11,.15) 72%,rgba(6,18,11,0) 100%)}
.shadeB{position:absolute;inset:0;background:linear-gradient(0deg,rgba(6,18,11,.55),rgba(6,18,11,0) 40%)}
.copy{position:absolute;left:120px;top:50%;transform:translateY(-50%);width:900px}
.chip{display:inline-block;font-weight:800;font-size:30px;letter-spacing:.14em;padding:12px 26px;border-radius:999px;margin-bottom:34px}
.problem{background:#f5b544;color:#1a1205}
.solution{background:#a6e85a;color:#0b2415}
h1{font-size:92px;line-height:1.02;font-weight:800;letter-spacing:-.025em}
p.sub{margin-top:28px;font-size:44px;line-height:1.25;font-weight:600;color:rgba(255,255,255,.86)}
.brand{position:absolute;left:120px;top:84px;display:flex;align-items:center;gap:18px;font-weight:800;font-size:36px}
.brand b{color:#a6e85a}
.green{position:absolute;inset:0;background:radial-gradient(1200px 800px at 75% 40%,#1f5a35 0%,#0b2415 60%,#06140b 100%)}
.soweto{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.16;filter:blur(3px) saturate(.8)}
.phone{position:absolute;right:230px;top:50%;transform:translateY(-50%);width:452px;padding:13px;border-radius:66px;background:#0b1410;box-shadow:0 60px 120px -40px rgba(0,0,0,.8),inset 0 0 0 2px #2b3a31}
.phone .scr{border-radius:54px;overflow:hidden;height:900px;background:#000}
.phone img{display:block;width:100%}
.card{position:absolute;right:600px;top:58%;transform:translateY(-50%) rotate(-5deg);width:400px;height:300px;border-radius:30px;background-size:cover;background-position:center;box-shadow:0 40px 90px -30px rgba(0,0,0,.85);border:6px solid #fff}
.end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.end h1{font-size:120px;margin-top:40px}
.end h1 b{color:#a6e85a}
.end .tag{margin-top:22px;font-size:52px;font-weight:700}
.end .url{margin-top:44px;font-size:40px;font-weight:800;color:#0b2415;background:#a6e85a;padding:18px 44px;border-radius:999px}
.end .vals{margin-top:34px;font-size:40px;font-weight:700;color:#7fd1ff}
.end .meta{margin-top:40px;font-size:28px;font-weight:600;color:rgba(255,255,255,.75)}
.cap{position:absolute;left:120px;max-width:1040px;bottom:100px;text-align:left}
.cap span{display:inline-block;font-weight:800;font-size:46px;background:rgba(6,18,11,.78);padding:14px 38px;border-radius:18px;letter-spacing:-.01em}
.value{background:#7fd1ff;color:#06202e}
.steps{position:absolute;left:120px;top:176px;display:flex;gap:14px;font-weight:800;font-size:24px;letter-spacing:.1em}
.steps i{font-style:normal;padding:9px 20px;border-radius:999px;background:rgba(255,255,255,.14);color:rgba(255,255,255,.55)}
.steps i.on.p{background:#f5b544;color:#1a1205}.steps i.on.s{background:#a6e85a;color:#0b2415}.steps i.on.v{background:#7fd1ff;color:#06202e}
.credit{position:absolute;left:0;right:0;bottom:26px;text-align:center;font-size:17px;color:rgba(255,255,255,.55)}
`;
const BRAND = `<div class="brand">${LOGO(56)}<span>ComeCollect<b>ZA</b></span></div>`;
const page = (body, transparent = false) => `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&display=swap" rel="stylesheet"><style>${CSS}${transparent ? "html,body{background:transparent}" : "body{background:#06140b}"}</style></head><body>${body}</body></html>`;

const CAP = (t) => `<div class="cap"><span>${t}</span></div>`;
const STEPS = (on) => `<div class="steps"><i class="${on === 0 ? "on p" : ""}">PROBLEM</i><i class="${on === 1 ? "on s" : ""}">SOLUTION</i><i class="${on === 2 ? "on v" : ""}">VALUE</i></div>`;
const phone = (shot, top = 0) => `<div class="phone"><div class="scr"><img src="${SHOT(shot)}" style="margin-top:-${top}px"></div></div>`;

const G = `<div class="green"></div><div class="soweto" style="background-image:url('${SOWETO}')"></div>`;
const scenes = {
  // PROBLEM
  "1-problem": page(`<div class="shade"></div>${BRAND}<div class="copy"><span class="chip problem">THE PROBLEM</span><h1>Reclaimers sort our recycling by hand.</h1><p class="sub">And never know what a load is worth.</p></div>${STEPS(0)}${CAP("Reclaimers sort our recycling by hand.")}`, true),
  "2-problem": page(`<div class="full" style="background-image:url('${STOCK("picker-115593683.jpg")}');background-position:60% 30%"></div><div class="shade"></div>${BRAND}<div class="copy"><span class="chip problem">THE PROBLEM</span><h1>Prices are hidden. Pay is a guess.</h1><p class="sub">Loads get mixed. Old electronics get dumped.</p></div>${STEPS(0)}${CAP("Prices are hidden. Pay is a guess.")}`),
  // SOLUTION
  "3-scan": page(`${G}${BRAND}<div class="copy" style="width:880px"><span class="chip solution">THE SOLUTION</span><h1>Snap a photo. Know the material.</h1><p class="sub">The scanner runs on the phone, even with no data.</p></div>${phone("06-scan-cardboard.png", 0)}${STEPS(1)}${CAP("ComeCollectZA: snap a photo, know the material.")}`),
  "4-price": page(`${G}${BRAND}<div class="copy" style="width:880px"><span class="chip solution">THE SOLUTION</span><h1>See the best price nearby.</h1><p class="sub">Every buy-back centre's price per kilogram.</p></div>${phone("08-sell-centres.png", 0)}${STEPS(1)}${CAP("See the best price nearby.")}`),
  // VALUE
  "5-sell": page(`${G}${BRAND}<div class="copy" style="width:880px"><span class="chip value">THE VALUE</span><h1>Fair pay, with proof of every kilo.</h1><p class="sub">Income you can show. Verified tonnes for recyclers.</p></div>${phone("14-money.png", 0)}${STEPS(2)}${CAP("Sell, and every kilo is recorded.")}`),
  "6-ewaste": page(`${G}${BRAND}<div class="copy" style="width:700px"><span class="chip value">THE VALUE</span><h1>Old electronics, sorted out.</h1><p class="sub">Sell it, give it, or drop it off safely.</p></div><div class="card" style="background-image:url('${STOCK("ewaste-4638550.jpg")}')"></div>${phone("31-scan-electronics.png", 0)}${STEPS(2)}${CAP("Old electronics too.")}`),
  // END
  "7-end": page(`${G}<div class="end">${LOGO(170)}<h1>ComeCollect<b>ZA</b></h1><div class="tag">Fair pay, every kilo.</div><div class="vals">Know the price &nbsp;·&nbsp; Prove every sale &nbsp;·&nbsp; Keep waste out of landfill</div><div class="url">comecollectza.vercel.app</div><div class="meta">FNB App of the Year Hackathon 2026 · Team JBB</div></div><div class="credit">Footage: V. M. E. Verheyen (CC BY 3.0). Photos: FBenjr123 (CC BY-SA 4.0), AvWijk (public domain), via Wikimedia Commons. App screens are the live app.</div>`),
};

const PORT = 9555;
const PROFILE = join(TEMP, "cdp-pitch");
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

for (const [name, html] of Object.entries(scenes)) {
  const file = join(OUT, `${name}.html`);
  writeFileSync(file, html);
  const transparent = name === "1-problem";
  await send("Emulation.setDefaultBackgroundColorOverride", transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
  events.length = 0;
  await send("Page.navigate", { url: pathToFileURL(file).href });
  for (let i = 0; i < 80 && !events.includes("Page.loadEventFired"); i++) await sleep(250);
  await send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => Promise.all([...document.images].map((i) => i.decode().catch(() => 0))))", awaitPromise: true });
  await sleep(500);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(shot.data, "base64"));
  console.log("scene", name);
}
try { await send("Browser.close"); } catch { /* closing */ }
chrome.kill();
process.exit(0);
