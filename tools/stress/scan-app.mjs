// Runs photos through the real scanner in headless Chrome, all in one page session, the way a person would scan
// one load after another. Reports what the app said for each photo, how long each scan took, and how memory moved.
// Read-only: the scanner runs in the browser and nothing is sent anywhere.
// Usage: node tools/stress/scan-app.mjs <base url> <manifest.json> <report.json>
//   manifest: [{ "label": "cardboard" | "glass" | "metal" | "paper" | "plastic" | "trash" | "electronics" | "odd", "path": "..." }]
//   "odd" files (broken, empty, huge, tiny) pass when the app shows a result or its friendly message and keeps working.
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const [BASE, MANIFEST, REPORT] = process.argv.slice(2);
const items = JSON.parse(readFileSync(MANIFEST, "utf8"));
const PORT = 9555;
const PROFILE = join(process.env.TEMP, "cdp-scan-app");
rmSync(PROFILE, { recursive: true, force: true });
const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--hide-scrollbars", "--mute-audio", "about:blank"],
  { stdio: "ignore" },
);

async function connect(url) {
  const ws = new WebSocket(url);
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
  // Every call has a time limit, so one lost reply cannot stall the whole run.
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      const timer = setTimeout(() => { pending.delete(i); rej(new Error(`${method} got no reply in 30 s`)); }, 30000);
      pending.set(i, { res: (v) => { clearTimeout(timer); res(v); }, rej: (e) => { clearTimeout(timer); rej(e); } });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  return { send, on: (h) => handlers.push(h) };
}

let target;
for (let i = 0; i < 60 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch { /* starting */ }
  if (!target) await sleep(500);
}
const page = await connect(target.webSocketDebuggerUrl);
const browser = await connect((await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl);

const problems = [];
let crashed = false;
page.on((m) => {
  if (m.method === "Runtime.exceptionThrown") problems.push("exception: " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 200));
  if (m.method === "Log.entryAdded" && m.params.entry.level === "error") problems.push(`${m.params.entry.source}: ${m.params.entry.text}`.slice(0, 200));
  if (m.method === "Inspector.targetCrashed") crashed = true;
});
await page.send("Page.enable");
await page.send("Runtime.enable");
await page.send("Log.enable");
await page.send("Inspector.enable");
await page.send("DOM.enable");
await page.send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });

const js = async (expression) => {
  const r = await page.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "evaluate failed");
  return r.result.value;
};
const waitFor = async (cond, timeout) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await js(`Boolean(${cond})`)) return true; await sleep(150); }
  return false;
};

// Memory of the page's renderer process as Windows reports it (working set), in MB.
async function rendererMB() {
  try {
    const { processInfo } = await browser.send("SystemInfo.getProcessInfo");
    let kb = 0;
    for (const p of processInfo.filter((x) => x.type === "renderer")) {
      const out = execFileSync("tasklist", ["/fi", `PID eq ${p.id}`, "/fo", "csv", "/nh"], { encoding: "utf8" });
      const m = /"([^"]+) K"\s*$/.exec(out.trim());
      if (m) kb += Number(m[1].replace(/\D/g, ""));
    }
    return Math.round(kb / 1024);
  } catch { return null; }
}
const heapMB = async () => Math.round((await page.send("Runtime.getHeapUsage")).usedSize / 1048576);

await page.send("Page.navigate", { url: `${BASE}/icon.svg` });
await sleep(800);
await js(`localStorage.clear(); localStorage.setItem('ccza.lang', 'en'); localStorage.setItem('ccza.tour.done', '1'); 'ok'`);
await page.send("Page.navigate", { url: `${BASE}/home` });
if (!(await waitFor(`document.querySelector('input[type=file]')`, 30000))) throw new Error("home did not show the scanner");
// Long tasks: how long the page could not respond to a tap. The model runs on the page's main thread.
await js(`window.__long = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: 'longtask', buffered: false }); 'ok'`);

const READ = `(() => {
  const sec = document.querySelector('#scan-title')?.closest('section');
  if (!sec) return { missing: true };
  const p = [...sec.querySelectorAll('p')].map((e) => e.innerText);
  return {
    head: sec.querySelector('p.text-2xl')?.innerText ?? '',
    sure: p.find((t) => / ms /.test(t)) ?? '',
    status: sec.querySelector('[role=status]')?.innerText ?? '',
    quarters: [...sec.querySelectorAll('[aria-pressed]')].map((b) => b.getAttribute('aria-label')),
    parts: [...sec.querySelectorAll('li span.font-bold')].map((s) => s.innerText),
    thinking: /Looking at your load|Getting the scanner ready/.test(sec.innerText),
    idle: Boolean(sec.querySelector('input[type=file]')),
  };
})()`;
const GROUP = { Cardboard: "cardboard", Glass: "glass", "Metal cans": "metal", Paper: "paper", Plastic: "plastic", Electronics: "electronics" };

