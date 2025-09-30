/* ==== PSR Service Worker ==== */
const APP_VERSION = '2025.09.30-02';           // ★リリースごとに手動更新
const CACHE_NAME  = `psr-cache-${APP_VERSION}`;

// HTML/JSはネットワーク優先（更新を反映しやすくする）
const NETWORK_FIRST_PATHS = [
  '/', '/index.html', '/manifest.webmanifest'
];

// 最低限の事前キャッシュ
const PRECACHE = [
  '/parfait-sardine-run/',
  '/parfait-sardine-run/index.html',
  '/parfait-sardine-run/styles.css',
  '/parfait-sardine-run/js/main.js',
  '/parfait-sardine-run/version.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith('psr-cache-') && k !== CACHE_NAME)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  const { type } = e.data || {};
  if (type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (!sameOrigin) return; // 自サイトのみ制御

  if (isNetworkFirst(url)) {
    e.respondWith(networkFirst(e.request));
  } else {
    e.respondWith(staleWhileRevalidate(e.request));
  }
});

function isNetworkFirst(url) {
  return NETWORK_FIRST_PATHS.some(p =>
    url.pathname.endsWith(p) || url.pathname === '/parfait-sardine-run/'
  );
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(req, { cache: 'no-store' });
    cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return cache.match('/parfait-sardine-run/index.html');
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(res => {
    cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}
