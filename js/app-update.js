// ==== Update Helper ====
const CURRENT_VERSION = '2025.09.30-02'; // ★リリースごとに手動更新
const VERSION_JSON_URL = '/parfait-sardine-run/version.json';

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.register('/parfait-sardine-run/sw.js');
  reg.addEventListener('updatefound', () => {
    const nw = reg.installing;
    nw?.addEventListener('statechange', () => {
      if (nw.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateAvailableBanner();
      }
    });
  });
  return reg;
}

function showUpdateAvailableBanner() {
  document.getElementById('updateBanner')?.classList.add('show');
}

export async function forceUpdate() {
  const reg = await navigator.serviceWorker.getRegistration('/parfait-sardine-run/');
  if (reg) {
    await reg.update();
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('psr-cache-')).map(k => caches.delete(k)));
  }
  const reloader = () => location.reload();
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', reloader, { once: true });
    setTimeout(() => location.reload(), 1200);
  } else {
    location.reload();
  }
}

export async function checkLatestAndNotify({ silent = false } = {}) {
  try {
    const res = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`, { cache: 'no-store' });
    const json = await res.json();
    const latest = String(json.appVersion || '');
    if (isNewer(latest, CURRENT_VERSION)) {
      showUpdateAvailableBanner();
      if (!silent && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          const n = new Notification('最新版が利用可能', {
            body: `タップで更新（${latest}）`,
            tag: 'psr-update',
          });
          n.onclick = () => forceUpdate();
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') new Notification('最新版が利用可能', { body: latest, tag: 'psr-update' });
        }
      }
      return { hasUpdate: true, latest };
    }
    return { hasUpdate: false, latest };
  } catch (e) {
    if (!silent) console.warn('version.json チェック失敗', e);
    return { hasUpdate: false };
  }
}

// "2025.09.30-02" を比較できる簡易版
function isNewer(a, b) {
  if (!a || !b) return false;
  const na = a.replace(/\D/g,'')|0;
  const nb = b.replace(/\D/g,'')|0;
  return na > nb;
}
