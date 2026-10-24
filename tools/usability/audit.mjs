// Automated usability pass over the app's screens at phone size (375 x 812), in headless Chrome.
// Checks, per screen: tap targets under 44 px, text under 12 px, form fields without a label, images without a
// description, buttons and links with no name, horizontal scrolling, heading structure, console errors and page weight.
// Usage: node usability-audit.mjs <base url> [route ...]
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.argv[2];
const ROUTES = process.argv.slice(3);
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
await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });

const CHECK = `(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const name = (el) => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.getAttribute('alt') || el.value || '').trim().replace(/\\s+/g, ' ').slice(0, 40);
  const small = [];
  for (const el of document.querySelectorAll('a[href], button, [role=button], input:not([type=hidden]), select, textarea, summary')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 44 || r.width < 44) small.push(el.tagName.toLowerCase() + ' "' + name(el) + '" ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  const tiny = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) tiny.set(el.innerText.trim().slice(0, 40), fs);
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
    small: small.slice(0, 12), smallCount: small.length, tiny: [...tiny].slice(0, 6), unlabeled, noAlt, noName,
    height: document.documentElement.scrollHeight,
  };
})()`;

for (const route of ROUTES) {
  consoleErrors.length = 0;
  events.length = 0;
  await send("Page.navigate", { url: BASE + route });
  for (let i = 0; i < 60 && !events.includes("Page.loadEventFired"); i++) await sleep(250);
  await sleep(2500);
  const r = (await send("Runtime.evaluate", { expression: CHECK, returnByValue: true })).result.value;
  console.log(`\n== ${route}  "${r.title}"  lang=${r.lang || "MISSING"}  h1=${r.h1s}  overflowX=${r.overflowX || "none"}  height=${r.height}px`);
  console.log("  headings:", r.headings.join(" | "));
  console.log(`  small tap targets: ${r.smallCount}`, r.small.length ? "\n    " + r.small.join("\n    ") : "");
  if (r.tiny.length) console.log("  text under 12px:", JSON.stringify(r.tiny));
  if (r.unlabeled.length) console.log("  fields without a label:", r.unlabeled.join("; "));
  if (r.noAlt.length) console.log("  images without alt:", r.noAlt.join("; "));
  if (r.noName.length) console.log("  links or buttons with no name:", r.noName.join("; "));
  if (consoleErrors.length) console.log("  console errors:", [...new Set(consoleErrors)].join(" | ").slice(0, 300));
}
try { await send("Browser.close"); } catch { /* closing */ }
chrome.kill();
process.exit(0);
