const BGM_SRC = '';
const SFX_SOURCES = {
  jump: '',
  hit: '',
  powerup: ''
};

const SFX_POOL_SIZE = 4;
const unlockables = new Set();
const sfxPools = new Map();
let stageBgm = null;
let audioUnlocked = false;
let unlockListenersBound = false;
let stageBgmWarned = false;
let pendingBgmPlay = false;

function registerUnlockableAudio(audio) {
  if (!audio) return;
  unlockables.add(audio);
  if (audioUnlocked) {
    tryUnlockAudio(audio);
  }
}

function tryUnlockAudio(audio) {
  if (!audio) return;
  try {
    const playPromise = audio.play();
    if (playPromise?.then) {
      playPromise.then(() => {
        try { audio.pause(); } catch { }
        try { audio.currentTime = 0; } catch { }
      }).catch(() => { });
    }
  } catch { }
}

let bgmVolume = 0.5;
let sfxVolume = 0.6;

function loadVolumeSettings() {
  try {
    const savedBgm = localStorage.getItem('psrun_bgm_volume');
    const savedSfx = localStorage.getItem('psrun_sfx_volume');
    if (savedBgm !== null) bgmVolume = parseFloat(savedBgm);
    if (savedSfx !== null) sfxVolume = parseFloat(savedSfx);
  } catch (e) {
    console.warn('Failed to load volume settings:', e);
  }
}

function setBgmVolume(vol) {
  bgmVolume = clamp(vol, 0, 1);
  if (stageBgm) {
    stageBgm.volume = bgmVolume;
  }
  localStorage.setItem('psrun_bgm_volume', bgmVolume);
}

function setSfxVolume(vol) {
  sfxVolume = clamp(vol, 0, 1);
  sfxPools.forEach(pool => {
    pool.forEach(audio => {
      audio.volume = sfxVolume;
    });
  });
  localStorage.setItem('psrun_sfx_volume', sfxVolume);
}

function getBgmVolume() { return bgmVolume; }
function getSfxVolume() { return sfxVolume; }

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function ensureStageBgm() {
  if (typeof Audio === 'undefined' || !BGM_SRC) return null;
  if (!stageBgm) {
    stageBgm = new Audio(BGM_SRC);
    stageBgm.loop = true;
    stageBgm.preload = 'auto';
    stageBgm.volume = bgmVolume;
    registerUnlockableAudio(stageBgm);
  }
  return stageBgm;
}

function unlockAllAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  ensureStageBgm();
  Object.keys(SFX_SOURCES).forEach(getSfxPool);
  unlockables.forEach(tryUnlockAudio);
  if (pendingBgmPlay) {
    const audio = ensureStageBgm();
    if (audio) {
      const playPromise = audio.play();
      if (playPromise?.catch) {
        playPromise.catch(() => { });
      }
    }
  }
}

function bindUnlockListeners() {
  if (unlockListenersBound || typeof window === 'undefined') return;
  unlockListenersBound = true;
  const handler = () => {
    unlockAllAudio();
  };
  const opts = { capture: true, once: true };
  window.addEventListener('pointerdown', handler, opts);
  window.addEventListener('touchstart', handler, opts);
  window.addEventListener('keydown', handler, opts);
}

function getSfxPool(name) {
  if (!SFX_SOURCES[name] || typeof Audio === 'undefined' || !SFX_SOURCES[name]) return null;
  if (!sfxPools.has(name)) {
    const src = SFX_SOURCES[name];
    const pool = Array.from({ length: SFX_POOL_SIZE }, () => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = sfxVolume;
      registerUnlockableAudio(audio);
      return audio;
    });
    sfxPools.set(name, pool);
  }
  return sfxPools.get(name);
}

function playSfx(name) {
  const pool = getSfxPool(name);
  if (!pool || !pool.length) return;
  const audio = pool.find(a => a.paused) || pool[0];
  if (!audio) return;
  try { audio.currentTime = 0; } catch { }
  const playPromise = audio.play();
  if (playPromise?.catch) {
    playPromise.catch(() => { });
  }
}

function playBgm({ reset = false } = {}) {
  const audio = ensureStageBgm();
  if (!audio) return;
  pendingBgmPlay = true;
  if (reset) {
    try { audio.currentTime = 0; } catch { }
  }
  const playPromise = audio.play();
  if (playPromise?.then) {
    playPromise.then(() => { pendingBgmPlay = false; }).catch(err => {
      if (err?.name === 'NotAllowedError') {
        bindUnlockListeners();
        if (!stageBgmWarned) {
          console.warn('[PSR] BGM playback blocked until user interacts with the page.');
          stageBgmWarned = true;
        }
      } else if (!stageBgmWarned) {
        console.warn('[PSR] Bgm play failed:', err);
        stageBgmWarned = true;
      }
    });
  }
}

function stopBgm() {
  if (!stageBgm) return;
  pendingBgmPlay = false;
  try { stageBgm.pause(); } catch { }
}

function initAudio() {
  loadVolumeSettings();
  bindUnlockListeners();
}

initAudio();

export { initAudio, playBgm, stopBgm, playSfx, registerUnlockableAudio, setBgmVolume, setSfxVolume, getBgmVolume, getSfxVolume };
