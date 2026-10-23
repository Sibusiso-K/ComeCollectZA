// ComeCollectZA service worker.
// - Static files (app code, icons, the scanner model, head and runtime): cache first, so the app opens fast and
//   the scanner works with no data after its first download.
// - Pages: network first, falling back to the last copy, then to a small offline page.
// - Never cached: API calls and the personal money screen.
// - The reclaimer's main pages are saved at install, so the app opens with no signal.

const VERSION = "v4";
const STATIC_CACHE = "ccza-static-" + VERSION;
const PAGE_CACHE = "ccza-pages-" + VERSION;

const OFFLINE_PAGE =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  "<title>Offline</title></head>" +
  '<body style="font-family:system-ui,sans-serif;padding:24px;max-width:28rem;margin:auto">' +
  "<h1>You are offline</h1><p>Prices need a signal. Open the app again when you are back online.</p></body></html>";

// Small pages only. The 38 MB scanner is saved the first time someone uses it, not at install, to spare data.
const CORE_PAGES = ["/", "/home", "/sell", "/prices"];

// Saves a page and the scripts and styles it needs. On a first visit the page loads before this worker
// controls it, so its files never pass through the fetch handler below.
async function savePage(page) {
  const response = await fetch(page);
  if (!response.ok) return;
  const html = await response.clone().text();
  await (await caches.open(PAGE_CACHE)).put(page, response);
  const assets = new Set(html.match(/\/_next\/static\/[\w./~-]+/g) || []);
  const staticCache = await caches.open(STATIC_CACHE);
  await Promise.all([...assets].map((asset) => staticCache.add(asset).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all(CORE_PAGES.map((page) => savePage(page).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !n.endsWith(VERSION)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    // no-cache asks the server whether the page changed (a small 304 if not), so a new deploy shows at once.
    const response = await fetch(new Request(request, { cache: "no-cache" }));
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const hit = await cache.match(request);
    return hit || new Response(OFFLINE_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/models/") ||
    url.pathname.startsWith("/ort/")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate" && !url.pathname.startsWith("/money")) {
    event.respondWith(networkFirst(request));
  }
});
