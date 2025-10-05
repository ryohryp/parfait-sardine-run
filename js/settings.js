const hasWindow = typeof window !== 'undefined';
const storage = (() => {
  if (!hasWindow) return null;
  try {
    const ls = window.localStorage;
    if (!ls) return null;
    const probeKey = '__psr_settings_probe__';
    ls.setItem(probeKey, '1');
    ls.removeItem(probeKey);
    return ls;
  } catch {
    return null;
  }
})();

const memoryStore = new Map();

function readSetting(key, fallback){
  if (storage){
    try {
      const value = storage.getItem(key);
      if (value !== null) {
        memoryStore.set(key, value);
        return value;
      }
    } catch {
      // ignore and fall back
    }
  }
  if (memoryStore.has(key)) return memoryStore.get(key);
  return fallback;
}

function writeSetting(key, value){
  if (storage){
    try {
      storage.setItem(key, value);
    } catch {
      // ignore quota errors
    }
  }
  memoryStore.set(key, value);
}

const KEY_NICKNAME = 'psr_nickname';
const KEY_SHARE = 'psr_share_metrics';

function normalizeNickname(value){
  if (value == null) return '';
  return String(value).slice(0, 64);
}

export const Settings = {
  getNickname(){
    const raw = readSetting(KEY_NICKNAME, '');
    return typeof raw === 'string' ? raw.slice(0, 64) : '';
  },
  setNickname(value){
    const normalized = normalizeNickname(value);
    writeSetting(KEY_NICKNAME, normalized);
    return normalized;
  },
  getShare(){
    const raw = readSetting(KEY_SHARE, '1');
    return raw !== '0';
  },
  setShare(on){
    writeSetting(KEY_SHARE, on ? '1' : '0');
    return !!on;
  }
};

if (hasWindow){
  window.PSR = window.PSR || {};
  window.PSR.Settings = Settings;
}

(function(){
  const elements = {
    button: document.getElementById('settingsBtn'),
    overlay: document.getElementById('settingsOverlay'),
    close: document.getElementById('settingsClose'),
    name: document.getElementById('settingsPlayerName'),
    rename: document.getElementById('settingsRename')
  };

  function leaderboardModule(){
    return window.PSR?.Leaderboard || null;
  }

  function resolvePlayerName(){
    const stored = Settings.getNickname();
    if (stored) return stored;
    const lb = leaderboardModule();
    if (!lb) return 'ゲスト';
    if (typeof lb.ensurePlayerName === 'function'){
      try { return lb.ensurePlayerName(); }
      catch { }
    }
    if (typeof lb.loadPlayerName === 'function'){
      const loaded = lb.loadPlayerName();
      if (loaded) return loaded;
    }
    if (typeof lb.DEFAULT_PLAYER_NAME === 'string' && lb.DEFAULT_PLAYER_NAME){
      return lb.DEFAULT_PLAYER_NAME;
    }
    return 'ゲスト';
  }

  function updateNameDisplay(name){
    const target = elements.name;
    const resolved = typeof name === 'string' && name ? name : resolvePlayerName();
    const finalName = resolved || 'ゲスト';
    if (target){
      target.textContent = `現在の名前：${finalName}`;
    }
  }

  function openOverlay(){
    if (!elements.overlay) return;
    const UI = window.PSR?.UI;
    if (UI?.openOverlay){
      UI.openOverlay(elements.overlay);
    } else {
      elements.overlay.hidden = false;
      elements.overlay.classList.add('show');
      document.body?.classList?.add('modal-open');
    }
    updateNameDisplay();
  }

  function closeOverlay(){
    if (!elements.overlay) return;
    const UI = window.PSR?.UI;
    if (UI?.closeOverlay){
      UI.closeOverlay(elements.overlay);
    } else {
      elements.overlay.hidden = true;
      elements.overlay.classList.remove('show');
      if (!document.querySelector('.overlay:not([hidden])')){
        document.body?.classList?.remove('modal-open');
      }
    }
  }

  async function handleRename(){
    const lb = leaderboardModule();
    if (!lb) return;
    if (typeof lb.requestNameChange === 'function'){
      const result = await lb.requestNameChange();
      if (result?.name){
        updateNameDisplay(result.name);
      } else {
        updateNameDisplay();
      }
      return;
    }
    const current = resolvePlayerName();
    const input = prompt('新しい名前を入力してください。（1〜40文字）', current);
    if (input === null) return;
    const sanitized = (window.PSR?.Utils?.sanitizeName?.(input)) || '';
    if (!sanitized){
      alert('名前は1〜40文字で入力してください。');
      return;
    }
    const saved = typeof lb.savePlayerName === 'function'
      ? lb.savePlayerName(sanitized)
      : sanitized;
    const persisted = typeof saved === 'string' && saved ? saved : sanitized;
    Settings.setNickname(persisted);
    updateNameDisplay(persisted);
  }

  if (elements.button){
    elements.button.addEventListener('click', openOverlay);
  }
  if (elements.close){
    elements.close.addEventListener('click', closeOverlay);
  }
  if (elements.rename){
    elements.rename.addEventListener('click', handleRename);
  }

  window.addEventListener('psr:playerNameChanged', event => {
    const detailName = event?.detail?.name;
    if (typeof detailName === 'string'){
      Settings.setNickname(detailName);
    }
    updateNameDisplay(detailName);
  });

  updateNameDisplay();
})();
