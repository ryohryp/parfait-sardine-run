// --- Parfait & Sardine RUN! Service Worker (safe caching) ---
const SW_VERSION = 'v20251004-02';           // ← バージョン必ず更新
const CACHE_NAME = `psr-cache-${SW_VERSION}`;
const API_PREFIX = '/wp-json/psr/v1/';

self.addEventListener('install', (event) => {
  // 旧SWを待たず即座に切替
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 古いキャッシュを掃除
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) 非GET/Range/ダウンロード系は素通し
  if (req.method !== 'GET' || req.headers.has('range')) {
    event.respondWith(fetch(req));
    return;
  }

  // 2) コメントAPIなどは常にネット優先 & 非キャッシュ
  if (url.pathname.startsWith(API_PREFIX)) {
    event.respondWith(fetch(req)); // ここは cache しない
    return;
  }

  // 3) クロスオリジンはキャッシュしない（CDN等でopaqueになることが多く無駄）
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  // 4) 通常アセット: ネット優先 + 成功(200)のみキャッシュ、失敗はキャッシュフォールバック
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      // 206/304/opaques/partial は cache.put しない
      const cacheable =
        res && res.status === 200 &&
        !res.headers.has('Content-Range') &&
        res.type !== 'opaque';

      if (cacheable) {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(req, res.clone());   // ← ここが line 87 対策
        } catch (e) {
          // cache.put 失敗は握りつぶして配信は続行
          // console.warn('cache.put skipped:', e);
        }
      }
      return res;
    } catch (e) {
      // ネット失敗時はキャッシュから
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      throw e;
    }
  })());
});
