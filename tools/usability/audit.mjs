// Automated usability pass over the app's screens at phone sizes, in headless Chrome.
// Checks, per screen: tap targets under 44 px, text under 12 px, form fields without a label, images without a
// description, buttons and links with no name, horizontal scrolling, content cut off at the edge or spilling out of
// its box (the screens hide sideways scrolling, so this is the check that catches it), heading structure, console
// errors and page height.
// Usage: node audit.mjs <base url> [route ...]
// Options from the environment: WIDTHS=320,375 (default 375), THEME=dark|light (dark), LANG_CODE=zu (en),
// SHOTS=<folder> saves a full-page screenshot of each screen, SLOW=1 slows the CPU 4x and the network to 3G.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.argv[2];
const ROUTES = process.argv.slice(3);
const WIDTHS = (process.env.WIDTHS ?? "375").split(",").map(Number);
const THEME = process.env.THEME ?? "dark";
const LANG = process.env.LANG_CODE ?? "en";
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const PORT = 9666;
const PROFILE = join(process.env.TEMP, "cdp-usability");
rmSync(PROFILE, { recursive: true, force: true });
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
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
const consoleErrors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id !== undefined) { const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } return; }
  events.push(m.method);
  if (m.method === "Runtime.exceptionThrown") consoleErrors.push(m.params.exceptionDetails.text);
  if (m.method === "Log.entryAdded" && m.params.entry.level === "error") consoleErrors.push(m.params.entry.text + " " + (m.params.entry.url ?? ""));
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable");
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: THEME }] });
if (process.env.SLOW) {
  await send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await send("Network.emulateNetworkConditions", { offline: false, latency: 300, downloadThroughput: 400 * 1024 / 8 * 4, uploadThroughput: 400 * 1024 / 8 });
}
// Language and theme are saved on the phone, so set them before the first screen loads.
await send("Page.addScriptToEvaluateOnNewDocument", { source: `try { localStorage.setItem("ccza.lang", ${JSON.stringify(LANG)}); localStorage.setItem("ccza.theme", ${JSON.stringify(THEME)}); localStorage.setItem("ccza.tour.done", "1"); } catch {}` });

const CHECK = `(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const name = (el) => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.getAttribute('alt') || el.value || '').trim().replace(/\\s+/g, ' ').slice(0, 40);
  const label = (el) => el.tagName.toLowerCase() + ' "' + (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 30) + '"';
  const small = [];
  for (const el of document.querySelectorAll('a[href], button, [role=button], input:not([type=hidden]), select, textarea, summary')) {
    if (!vis(el)) continue;
    // A checkbox inside its label is tapped through the whole label. Map attribution links are the map's own.
    if (el.closest('.leaflet-control-attribution')) continue;
    const r = (el.type === 'checkbox' || el.type === 'radio') && el.closest('label') ? el.closest('label').getBoundingClientRect() : el.getBoundingClientRect();
    if (r.height < 44 || r.width < 44) small.push(el.tagName.toLowerCase() + ' "' + name(el) + '" ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  // Phones zoom the page in when a field with text under 16 px gets focus.
  const zoomy = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, textarea')]
    .filter((el) => vis(el) && parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.tagName.toLowerCase() + ' ' + (el.placeholder || el.name || el.id));
  const tiny = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) tiny.set(el.innerText.trim().slice(0, 40), fs);
  }
  // Content past the screen edge, or wider than its own box, outside the rows that are meant to scroll sideways.
  const scrolls = (el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowX);
  const scroller = (el) => { for (let p = el; p; p = p.parentElement) if (scrolls(p)) return true; return false; };
  // Inside a box that crops on purpose (a map, a photo), narrower than the screen. The page shell crops too, but it
  // is as wide as the screen, and what it crops is the problem this check looks for.
  const cropped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { if (getComputedStyle(p).overflowX !== 'visible') return p.getBoundingClientRect().width < innerWidth - 1; } return false; };
  const cut = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.closest('[aria-hidden=true]') || scroller(el)) continue;
    const s = getComputedStyle(el);
    if (s.position === 'absolute' && s.clip !== 'auto') continue;
    const r = el.getBoundingClientRect();
    const past = (r.right > innerWidth + 1 || r.left < -1) && !cropped(el);
    // A row that scrolls sideways, pulled to the screen edges, is meant to be wider than its parent.
    const spills = el.scrollWidth > el.clientWidth + 2 && s.textOverflow !== 'ellipsis' && el.clientWidth > 0 && s.display !== 'inline'
      && s.overflowX === 'visible' && ![...el.children].some(scrolls) && !cropped(el);
    if (past || spills) cut.push(label(el) + (past ? ' past the edge ' + Math.round(r.left) + '..' + Math.round(r.right) : ' content ' + el.scrollWidth + ' in ' + el.clientWidth));
  }
  const unlabeled = [];
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]), select, textarea')) {
    if (!vis(el)) continue;
    const has = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.id && document.querySelector('label[for="' + el.id + '"]')) || el.closest('label');
    if (!has) unlabeled.push(el.tagName.toLowerCase() + '[' + (el.type || '') + '] ' + (el.placeholder || ''));
  }
  const noAlt = [...document.querySelectorAll('img')].filter((i) => vis(i) && !i.hasAttribute('alt')).map((i) => i.src.slice(-30));
  const noName = [...document.querySelectorAll('a[href], button')].filter((e) => vis(e) && !name(e)).map((e) => e.outerHTML.slice(0, 60));
  const h = [...document.querySelectorAll('h1,h2,h3')].map((e) => e.tagName + ':' + e.innerText.trim().slice(0, 30));
  return {
    title: document.title, lang: document.documentElement.lang,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1 ? document.documentElement.scrollWidth : 0,
    h1s: document.querySelectorAll('h1').length, headings: h.slice(0, 8),
    small: small.slice(0, 12), smallCount: small.length, tiny: [...tiny].slice(0, 6), cut: cut.slice(0, 10), cutCount: cut.length, zoomy,
    unlabeled, noAlt, noName, height: document.documentElement.scrollHeight,
  };
})()`;

