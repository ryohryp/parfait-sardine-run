const API_BASE = 'https://howasaba-code.com/wp-json/psr/v1';
const FP_KEY = 'psr_fp';
const QUEUE_KEY = 'psr_run_queue_v1';
const SHARE_KEY = 'psr_share_metrics';
const NICK_KEY = 'psr_nickname';

const hasWindow = typeof window !== 'undefined';
const storage = (() => {
  if (!hasWindow) return null;
  try {
    const ls = window.localStorage;
    if (!ls) return null;
    const probeKey = '__psr_runlog_probe__';
    ls.setItem(probeKey, '1');
    ls.removeItem(probeKey);
    return ls;
  } catch {
    return null;
  }
})();

let memoryFP = null;
let memoryQueue = [];

function readStorage(key){
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value){
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // ignore storage quota errors etc.
  }
}

function getFingerprint(){
  let fp = readStorage(FP_KEY) || memoryFP;
  if (!fp){
    const seed = (typeof crypto !== 'undefined' && crypto?.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    fp = seed;
    memoryFP = fp;
    if (storage){
      writeStorage(FP_KEY, fp);
    }
  }
  return fp;
}

async function postJson(path, body){
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(body ?? {})
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Network error: ${message}`);
  }

  if (!response.ok){
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`.trim());
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')){
    return response.text().catch(() => null);
  }
  return response.json();
}

function loadQueue(){
  if (storage){
    try {
      const raw = storage.getItem(QUEUE_KEY);
      if (raw){
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)){
          memoryQueue = parsed.slice();
          return parsed;
        }
      }
    } catch {
      // ignore parse errors, fall back to memory queue
    }
  }
  return memoryQueue.slice();
}

function saveQueue(queue){
  const normalized = Array.isArray(queue) ? queue.slice() : [];
  memoryQueue = normalized.slice();
  if (storage){
    try {
      storage.setItem(QUEUE_KEY, JSON.stringify(normalized));
    } catch {
      // ignore storage failures
    }
  }
}

function defaultNickname(){
  const stored = readStorage(NICK_KEY);
  if (typeof stored === 'string' && stored){
    return stored.slice(0, 64);
  }
  return null;
}

function defaultShare(){
  const stored = readStorage(SHARE_KEY);
  if (stored === '0') return false;
  return true;
}

class RunLogger {
  constructor(){
    this.active = null;
    this.fingerprint = getFingerprint();
    this.nicknameProvider = defaultNickname;
    this.shareProvider = defaultShare;
    const globalBuild = hasWindow ? (window.__PSR_BUILD || window.__PSR_VERSION_ACK || window.PSR_VER) : null;
    this.build = typeof globalBuild === 'string' && globalBuild ? globalBuild : 'dev';
    const ua = hasWindow ? navigator?.userAgent ?? '' : '';
    if (/iphone|ipad|ipod/i.test(ua)){
      this.device = 'iOS';
    } else if (/android/i.test(ua)){
      this.device = 'Android';
    } else {
      this.device = 'Web';
    }
  }

  setNicknameProvider(fn){
    if (typeof fn === 'function'){
      this.nicknameProvider = fn;
    } else {
      this.nicknameProvider = defaultNickname;
    }
  }

  setShareProvider(fn){
    if (typeof fn === 'function'){
      this.shareProvider = fn;
    } else {
      this.shareProvider = defaultShare;
    }
    void this.flushQueue();
  }

  async flushQueue(){
    if (!this.shareProvider()) return;
    const queue = loadQueue();
    if (!queue.length) return;
    if (hasWindow && !navigator.onLine) return;

    const remaining = [];
    for (const entry of queue){
      try {
        if (!entry || typeof entry !== 'object') continue;
        if (entry.kind === 'finish'){
          await postJson('/run/finish', entry.body);
        } else if (entry.kind === 'start'){
          await postJson('/run/start', entry.body);
        }
      } catch (error) {
        remaining.push(entry);
      }
    }
    saveQueue(remaining);
  }

  async start(){
    if (!this.shareProvider()){
      this.active = null;
      return null;
    }
    const nickname = (() => {
      try {
        return this.nicknameProvider?.() ?? null;
      } catch {
        return null;
      }
    })();

    const payload = {
      fingerprint: this.fingerprint,
      nickname,
      device: this.device,
      build: this.build
    };

    try {
      const json = await postJson('/run/start', payload);
      if (json && json.run_id && json.nonce){
        this.active = {
          run_id: json.run_id,
          nonce: json.nonce,
          startedAt: performance.now()
        };
      } else {
        this.active = null;
      }
      return json ?? null;
    } catch (error) {
      console.warn('[RunLog.start] failed:', error);
      this.active = null;
      return null;
    }
  }

  async finish(stats){
    if (!this.shareProvider()){
      this.active = null;
      return;
    }
    if (!this.active){
      console.warn('[RunLog.finish] skipped: no active run');
      return;
    }

    const durationSource = typeof stats?.duration === 'number'
      ? stats.duration
      : performance.now() - (this.active.startedAt ?? performance.now());

    const payload = {
      run_id: this.active.run_id,
      nonce: this.active.nonce,
      score: Math.max(0, Number.isFinite(stats?.score) ? Math.floor(stats.score) : 0),
      stage: typeof stats?.stage === 'string' && stats.stage ? stats.stage.slice(0, 64) : 'unknown',
      duration_ms: Math.max(0, Math.floor(durationSource)),
      coins: Number.isFinite(stats?.coins) ? Math.max(0, Math.floor(stats.coins)) : undefined,
      distance: Number.isFinite(stats?.distance) ? Math.max(0, Math.floor(stats.distance)) : undefined,
      result: typeof stats?.result === 'string' ? stats.result.slice(0, 32) : undefined,
      extras: stats?.extras || undefined
    };

    try {
      await postJson('/run/finish', payload);
    } catch (error) {
      const queue = loadQueue();
      queue.push({ kind: 'finish', body: payload });
      saveQueue(queue);
    } finally {
      this.active = null;
    }
  }
}

export const RunLog = new RunLogger();

if (hasWindow){
  window.addEventListener('online', () => {
    void RunLog.flushQueue();
  });
  setTimeout(() => {
    void RunLog.flushQueue();
  }, 0);
  window.PSR = window.PSR || {};
  window.PSR.RunLog = RunLog;
}
