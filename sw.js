// BF6 Meta PWA v0.8.2: network-first HTML/JS/CSS to prevent mixed versions.
const CACHE = "bf6meta-v14";
const APP_FILES = [
  "./", "./index.html", "./loadouts.css?v=0.8.2", "./loadouts.js?v=0.8.2",
  "./data/loadouts.json", "./data/weapon-evidence.json", "./data/weapons.json", "./data/catalog.json",
  "./data/status.json", "./manifest.webmanifest", "./icons/icon.svg",
  "./icons/icon-192.png", "./icons/icon-512.png"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(APP_FILES))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith("bf6meta-") && key !== CACHE)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const isCurrentAppShell = event.request.mode === "navigate" ||
    /\/(?:index\.html|loadouts\.js|loadouts\.css)$/.test(url.pathname);
  const isData = url.pathname.includes("/data/");
  const networkFirst = isCurrentAppShell || isData;
  if (networkFirst) {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
      }
      return response;
    }).catch(async () => (await caches.match(event.request)) || 
      new Response("Offline: BF6 Meta kann nicht geladen werden.", {status:503, headers:{"Content-Type":"text/plain; charset=utf-8"}})));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  })));
});
