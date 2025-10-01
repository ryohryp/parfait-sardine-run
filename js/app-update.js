// ==== Update Helper (badge + version indicator) ====
const CURRENT_VERSION = '2025.09.30-02'; // ★version.json と揃える
const BASE_PATH = (() => {
  const url = new URL(import.meta.url);
  const segments = url.pathname.split('/');
  segments.pop();
  if (segments.length && segments[segments.length - 1] === 'js') segments.pop();
  const base = segments.join('/') || '/';
  return base.endsWith('/') ? base : base + '/';
})();
const BASE_URL = new URL(BASE_PATH, import.meta.url);
const SW_URL = new URL('sw.js', BASE_URL).toString();
const VERSION_JSON_URL = new URL('version.json', BASE_URL).toString();

function getBtn(){ return document.getElementById('updateBtn'); }
function getVerEl(){ return document.getElementById('appVersion'); }

export function ensureUpdateBtnOutside(){
  const btn = getBtn();
  if (!btn) return;
  const wrap = document.querySelector('#sceneWrap, .scene-wrap');
  if (wrap && wrap.contains(btn)){
    document.body.appendChild(btn);
  }
}

function setBadge(on){
  const btn = getBtn();
  if (!btn) return;
  btn.classList.toggle('has-update', !!on);
  try { localStorage.setItem('psr_update_badge', on ? '1' : '0'); } catch {}
}

function restoreBadge(){
  try { setBadge(localStorage.getItem('psr_update_badge') === '1'); } catch {}
}

function setVersionIndicator({ current = CURRENT_VERSION, latest = null, hasUpdate = null } = {}){
  const el = getVerEl();
  if (!el) return;

  if (hasUpdate === true) {
    const nextLabel = latest ? `v${latest}` : 'v—';
    el.textContent = `v${current} → ${nextLabel}`;
    el.classList.remove('is-latest');
    el.classList.add('is-outdated');
  } else if (hasUpdate === false) {
    el.textContent = `v${current}`;
    el.classList.remove('is-outdated');
    el.classList.add('is-latest');
  } else {
    el.textContent = `v${current}`;
    el.classList.remove('is-outdated', 'is-latest');
  }
}

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.register(SW_URL, { scope: BASE_PATH });

  reg.addEventListener('updatefound', () => {
    const nw = reg.installing;
    nw?.addEventListener('statechange', () => {
      if (nw.state === 'installed' && navigator.serviceWorker.controller) {
        setBadge(true);
        setVersionIndicator({ current: CURRENT_VERSION, hasUpdate: true });
      }
    });
  });

  return reg;
}

export async function forceUpdate() {
  const btn = getBtn();
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.7';
  }

  const reg = await navigator.serviceWorker.getRegistration(BASE_PATH);
  if (reg) {
    await reg.update();
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('psr-cache-')).map(k => caches.delete(k)));
  }

  setBadge(false);
  setVersionIndicator({ current: CURRENT_VERSION, latest: null, hasUpdate: false });

  const reload = () => location.reload();
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', reload, { once:true });
    setTimeout(reload, 1200);
  } else {
    reload();
  }

  if (btn) {
    setTimeout(() => {
      btn.disabled = false;
      btn.style.opacity = '';
    }, 4000);
  }
}

export async function checkLatestAndBadge() {
  try {
    const res = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`, { cache:'no-store' });
    const json = await res.json();
    const latest = String(json.appVersion || '');
    const hasUpdate = isNewer(latest, CURRENT_VERSION);
    setBadge(hasUpdate);
    setVersionIndicator({ current: CURRENT_VERSION, latest, hasUpdate });
    return { latest, hasUpdate };
  } catch {
    setVersionIndicator({ current: CURRENT_VERSION, latest: null, hasUpdate: null });
    return { latest: null, hasUpdate: null };
  }
}

function isNewer(a, b) {
  if (!a || !b) return false;
  const na = parseInt(a.replace(/\D/g,''), 10) || 0;
  const nb = parseInt(b.replace(/\D/g,''), 10) || 0;
  return na > nb;
}

export function initUpdateUI(){
  ensureUpdateBtnOutside();
  restoreBadge();
  setVersionIndicator({ current: CURRENT_VERSION });

  const tryBind = () => {
    const btn = getBtn();
    if (!btn) return false;
    if (!btn.__psrBound) {
      btn.addEventListener('click', async () => {
        await checkLatestAndBadge();
        await forceUpdate();
      });
      btn.__psrBound = true;
    }
    return true;
  };

  if (!tryBind()) {
    const id = setInterval(() => { if (tryBind()) clearInterval(id); }, 200);
    setTimeout(() => clearInterval(id), 5000);
  }
}
