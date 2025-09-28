const CACHE_VERSION = "psr-v1.0.0";
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

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("static-") && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 画像・音・JS・CSSはキャッシュ優先
  if (req.method === "GET") {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          // 同一オリジンのみキャッシュ
          try {
            const url = new URL(req.url);
            const sameOrigin = url.origin === self.origin || url.origin === location.origin;
            if (sameOrigin && res && res.status === 200 && res.type === "basic") {
              const resClone = res.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(req, resClone));
            }
          } catch (_) {}
          return res;
        }).catch(() => cached || Response.error());
      })
    );
  }
});
