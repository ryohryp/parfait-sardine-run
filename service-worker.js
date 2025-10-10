const CACHE_VERSION = "psr-v2025.10.10-01";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const APP_SHELL = [
  "/parfait-sardine-run/",
  "/parfait-sardine-run/index.html",
  "/parfait-sardine-run/manifest.webmanifest",
  "/parfait-sardine-run/styles.css",
  "/parfait-sardine-run/main.js",
  // ここにスプライト画像やBGMなど頻繁に使う大物を必要な分だけ追加
  // 例: "/parfait-sardine-run/assets/sprite.png",
  //     "/parfait-sardine-run/assets/bgm/title.ogg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data === 'PSR_SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("static-") && k !== STATIC_CACHE)
        .map((k) => caches.delete(k))
    );

    await self.clients.claim();

    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      client.postMessage('PSR_RELOAD');
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 1) ナビゲーション(HTML)は Network-First
  const isHTML = req.mode === "navigate" ||
                 (req.headers.get("accept") || "").includes("text/html");
  if (isHTML) {
    event.respondWith(
      fetch(req).then(res => {
        const resClone = res.clone();
        caches.open(STATIC_CACHE).then(c => c.put(req, resClone));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 2) それ以外（画像/音/JS/CSS）は Cache-First
  if (req.method === "GET") {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          const url = new URL(req.url);
          const sameOrigin = url.origin === location.origin;
          if (sameOrigin && res.status === 200 && res.type === "basic") {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then(c => c.put(req, clone));
          }
          return res;
        });
      })
    );
  }
});
