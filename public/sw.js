// Qra Lia service worker — kept tiny on purpose.
// Navigations: network first, offline page as fallback. API calls and assets are never cached here.
const CACHE = "qra-lia-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // The icon shown on the offline page: network first, cached copy when offline.
  if (new URL(request.url).pathname === "/icon-192.png") {
    event.respondWith(fetch(request).catch(() => caches.match("/icon-192.png")));
  }
  // Everything else (photos, /api/*, scripts): straight to the network, never cached.
});
