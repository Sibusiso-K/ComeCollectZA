// ComeCollectZA service worker.
// - Static files (app code, icons, the classifier head): cache first, so the app opens fast and works offline.
// - Pages: network first, falling back to the last copy, then to a small offline page.
// - Never cached: API calls and the personal money screen.
// The vision model and its runtime are cached separately, by the browser and the model library.

const VERSION = "v1";
const STATIC_CACHE = "ccza-static-" + VERSION;
const PAGE_CACHE = "ccza-pages-" + VERSION;

const OFFLINE_PAGE =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  "<title>Offline</title></head>" +
  '<body style="font-family:system-ui,sans-serif;padding:24px;max-width:28rem;margin:auto">' +
  "<h1>You are offline</h1><p>Prices need a signal. Open the app again when you are back online.</p></body></html>";

self.addEventListener("install", () => {
  self.skipWaiting();
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
    const response = await fetch(request);
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
    url.pathname.startsWith("/models/")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate" && !url.pathname.startsWith("/reclaimer/money")) {
    event.respondWith(networkFirst(request));
  }
});