// What the screen told the person, reduced to one group (or none) and how firmly it said it.
function verdict(r) {
  if (r.stuck) return { kind: "stuck" };
  if (r.quarters.length !== 4) return { kind: "message", text: r.status };
  const h = r.head;
  if (h === "Looks like a mixed load") return { kind: "mixed", groups: r.parts.map((x) => GROUP[x] ?? x) };
  if (h === "Looks like electronics") return { kind: "said", group: "electronics" };
  if (h === "Could be electronics") return { kind: "asked", group: "electronics" };
  if (h === "Not a recyclable we buy") return { kind: "said", group: "trash" };
  if (h === "Not sure what this is") return { kind: "unsure" };
  let m = /^Looks like (.+)$/.exec(h);
  if (m) return { kind: "said", group: GROUP[m[1]] ?? m[1] };
  m = /^Could be (.+)$/.exec(h);
  if (m) return { kind: "asked", group: GROUP[m[1]] ?? m[1] };
  return { kind: "other", text: h };
}

const results = [];
const memory = [{ at: 0, renderer: await rendererMB(), heap: await heapMB() }];
console.log(`Scanning ${items.length} photos at ${BASE}/home. Memory at start: renderer ${memory[0].renderer} MB, JS heap ${memory[0].heap} MB`);

async function scanOne(item) {
  await waitFor(`document.querySelector('input[type=file]')`, 15000);
  await js(`window.__long.length = 0; 'ok'`);
  const { root } = await page.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await page.send("DOM.querySelector", { nodeId: root.nodeId, selector: "input[type=file]" });
  const before = problems.length;
  const t0 = Date.now();
  await page.send("DOM.setFileInputFiles", { nodeId, files: [item.path] });
  let r;
  let sawThinking = false;
  while (true) {
    r = await js(READ);
    if (r.thinking) sawThinking = true;
    if (r.quarters?.length === 4) break;
    if (r.idle && r.status && (sawThinking || Date.now() - t0 > 1500)) break;
    if (Date.now() - t0 > 120000 || crashed) { r = { ...r, stuck: true }; break; }
    await sleep(100);
  }
  const wall = Date.now() - t0;
  const longest = Math.round(await js(`Math.max(0, ...window.__long)`));
  if (r.quarters?.length === 4) await js(`[...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Scan again')?.click()`);
  return { r, wall, longest, newProblems: problems.slice(before) };
}

for (const [n, item] of items.entries()) {
  if (crashed) { results.push({ ...item, file: basename(item.path), verdict: { kind: "stuck" }, crashed: true }); continue; }
  let out;
  try {
    out = await scanOne(item);
  } catch (e) {
    // A harness problem (a lost reply), not an app result. Reload so the next photo starts clean.
    console.log(`${String(n + 1).padStart(3)} harness error on ${basename(item.path)}: ${e.message}. Reloading.`);
    results.push({ ...item, file: basename(item.path), verdict: { kind: "harness" } });
    try {
      await page.send("Page.reload");
      await waitFor(`document.querySelector('input[type=file]')`, 30000);
      await js(`window.__long = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: 'longtask' }); 'ok'`);
    } catch { /* next photo will try again */ }
    continue;
  }
  const { r, wall, longest, newProblems } = out;
  const appMs = Number(/(\d+) ms/.exec(r.sure ?? "")?.[1] ?? NaN);
  const v = verdict(r);
  results.push({ ...item, file: basename(item.path), wall, appMs, longest, head: r.head, status: r.status, quarters: r.quarters, verdict: v, newProblems });
  console.log(`${String(n + 1).padStart(3)} ${item.label.padEnd(11)} ${basename(item.path).slice(0, 34).padEnd(34)} ${String(wall).padStart(6)} ms  blocked ${String(longest).padStart(4)} ms  ${v.kind}${v.group ? " " + v.group : ""}${v.groups ? " " + v.groups.join("+") : ""}${v.text ? ": " + v.text : ""}`);
  if ((n + 1) % 10 === 0) memory.push({ at: n + 1, renderer: await rendererMB(), heap: await heapMB() });
}
memory.push({ at: items.length, renderer: await rendererMB(), heap: await heapMB() });

