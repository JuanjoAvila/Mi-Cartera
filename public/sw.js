// Mi Cartera — service worker (network-first para que SIEMPRE cargue la última versión)
const VERSION = "3.2.0-2026-06-18-038814";
const CACHE = "micartera-" + VERSION;
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.hostname.indexOf("script.google.com") !== -1) return;       // datos siempre frescos
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // NETWORK-FIRST: red primero, cae a caché solo sin conexión
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match("./index.html")))
  );
});
