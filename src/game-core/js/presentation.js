import { registerUnlockableAudio } from './audio.js';

/* ===== PSR Presentation Layer (Splash / Loader / VFX) ===== */

const baseUrl = import.meta.env.BASE_URL;

const PSR_ASSETS = [
  `${baseUrl}assets/sprite/player.png`,
  `${baseUrl}assets/sprite/enemies.png`,
  `${baseUrl}assets/bg/layer1.png`,
  `${baseUrl}assets/bg/layer2.png`,
  `${baseUrl}assets/sfx/jump.ogg`,
  `${baseUrl}assets/sfx/hit.ogg`,
  `${baseUrl}assets/bgm/stage.ogg`
];

const PSR_VER = 'psr-preload-v20240929-01';
const LOAD_TIMEOUT_MS = 10000;
const IMG_PATTERN = /\.(png|jpe?g|webp|gif|svg)$/i;
const AUDIO_PATTERN = /\.(ogg|mp3|wav|m4a|aac)$/i;

/* === Responsive scale (<=1 only) === */
const SCENE_BASE_W = 390;
const SCENE_BASE_H = 844;

let _resizeRaf = 0;
function setSceneScale() {
  const vw = window.innerWidth || document.documentElement.clientWidth || 0;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;
  const s = Math.min(vw / SCENE_BASE_W, vh / SCENE_BASE_H, 1);
  document.documentElement.style.setProperty('--scene-scale', s.toFixed(4));
}

function scheduleResize() {
  if (_resizeRaf) return;
  _resizeRaf = requestAnimationFrame(() => {
    _resizeRaf = 0;
    setSceneScale();
  });
}

addEventListener('resize', scheduleResize, { passive: true });
addEventListener('orientationchange', scheduleResize, { passive: true });

/* ====== Preloader utils ====== */

function withBustParam(src) {
  if (!src) return src;
  const hasQuery = src.includes('?');
  const param = `psr=${encodeURIComponent(PSR_VER)}`;
  return src + (hasQuery ? '&' : '?') + param;
}

function withTimeout(promise, ms = LOAD_TIMEOUT_MS) {
  return new Promise(resolve => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ ok: false, reason: 'timeout' });
      }
    }, ms);

    promise.then(value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: true, value });
    }).catch(reason => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, reason });
    });
  });
}

function loadImage(src) {
  const url = withBustParam(src);
  return withTimeout(new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error(`img error: ${url}`));
    img.src = url;
  }));
}

function loadAudio(src) {
  const url = withBustParam(src);
  return withTimeout(new Promise((resolve, reject) => {
    const audio = new Audio();
    const cleanup = () => {
      audio.oncanplaythrough = null;
      audio.onerror = null;
    };
    audio.preload = 'auto';
    audio.oncanplaythrough = () => { cleanup(); resolve(src); };
    audio.onerror = () => { cleanup(); reject(new Error(`audio error: ${url}`)); };
    try {
      audio.src = url;
      audio.load();
    } catch (err) {
      cleanup();
      reject(err);
    }
  }));
}

const splashEl = document.getElementById('splash');
const splashFillEl = document.querySelector('.splash-fill');
const splashPercentEl = document.querySelector('.splash-percent');

// Exposed so other modules can guard interactions until preload completes.
window.PSRUN_BOOT_READY = false;

function updateProgress(loaded, total) {
  const safeTotal = Math.max(1, Number(total) || 0);
  const pct = Math.floor((Math.max(0, loaded) / safeTotal) * 100);
  if (splashFillEl) splashFillEl.style.width = `${pct}%`;
  const labelEl = splashPercentEl || document.getElementById('splashLabel');
  if (labelEl) labelEl.textContent = `${pct}%`;
}

async function psrPreload(list) {
  const assets = Array.isArray(list) ? list.filter(Boolean) : [];
  if (!assets.length) {
    updateProgress(1, 1);
    return;
  }

  let loaded = 0;
  const total = assets.length;
  updateProgress(0, total);

  await Promise.all(assets.map(async (asset) => {
    const src = String(asset);
    const loader = IMG_PATTERN.test(src) ? loadImage : (AUDIO_PATTERN.test(src) ? loadAudio : loadImage);
    const result = await loader(src);
    if (!result.ok) {
      console.warn('[PSR] preload miss:', src, result.reason);
    }
    loaded++;
    updateProgress(loaded, total);
    return result;
  }));
}

async function psrBoot() {
  try {
    // 初期スケールを先に合わせてからプリロード（見た目のブレ最小化）
    setSceneScale();
    await psrPreload(PSR_ASSETS);
  } finally {
    setTimeout(() => {
      if (splashEl) splashEl.style.animation = 'psr_fadeOut 300ms ease forwards';
      setTimeout(() => splashEl?.remove(), 320);
      window.PSRUN_BOOT_READY = true;
    }, 200);
  }
}

function showStageTitle(text) {
  const el = document.getElementById('stageTitle');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1600);
}

function cameraShake(mag = 8, dur = 140) {
  const root = document.documentElement;
  const start = performance.now();
  function tick(t) {
    const progress = Math.min(1, (t - start) / dur);
    const amplitude = (1 - progress) * mag;
    const x = (Math.random() * 2 - 1) * amplitude;
    const y = (Math.random() * 2 - 1) * amplitude;
    root.style.transform = `translate(${x}px, ${y}px)`;
    if (progress < 1) requestAnimationFrame(tick);
    else root.style.transform = '';
  }
  requestAnimationFrame(tick);
}

function floatText(text, x, y, color = '#ffec8b') {
  const el = document.createElement('div');
  el.className = 'float-txt';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = color;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

const speedSe = typeof Audio !== 'undefined' ? new Audio(`${baseUrl}assets/sfx/whoosh.ogg`) : null;
if (speedSe) {
  speedSe.volume = 0.35;
  registerUnlockableAudio(speedSe);
}

function speedSE() {
  try {
    if (speedSe) {
      speedSe.currentTime = 0;
      speedSe.play();
    }
  } catch { }
}

document.addEventListener('DOMContentLoaded', psrBoot);

export {
  showStageTitle,
  cameraShake,
  floatText,
  speedSE,
  PSR_VER
};