// Cancel in the middle of a scan: the screen should go back to the start and stay there, and the next scan should
// show its own result, not the cancelled one. Skipped on builds without a Cancel button while scanning.
let cancel = "not run";
try {
  const photos = items.filter((x) => x.label !== "odd");
  await waitFor(`document.querySelector('input[type=file]')`, 15000);
  const { root } = await page.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await page.send("DOM.querySelector", { nodeId: root.nodeId, selector: "input[type=file]" });
  await page.send("DOM.setFileInputFiles", { nodeId, files: [photos[0].path] });
  const tapped = await js(`new Promise((done) => { const t0 = Date.now(); const tick = () => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Cancel'); if (b) { b.click(); done(Date.now() - t0); } else if (Date.now() - t0 > 3000) done(-1); else setTimeout(tick, 20); }; tick(); })`);
  if (tapped < 0) cancel = "no Cancel button while scanning";
  else {
    await sleep(4000);
    const after = await js(READ);
    const second = photos[1];
    const out = await scanOne(second);
    const v = verdict(out.r);
    cancel = after.idle && after.quarters.length === 0 && out.r.quarters.length === 4
      ? `ok (tapped after ${tapped} ms, screen stayed at the start, next scan gave ${v.kind}${v.group ? " " + v.group : ""})`
      : `FAILED: after cancel idle=${after.idle} quarters=${after.quarters.length}; next scan quarters=${out.r.quarters.length}`;
  }
} catch (e) {
  cancel = "harness error: " + e.message;
}
console.log("Cancel during a scan:", cancel);

// ---------- Summary ----------
const real = results.filter((r) => r.label !== "odd");
const by = {};
for (const r of real) {
  const s = (by[r.label] ??= { n: 0, said: 0, asked: 0, mixedIncl: 0, unsure: 0, wrongSaid: 0, wrongAsked: 0, saidElectronics: 0, failed: 0 });
  const v = r.verdict;
  s.n++;
  if (v.kind === "said") v.group === r.label ? s.said++ : s.wrongSaid++;
  else if (v.kind === "asked") v.group === r.label ? s.asked++ : s.wrongAsked++;
  else if (v.kind === "mixed") s.mixedIncl += v.groups.includes(r.label) ? 1 : 0;
  else if (v.kind === "unsure") s.unsure++;
  else s.failed++;
  if (r.label !== "electronics" && v.group === "electronics") s.saidElectronics++;
}
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "-");
console.log("\nPer true group: said right / asked with right first guess / mixed incl. / unsure / said WRONG / asked wrong / called electronics / failed");
for (const [g, s] of Object.entries(by)) {
  console.log(`  ${g.padEnd(11)} n=${String(s.n).padStart(3)}  right ${pct(s.said, s.n).padStart(4)}  asked ${pct(s.asked, s.n).padStart(4)}  mixed ${s.mixedIncl}  unsure ${pct(s.unsure, s.n).padStart(4)}  WRONG ${pct(s.wrongSaid, s.n).padStart(4)}  asked-wrong ${s.wrongAsked}  electronics ${s.saidElectronics}  failed ${s.failed}`);
}
const odd = results.filter((r) => r.label === "odd");
console.log("\nOdd files:");
for (const r of odd) console.log(`  ${r.file.padEnd(22)} ${r.verdict.kind === "stuck" ? "STUCK" : r.verdict.kind}${r.verdict.text ? ": " + r.verdict.text : ""}${r.verdict.group ? " " + r.verdict.group : ""}  ${r.wall} ms`);

const okScans = results.filter((r) => Number.isFinite(r.appMs));
const sorted = (a) => [...a].sort((x, y) => x - y);
const q = (a, p) => a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
const walls = sorted(okScans.slice(1).map((r) => r.wall));
const firstTen = okScans.slice(1, 11).map((r) => r.appMs);
const lastTen = okScans.slice(-10).map((r) => r.appMs);
const mean = (a) => Math.round(a.reduce((s, x) => s + x, 0) / Math.max(1, a.length));
console.log(`\nSpeed: first scan (includes loading the model) ${okScans[0]?.wall} ms. After that: median ${q(walls, 50)} ms, p95 ${q(walls, 95)} ms, max ${walls[walls.length - 1]} ms`);
console.log(`Drift: app-reported time, scans 2-11 mean ${mean(firstTen)} ms, last 10 mean ${mean(lastTen)} ms`);
const blocked = sorted(okScans.slice(1).map((r) => r.longest));
console.log(`Page blocked (longest single task per scan): median ${q(blocked, 50)} ms, p95 ${q(blocked, 95)} ms, max ${blocked[blocked.length - 1]} ms`);
console.log(`Harness errors (not app results): ${results.filter((r) => r.verdict.kind === "harness").length}`);
console.log("Memory (renderer MB / JS heap MB):", memory.map((m) => `${m.at}:${m.renderer}/${m.heap}`).join("  "));
console.log(`Page crashed: ${crashed ? "YES" : "no"}.  Console problems: ${problems.length}`);
for (const p of [...new Set(problems)].slice(0, 15)) console.log("  ", p);

writeFileSync(REPORT, JSON.stringify({ base: BASE, at: new Date().toISOString(), by, memory, crashed, cancel, problems, results }, null, 1));
try { await browser.send("Browser.close"); } catch { /* closing */ }
chrome.kill();
process.exit(0);
