/* ==== PSR Service Worker ==== */
const APP_VERSION = '2025.09.30-02';           // ★リリースごとに手動更新
const CACHE_NAME  = `psr-cache-${APP_VERSION}`;

const BASE_URL = new URL('./', self.location);
const BASE_PATH = BASE_URL.pathname;
const BASE_PATH_TRIMMED = BASE_PATH.endsWith('/') && BASE_PATH !== '/' ? BASE_PATH.slice(0, -1) : BASE_PATH;
const FALLBACK_INDEX_URL = new URL('index.html', BASE_URL).toString();
// 最低限の事前キャッシュ対象
const PRECACHE_ASSETS = [
  '.',
  'index.html',
  'styles.css',
  'main.js',
  'manifest.webmanifest',
  'version.json'
];
const PRECACHE = PRECACHE_ASSETS.map((asset) => new URL(asset, BASE_URL).toString());

// HTML/JSはネットワーク優先（更新を反映しやすくする）
const NETWORK_FIRST_PATHS = new Set([
  '/',
  BASE_PATH,
  BASE_PATH_TRIMMED,
  new URL('index.html', BASE_URL).pathname,
  new URL('manifest.webmanifest', BASE_URL).pathname
]);


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
  const pathname = url.pathname;
  if (NETWORK_FIRST_PATHS.has(pathname)) return true;
  if (pathname.endsWith('/')) return NETWORK_FIRST_PATHS.has(pathname.slice(0, -1));
  return false;
}

function isCacheableResponse(res) {
  if (!res) return false;
  if (!res.ok) return false;
  if (res.status === 206) return false;
  if (res.type === 'opaque' || res.type === 'opaqueredirect') return false;
  return true;
}

async function safeCachePut(cache, req, res) {
  if (!isCacheableResponse(res)) return;
  try {
    await cache.put(req, res.clone());
  } catch (err) {
    console.warn('[SW] cache.put failed for', req.url, err);
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(req, { cache: 'no-store' });
    await safeCachePut(cache, req, res);
    return res;
  } catch (err) {
    console.warn('[SW] networkFirst fallback for', req.url, err);
    const cached = await cache.match(req);
    if (cached) return cached;
    const fallback = await cache.match(FALLBACK_INDEX_URL);
    if (fallback) return fallback;
    return new Response('Offline', { status: 504, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then(async (res) => {
      await safeCachePut(cache, req, res);
      return res;
    })
    .catch((err) => {
      console.warn('[SW] staleWhileRevalidate fetch failed for', req.url, err);
      return cached || new Response('Offline', { status: 504, statusText: 'Offline' });
    });

  return cached || fetchPromise;
}

