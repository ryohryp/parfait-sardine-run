// ==== Update Helper (badge version) ====
const CURRENT_VERSION = '2025.09.30-02'; // ★version.json と揃える
const VERSION_JSON_URL = '/parfait-sardine-run/version.json';

function getBtn(){ return document.getElementById('updateBtn'); }

function setBadge(on){
  const btn = getBtn();
  if (!btn) return;
  btn.classList.toggle('has-update', !!on);
  try { localStorage.setItem('psr_update_badge', on ? '1' : '0'); } catch {}
}

function restoreBadge(){
  try {
    const on = localStorage.getItem('psr_update_badge') === '1';
    setBadge(on);
  } catch {}
}

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  // SW スコープは /parfait-sardine-run/ に限定
  const reg = await navigator.serviceWorker.register('/parfait-sardine-run/sw.js');

  // 新 SW 検出時（＝更新が利用可能）にバッジON
  reg.addEventListener('updatefound', () => {
    const nw = reg.installing;
    nw?.addEventListener('statechange', () => {
      if (nw.state === 'installed' && navigator.serviceWorker.controller) {
        setBadge(true);
      }
    });
  });

  return reg;
}

export async function forceUpdate() {
  // クリック直後の連打ガード
  const btn = getBtn();
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.7';
  }

  // 1) SW を更新
  const reg = await navigator.serviceWorker.getRegistration('/parfait-sardine-run/');
  if (reg) {
    await reg.update();
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  // 2) キャッシュ全削除（自前の命名のみ）
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('psr-cache-')).map(k => caches.delete(k)));
  }

  // 強制更新後のバッジは即座に消す
  setBadge(false);

  // 3) コントローラ切替 → リロード
  const reload = () => location.reload();
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', reload, { once:true });
    setTimeout(reload, 1200);
  } else {
    reload();
  }

  // 念のためフェイルセーフでボタンを復帰
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
    setBadge(isNewer(latest, CURRENT_VERSION));
  } catch {
    // 失敗時はバッジ状態維持
  }
}

// "2025.09.30-02" 形式の簡易比較
function isNewer(a, b) {
  if (!a || !b) return false;
  const na = parseInt(a.replace(/\D/g,''), 10) || 0;
  const nb = parseInt(b.replace(/\D/g,''), 10) || 0;
  return na > nb;
}

// 初期化ヘルパー（main.js から呼ぶ）
export function initUpdateUI(){
  // 復元（前回の検知を反映）
  restoreBadge();

  // ボタンクリック（存在するまでリトライ）
  const tryBind = () => {
    const btn = getBtn();
    if (!btn) return false;
    if (!btn.__psrBound) {
      btn.addEventListener('click', async () => {
        // 手動チェック → あれば更新、なければ通知
        await checkLatestAndBadge();
        await forceUpdate(); // 常に更新動作（ユーザー意思が明確なので）
      });
      btn.__psrBound = true;
    }
    return true;
  };

  if (!tryBind()) {
    // DOM 未生成なら少し待って再試行
    const id = setInterval(() => { if (tryBind()) clearInterval(id); }, 200);
    setTimeout(() => clearInterval(id), 5000);
  }
}
