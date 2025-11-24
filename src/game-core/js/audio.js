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

function ensureStageBgm() {
  if (typeof Audio === 'undefined' || !BGM_SRC) return null;
  if (!stageBgm) {
    stageBgm = new Audio(BGM_SRC);
    stageBgm.loop = true;
    stageBgm.preload = 'auto';
    stageBgm.volume = 0.5;
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
      audio.volume = 0.6;
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
  bindUnlockListeners();
}

initAudio();

export { initAudio, playBgm, stopBgm, playSfx, registerUnlockableAudio };