let problems = 0;
for (const width of WIDTHS) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 800, deviceScaleFactor: 2, mobile: true });
  for (const route of ROUTES) {
    consoleErrors.length = 0;
    events.length = 0;
    const started = performance.now();
    await send("Page.navigate", { url: BASE + route });
    for (let i = 0; i < 240 && !events.includes("Page.loadEventFired"); i++) await sleep(250);
    const loadMs = Math.round(performance.now() - started);
    await sleep(process.env.SLOW ? 6000 : 2500);
    const r = (await send("Runtime.evaluate", { expression: CHECK, returnByValue: true })).result.value;
    problems += r.cutCount + (r.overflowX ? 1 : 0) + r.smallCount + r.zoomy.length + (r.h1s === 1 ? 0 : 1);
    console.log(`\n== ${width}px ${THEME} ${LANG} ${route}  "${r.title}"  lang=${r.lang || "MISSING"}  h1=${r.h1s}  overflowX=${r.overflowX || "none"}  height=${r.height}px  load=${loadMs}ms`);
    console.log("  headings:", r.headings.join(" | "));
    console.log(`  small tap targets: ${r.smallCount}`, r.small.length ? "\n    " + r.small.join("\n    ") : "");
    if (r.cut.length) console.log(`  cut off or spilling (${r.cutCount}):\n    ` + r.cut.join("\n    "));
    if (r.zoomy.length) console.log("  fields that make the phone zoom (text under 16px):", r.zoomy.join("; "));
    if (r.tiny.length) console.log("  text under 12px:", JSON.stringify(r.tiny));
    if (r.unlabeled.length) console.log("  fields without a label:", r.unlabeled.join("; "));
    if (r.noAlt.length) console.log("  images without alt:", r.noAlt.join("; "));
    if (r.noName.length) console.log("  links or buttons with no name:", r.noName.join("; "));
    if (consoleErrors.length) console.log("  console errors:", [...new Set(consoleErrors)].join(" | ").slice(0, 300));
    if (SHOTS) {
      const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      writeFileSync(join(SHOTS, `${width}-${THEME}-${LANG}${route.replace(/\W+/g, "-") || "-start"}.png`), Buffer.from(data, "base64"));
    }
  }
}
console.log(`\n${problems} problems (cut off, sideways scroll, small tap targets, zooming fields, not one main heading).`);
try { await send("Browser.close"); } catch { /* closing */ }
chrome.kill();
process.exit(0);
