// Records a run through the live app in a phone-sized headless Chrome, for the demo video.
// Frames come from Chrome's screencast with their own timestamps, so the video keeps the real timing.
// Usage: node tools/demo/record.mjs <base url> <out dir> <cans photo> <electronics photo> [--warm]
//   --warm scans once before recording, so the 38 MB scanner model is cached and the recorded scan is quick.
// Read-only: it opens public screens and scans test photos on the page. Nothing is posted or saved to the server.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const [BASE, OUT, CANS, EWASTE, ...flags] = process.argv.slice(2);
const FRAMES = join(OUT, "frames");
rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const PORT = 9556;
// The profile is kept between runs so the scanner model stays cached.
const PROFILE = join(process.env.TEMP, "cdp-demo");
const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--hide-scrollbars", "--mute-audio", "about:blank"],
  { stdio: "ignore" },
);

let target;
for (let i = 0; i < 60 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch { /* starting */ }
  if (!target) await sleep(500);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
const handlers = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id !== undefined) {
    const p = pending.get(m.id);
    if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
  } else handlers.forEach((h) => h(m));
};
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    const timer = setTimeout(() => { pending.delete(i); rej(new Error(`${method} got no reply in 60 s`)); }, 60000);
    pending.set(i, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await send("Page.enable");
await send("Runtime.enable");
await send("DOM.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

// A green ring shows each tap, so viewers can follow what was pressed.
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `window.__tap = (x, y) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:' + (x - 24) + 'px;top:' + (y - 24) + 'px;width:48px;height:48px;border-radius:50%;background:rgba(166,232,90,.55);border:3px solid #fff;box-shadow:0 0 0 2px rgba(11,55,33,.5);z-index:2147483647;pointer-events:none;transition:transform .5s ease-out,opacity .5s ease-out';
    document.body.appendChild(d);
    requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = 'scale(1.7)'; d.style.opacity = '0'; }));
    setTimeout(() => d.remove(), 700);
  };`,
});

const js = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "evaluate failed");
  return r.result.value;
};
const waitFor = async (cond, timeout) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await js(`Boolean(${cond})`)) return true; await sleep(150); }
  throw new Error(`timed out waiting for ${cond}`);
};
const go = async (path) => { await send("Page.navigate", { url: BASE + path }); await sleep(400); await waitFor("document.readyState === 'complete'", 30000); };

// Finds an element by a CSS selector, or by its visible text when a pattern is given.
const find = (sel, pattern) =>
  pattern ? `[...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => ${pattern}.test(e.innerText.trim()))` : `document.querySelector(${JSON.stringify(sel)})`;

async function tap(sel, pattern, { settle = 700 } = {}) {
  const el = find(sel, pattern);
  await waitFor(el, 20000);
  await js(`${el}.scrollIntoView({ block: 'center', behavior: 'smooth' }); 'ok'`);
  await sleep(settle);
  await js(`(() => { const r = ${el}.getBoundingClientRect(); window.__tap(r.left + r.width / 2, r.top + r.height / 2); return 'ok'; })()`);
  await sleep(260);
  await js(`${el}.click(); 'ok'`);
}
const scrollTo = async (y, pause = 900) => { await js(`window.scrollTo({ top: ${y}, behavior: 'smooth' }); 'ok'`); await sleep(pause); };
const reveal = async (sel, pattern, pause = 900) => { await js(`${find(sel, pattern)}?.scrollIntoView({ block: 'center', behavior: 'smooth' }); 'ok'`); await sleep(pause); };

async function scan(photo) {
  const { root } = await send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector: "input[type=file]" });
  await send("DOM.setFileInputFiles", { nodeId, files: [photo] });
  await waitFor(`/Looks like|Could be|Not sure what this is|Not a recyclable/.test(document.querySelector('#scan-title')?.closest('section')?.innerText ?? '')`, 240000);
}

// The demo uses the app's dark theme.
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
const prepare = async () => {
  await go("/icon.svg");
  await js(`localStorage.clear(); localStorage.setItem('ccza.lang', 'en'); localStorage.setItem('ccza.theme', 'dark'); localStorage.setItem('ccza.tour.done', '1'); 'ok'`);
};

if (flags.includes("--warm")) {
  await prepare();
  await go("/sell");
  await waitFor(`document.querySelector('input[type=file]')`, 30000);
  console.log("warming the scanner (first run downloads about 38 MB)");
  await scan(CANS);
  console.log("scanner ready");
}

// Recording.
const frames = [];
const marks = [];
handlers.push((m) => {
  if (m.method !== "Page.screencastFrame") return;
  const n = String(frames.length).padStart(5, "0");
  writeFileSync(join(FRAMES, `${n}.jpg`), Buffer.from(m.params.data, "base64"));
  frames.push({ file: `${n}.jpg`, t: m.params.metadata.timestamp });
  send("Page.screencastFrameAck", { sessionId: m.params.sessionId }).catch(() => {});
});
const mark = (name) => { marks.push({ name, t: Date.now() / 1000 }); console.log("scene", name); };

await prepare();
await go("/");
await send("Page.startScreencast", { format: "jpeg", quality: 88, everyNthFrame: 1 });
mark("welcome");
await sleep(3200);

await tap("a", /^Look around first$/);
await waitFor(`location.pathname === '/home'`, 20000);
mark("home");
await sleep(2200);
await reveal("h2, h3", /^Board prices$/, 2600);
await scrollTo(0, 800);

await tap("a[href='/sell']");
await waitFor(`location.pathname === '/sell' && document.querySelector('input[type=file]')`, 20000);
mark("sell");
await sleep(1500);
mark("scan");
await scan(CANS);
await reveal("#scan-title", null, 600);
await reveal("p", /^Looks like|^Could be/, 2600);
await tap("[aria-pressed]", null, { settle: 500 });
await sleep(1800);

await tap("button", /^Yes, /);
mark("price");
await waitFor(find("h2", /^2\. Where and how much\?$/), 20000);
await reveal("h2", /^2\. Where and how much\?$/, 2800);

mark("weigh");
for (const k of [/^6$/, /^\.$/, /^4$/]) await tap("[role=group] button", k, { settle: 250 });
await sleep(1200);
await reveal("h2", /^3\. Show this at the centre$/, 2600);
mark("load");
await tap("button", /^Add to my load$/);
await sleep(700);
await scrollTo(0, 2800);

await tap("a[href='/prices']");
await waitFor(`location.pathname === '/prices'`, 20000);
mark("prices");
await sleep(2200);
await scrollTo(700, 2200);

await tap("a[href='/market']");
await waitFor(`location.pathname === '/market'`, 20000);
mark("market");
await sleep(3800);

await go("/home");
await waitFor(`document.querySelector('input[type=file]')`, 20000);
mark("ewaste");
await sleep(800);
await scan(EWASTE);
await reveal("p", /^Looks like|^Could be/, 2600);
await tap("a, button", /^What to do with electronics$/);
await sleep(3200);
mark("end");
await sleep(400);

await send("Page.stopScreencast");
await sleep(500);
writeFileSync(join(OUT, "timeline.json"), JSON.stringify({ frames, marks }, null, 1));
console.log(`${frames.length} frames, ${(frames.at(-1).t - frames[0].t).toFixed(1)} s`);
try { await send("Browser.close"); } catch { /* closing */ }
chrome.kill();
process.exit(0);
