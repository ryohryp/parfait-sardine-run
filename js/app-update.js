// js/app-update.js  (badge-killer rev3)
// 目的：押下直後・次回起動後ともに赤丸が復活しないよう完全対策
// - 既読ACK: LS_ACK_KEY
// - 端末適用版: LS_INST_KEY
// - 保険(次回起動で同期): LS_ACK_PENDING_KEY
//
// 公開: registerSW, initUpdateUI, checkLatestAndBadge, ensureUpdateBtnOutside

const VERSION_URL = 'version.json';
const LS_ACK_KEY = 'psrun_version_acked_v1';
const LS_INST_KEY = 'psrun_version_installed_v1';
const LS_ACK_PENDING_KEY = 'psrun_version_ack_pending_v1';

let latestVersion = null;
let regCache = null;

const $ = (s)=>document.querySelector(s);

function setText(el, text){ if(el) el.textContent = text ?? ''; }

function hardUnbadge(){
  const btn = $('#updateBtn');
  if (btn){
    btn.classList.remove('hasUpdate','update-available','showBadge','needsUpdate');
    btn.removeAttribute('data-has-update');
    btn.removeAttribute('data-update'); btn.removeAttribute('data-update-available');
    btn.removeAttribute('aria-busy');
  }
  const label = $('#appVersion');
  if (label){
    label.classList.remove('hasUpdate','update-available');
    label.removeAttribute('data-has-update'); label.removeAttribute('data-update'); label.removeAttribute('data-diff');
  }
}

function showVersion(ver, prev){
  const label = $('#appVersion');
  if (!label) return;
  if (ver && prev && ver !== prev){
    setText(label, `v${prev} → v${ver}`);
    label.classList.add('hasUpdate');
    label.setAttribute('data-has-update','1');
  } else {
    setText(label, ver ? `v${ver}` : 'v—');
    label.classList.remove('hasUpdate');
    label.removeAttribute('data-has-update');
  }
}

async function fetchVersionNoStore(){
  const res = await fetch(VERSION_URL, {
    cache: 'no-store',
    headers: { 'Cache-Control':'no-cache, no-store, must-revalidate', 'Pragma':'no-cache' }
  });
  if(!res.ok) throw new Error(`version.json HTTP ${res.status}`);
  return res.json();
}

export async function registerSW(){
  if(!('serviceWorker' in navigator)) return null;
  try{
    regCache = await navigator.serviceWorker.register('/sw.js');
    return regCache;
  }catch(e){
    console.warn('[app-update] SW register failed:', e);
    return null;
  }
}

function setBadge(on){
  const btn = $('#updateBtn');
  if (!btn) return;
  btn.classList.toggle('hasUpdate', !!on);
  if (on) btn.setAttribute('data-has-update','1'); else btn.removeAttribute('data-has-update');
}

function readLS(key){ try{ return localStorage.getItem(key) || ''; }catch{ return ''; } }
function writeLS(key, val){ try{ localStorage.setItem(key, val); }catch{} }
function delLS(key){ try{ localStorage.removeItem(key); }catch{} }

function ackLatestVersionSync(ver){
  if (!ver) return;
  writeLS(LS_ACK_KEY, ver);
  writeLS(LS_INST_KEY, ver);
  // 次回起動の保険（万一 ACK が反映されていないときに自己修復）
  writeLS(LS_ACK_PENDING_KEY, ver);
  // UI 即時反映
  hardUnbadge();
  setBadge(false);
  showVersion(ver, null);
  window.__PSR_VERSION_ACK = ver;
  try{ window.dispatchEvent(new CustomEvent('psr:versionAcked',{detail:{version:ver}})); }catch{}
}

function finalizePendingAck(ver){
  // 起動時に pending==latest なら ACK/INST を強制同期して pending を消す
  const pending = readLS(LS_ACK_PENDING_KEY);
  if (ver && pending && pending === ver){
    writeLS(LS_ACK_KEY, ver);
    writeLS(LS_INST_KEY, ver);
    delLS(LS_ACK_PENDING_KEY);
  }
}

// ★ここがポイント：バッジ点灯条件を「最新が ACK/INST/PENDING のどれにも一致しない場合」に限定
export async function checkLatestAndBadge(){
  let prevInstalled = readLS(LS_INST_KEY);

  try{
    const json = await fetchVersionNoStore();
    latestVersion = String(json.appVersion || '').trim() || null;
  }catch(e){
    console.warn('[app-update] version fetch failed:', e);
    showVersion(prevInstalled || null, null);
    return;
  }

  // 起動時に pending を確定反映
  finalizePendingAck(latestVersion);

  const ack = readLS(LS_ACK_KEY);
  const pending = readLS(LS_ACK_PENDING_KEY);

  const alreadyKnown =
    (latestVersion && ack === latestVersion) ||
    (latestVersion && prevInstalled === latestVersion) ||
    (latestVersion && pending === latestVersion);

  setBadge(!alreadyKnown);

  // 差分表示（未既読なら prev→latest、既読なら latest 単体）
  const prevForDiff = !alreadyKnown ? (ack || prevInstalled || '') : null;
  showVersion(latestVersion, prevForDiff);
}

function postMessageToSW(sw, msg){ try{ sw?.postMessage?.(msg); }catch{} }

async function updateSWAndReload(){
  if(!('serviceWorker' in navigator)) return;
  const reg = regCache || await navigator.serviceWorker.getRegistration();

  if (reg?.waiting){
    postMessageToSW(reg.waiting, { type:'SKIP_WAITING' });
  }
  const onCtl = ()=> window.location.reload();
  navigator.serviceWorker.addEventListener('controllerchange', onCtl, { once:true });

  try{ await reg?.update(); }catch{}

  setTimeout(()=>{
    if (navigator.serviceWorker.controller) window.location.reload();
  }, 1500);
}

export function initUpdateUI(){
  const btn = $('#updateBtn');
  if (!btn) return;

  btn.addEventListener('click', async (e)=>{
    e.preventDefault();
    // 最新版が未取得ならここで再取得
    if(!latestVersion){
      try{
        const json = await fetchVersionNoStore();
        latestVersion = String(json.appVersion || '').trim() || null;
      }catch{}
    }
    // 既読ACK（同期書き込み＋保険キー）
    ackLatestVersionSync(latestVersion);
    // SW 更新適用
    await updateSWAndReload();
  }, { passive:false });

  // 他タブで ACK したら即同期（復活防止）
  window.addEventListener('storage', (ev)=>{
    if (ev.key === LS_ACK_KEY || ev.key === LS_INST_KEY || ev.key === LS_ACK_PENDING_KEY){
      // もう一度判定して UI を揃える
      checkLatestAndBadge();
    }
  });
}

export function ensureUpdateBtnOutside(){
  const wrap = document.querySelector('#sceneWrap, .scene-wrap');
  const btn = $('#updateBtn');
  const ver = $('#appVersion');
  if (wrap && btn && wrap.contains(btn)) document.body.appendChild(btn);
  if (wrap && ver && wrap.contains(ver)) document.body.appendChild(ver);
}
