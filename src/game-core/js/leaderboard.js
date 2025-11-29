(function () {
  window.PSR = window.PSR || {};
  const Utils = window.PSR.Utils || {};

  const elements = {
    button: document.getElementById('leaderboardBtn'),
    overlay: document.getElementById('leaderboardOverlay'),
    close: document.getElementById('leaderboardClose'),
    refresh: document.getElementById('leaderboardRefresh'),
    status: document.getElementById('leaderboardStatus'),
    list: document.getElementById('leaderboardList'),
    jump: document.getElementById('leaderboardJump'),
    rename: document.getElementById('leaderboardRename'),
    playerName: document.getElementById('leaderboardPlayerName')
  };

  const PLAYER_NAME_KEY = 'psrun_player_name_v1';
  const DEFAULT_PLAYER_NAME = 'ゲスト';

  function readStoredPlayerName() {
    try { return localStorage.getItem(PLAYER_NAME_KEY) || ''; }
    catch { return ''; }
  }

  function writeStoredPlayerName(name) {
    try { localStorage.setItem(PLAYER_NAME_KEY, name); }
    catch { }
  }

  function loadPlayerName() {
    const raw = readStoredPlayerName();
    const sanitized = Utils.sanitizeName?.(raw) || '';
    if (sanitized) {
      if (raw !== sanitized) writeStoredPlayerName(sanitized);
      return sanitized;
    }
    return '';
  }

  function updateNameLabel(name) {
    if (!elements.playerName) return;
    const displayName = name || loadPlayerName() || DEFAULT_PLAYER_NAME;
    elements.playerName.textContent = `現在の名前：${displayName}`;
  }

  function dispatchNameChanged(name) {
    const finalName = name || loadPlayerName() || DEFAULT_PLAYER_NAME;
    updateNameLabel(finalName);
    try {
      window.dispatchEvent(new CustomEvent('psr:playerNameChanged', { detail: { name: finalName } }));
    } catch { }
  }

  function ensurePlayerName() {
    const current = loadPlayerName();
    if (current) return current;
    writeStoredPlayerName(DEFAULT_PLAYER_NAME);
    dispatchNameChanged(DEFAULT_PLAYER_NAME);
    return DEFAULT_PLAYER_NAME;
  }

  function savePlayerName(name) {
    const sanitized = Utils.sanitizeName?.(name) || '';
    const finalName = sanitized || DEFAULT_PLAYER_NAME;
    writeStoredPlayerName(finalName);
    dispatchNameChanged(finalName);
    return finalName;
  }

  const initialPlayerName = ensurePlayerName();
  updateNameLabel(initialPlayerName);

  function leaderboardUrl() {
    const base = (typeof window !== 'undefined' && window.PSRUN_API_BASE)
      ? String(window.PSRUN_API_BASE).trim().replace(/\/$/, '')
      : 'https://howasaba-code.com/wp-json/psrun/v2';
    return base.endsWith('/leaderboard') ? base : `${base}/leaderboard`;
  }

  function describeCharLabel(key) {
    const data = window.PSR.GameData?.characters;
    if (!key || !data) return key || '-';
    const entry = data[key];
    return entry ? `${entry.emoji} ${entry.name}` : key;
  }

  function formatDate(entry) {
    const raw = entry?.date ?? entry?.time ?? entry?.createdAt ?? entry?.created_at ?? entry?.updatedAt ?? entry?.updated_at;
    if (raw === undefined || raw === null) return '-';

    function parseDate(value) {
      if (typeof value === 'number') {
        return new Date(value < 1e12 ? value * 1000 : value);
      }
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (/^\d+$/.test(trimmed)) {
        const num = Number(trimmed);

        return new Date(trimmed.length <= 10 ? num * 1000 : num);
      }
      const baseMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})([T\s])(\d{2}:\d{2}:\d{2})(\.\d+)?$/);
      if (baseMatch && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
        const [, datePart, , timePart, frac = ''] = baseMatch;
        return new Date(`${datePart}T${timePart}${frac}+09:00`);

      }
      return new Date(trimmed);
    }

    const dt = parseDate(raw);
    if (dt && !Number.isNaN(dt.getTime())) {
      try {

        return new Intl.DateTimeFormat('ja-JP', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false
        }).format(dt);
      } catch {
        return dt.toISOString().slice(0, 19).replace('T', ' ');

      }
    }
    return String(raw);
  }


  function readNumericField(entry, key, fallback) {
    if (!entry || typeof entry !== 'object') return fallback;
    const direct = entry[key];
    if (direct !== undefined && direct !== null && direct !== '') {
      const num = Number(direct);
      if (!Number.isNaN(num)) return num;
    }
    const meta = entry.meta || entry.fields || entry.extra || entry.attributes;
    if (meta && typeof meta === 'object') {
      const nested = meta[key];
      if (nested !== undefined && nested !== null && nested !== '') {
        const num = Number(nested);
        if (!Number.isNaN(num)) return num;
      }
    }
    return fallback;
  }


  function buildUrlWithParams(baseUrl, params) {
    if (!params || !Object.keys(params).length) return baseUrl;
    try {
      const origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : undefined;
      const url = new URL(baseUrl, origin);
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        url.searchParams.set(key, value);
      });
      return url.toString();
    } catch {
      const query = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      if (!query) return baseUrl;
      return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${query}`;
    }
  }

  async function fetchLeaderboardPage(url) {
    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    try {
      return await res.json();
    } catch (err) {
      throw new Error('Invalid leaderboard response');
    }
  }

  async function fetchLeaderboardEntries(maxEntries) {
    const base = leaderboardUrl();

    const strategies = [
      { sizeParam: 'per_page', pageParam: 'page' },
      { sizeParam: 'limit', pageParam: 'page' },
      { sizeParam: 'perPage', pageParam: 'page' },
      { sizeParam: 'limit', offsetParam: 'offset' },
      { sizeParam: 'per_page', offsetParam: 'offset' }
    ];
    const candidateSizes = Array.from(new Set([
      Math.min(100, Math.max(1, maxEntries)),
      Math.min(50, Math.max(1, maxEntries)),
      Math.min(40, Math.max(1, maxEntries)),
      Math.min(20, Math.max(1, maxEntries)),
      Math.min(10, Math.max(1, maxEntries))
    ])).filter(size => size > 0).sort((a, b) => b - a);
    const collected = [];
    const seenEntries = new Set();
    let paginationSucceeded = false;
    let lastError = null;

    function entryKey(entry) {
      const fallback = entry?.date ?? entry?.time ?? entry?.createdAt ?? entry?.created_at ?? entry?.updatedAt ?? entry?.updated_at ?? '';
      return [
        entry?.id ?? '',
        entry?.rank ?? '',
        entry?.name ?? '',
        entry?.score ?? '',
        fallback
      ].join('|');
    }

    async function tryStrategy(strategy, pageSize) {
      const seenThisStrategy = new Set();
      const maxPages = Math.max(10, Math.ceil(maxEntries / Math.max(1, pageSize)) + 2);

      for (let pageIndex = 0; pageIndex < maxPages && collected.length < maxEntries; pageIndex += 1) {
        const params = {};
        if (strategy.sizeParam) {
          params[strategy.sizeParam] = String(pageSize);
        }
        if (strategy.pageParam) {
          params[strategy.pageParam] = String(pageIndex + 1);
        }
        if (strategy.offsetParam) {
          params[strategy.offsetParam] = String(pageIndex * pageSize);
        }

        let entries = [];
        try {
          const raw = await fetchLeaderboardPage(buildUrlWithParams(base, params));
          entries = normalizeLeaderboardEntries(raw);
        } catch (err) {
          lastError = err;
          break;
        }

        if (!entries.length) {
          break;
        }

        let added = 0;
        entries.forEach(entry => {
          const key = entryKey(entry);
          if (seenEntries.has(key)) return;
          seenEntries.add(key);
          seenThisStrategy.add(key);
          collected.push(entry);
          added += 1;
        });

        if (entries.length < pageSize) {
          break;
        }

        if (added === 0) {
          break;
        }
      }

      return seenThisStrategy.size > 0;
    }

    for (const strategy of strategies) {
      if (collected.length >= maxEntries) break;
      for (const pageSize of candidateSizes) {
        if (collected.length >= maxEntries) break;
        const succeeded = await tryStrategy(strategy, pageSize);
        if (succeeded) {
          paginationSucceeded = true;
          if (collected.length >= maxEntries) break;
        }
      }
      if (paginationSucceeded && collected.length >= maxEntries) {
        break;
      }
    }

    const attempts = [
      { limit: String(maxEntries) },
      { per_page: String(maxEntries) },
      {}
    ];

    try {
      for (const params of attempts) {
        if (collected.length >= maxEntries) break;
        try {
          const raw = await fetchLeaderboardPage(buildUrlWithParams(base, params));
          const entries = normalizeLeaderboardEntries(raw);
          if (!entries.length) continue;

          const uniqueEntries = [];
          entries.forEach(entry => {
            const key = entryKey(entry);
            if (seenEntries.has(key)) return;
            seenEntries.add(key);
            uniqueEntries.push(entry);
          });

          if (!uniqueEntries.length) continue;

          collected.push(...uniqueEntries);

          if (!paginationSucceeded) {
            break;
          }
        } catch (err) {
          lastError = err;
        }
      }
    } catch (err) {
      lastError = err;
    }

    if (collected.length) {
      return collected.slice(0, maxEntries);
    }

    if (lastError) throw lastError;
    return [];
  }

  function normalizeLeaderboardEntries(raw) {
    if (Array.isArray(raw)) {
      return raw;
    }
    if (!raw || typeof raw !== 'object') {
      if (typeof raw === 'string') {
        try { return normalizeLeaderboardEntries(JSON.parse(raw)); }
        catch { return []; }
      }
      return [];
    }
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.leaderboard)) return raw.leaderboard;
    if (Array.isArray(raw.results)) return raw.results;
    if (raw.data && typeof raw.data === 'object') {
      const nested = normalizeLeaderboardEntries(raw.data);
      if (nested.length) return nested;
    }
    return [];
  }

  async function loadLeaderboard(showLoading) {
    const { list, status, jump } = elements;
    if (!list || !status) return;
    if (jump) { jump.style.display = 'none'; jump.onclick = null; }
    const currentName = ensurePlayerName();
    updateNameLabel(currentName);
    if (showLoading) {
      status.textContent = '読み込み中…';
      status.style.display = 'block';
    }
    list.innerHTML = '';
    try {
      const entries = await fetchLeaderboardEntries(100);
      if (!entries.length) {
        status.textContent = 'No results yet';
        status.style.display = 'block';
        return;
      }
      status.textContent = '';
      status.style.display = 'none';

      const limit = Math.min(100, entries.length);
      const storedName = Utils.sanitizeName(ensurePlayerName());
      const targetName = storedName || '';
      let selfRank = -1;

      const prepared = entries.slice(0, limit).map((entry, idx) => {
        const sanitized = Utils.sanitizeName(entry?.name || '');
        const isSelf = !!targetName && sanitized === targetName;
        if (isSelf && selfRank === -1) selfRank = idx + 1;
        return { entry, rank: idx + 1, isSelf };
      });

      if (targetName && selfRank === -1) {
        for (let i = limit; i < entries.length; i++) {
          const entry = entries[i];
          const sanitized = Utils.sanitizeName(entry?.name || '');
          if (sanitized && sanitized === targetName) {
            selfRank = i + 1;
            prepared.push({ entry, rank: i + 1, isSelf: true });
            break;
          }
        }
      }

      let selfElement = null;
      prepared.forEach(data => {
        const { entry, rank, isSelf } = data;
        const li = document.createElement('li');
        li.className = 'leaderboardItem';
        li.dataset.rank = String(rank);

        const row = document.createElement('div');
        row.className = 'leaderboardRow';

        const rankSpan = document.createElement('span');
        rankSpan.className = 'lbRank';
        rankSpan.textContent = `#${rank}`;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'lbName';
        const rawName = entry?.name ? String(entry.name) : '匿名';
        nameSpan.textContent = isSelf ? `${rawName}（自分）` : rawName;

        const levelValue = Math.max(1, Math.floor(readNumericField(entry, 'level', 1)));
        const levelSpan = document.createElement('span');
        levelSpan.className = 'lbLevel';
        levelSpan.textContent = `Lv ${levelValue.toLocaleString('ja-JP')}`;

        const coinValue = Math.max(0, Math.floor(readNumericField(entry, 'coins', 0)));
        const coinsSpan = document.createElement('span');
        coinsSpan.className = 'lbCoins';
        coinsSpan.textContent = `Coins ${coinValue.toLocaleString('ja-JP')}`;

        const scoreValue = Math.max(0, Math.floor(Number(entry?.score) || 0));
        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'lbScore';
        scoreSpan.textContent = `Score: ${scoreValue.toLocaleString('ja-JP')}`;

        const dateSpan = document.createElement('span');
        dateSpan.className = 'lbDate';
        dateSpan.textContent = formatDate(entry);

        row.appendChild(rankSpan);
        row.appendChild(nameSpan);
        row.appendChild(levelSpan);
        row.appendChild(coinsSpan);
        row.appendChild(scoreSpan);
        row.appendChild(dateSpan);

        li.appendChild(row);
        if (isSelf) {
          li.classList.add('selfEntry');
          if (!selfElement) selfElement = li;
        }
        const charLabel = describeCharLabel(entry?.char);
        li.title = `Lv:${levelValue.toLocaleString('ja-JP')} / Coins:${coinValue.toLocaleString('ja-JP')} / Char:${charLabel}`;
        list.appendChild(li);
      });

      if (jump && selfElement) {
        jump.style.display = 'inline-flex';
        jump.textContent = selfRank > 0 ? `自分の順位へ (#${selfRank})` : '自分の順位へ';
        jump.onclick = () => {
          selfElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          selfElement.classList.add('selfEntry');
        };
      }
    } catch (err) {
      console.error('Failed to load leaderboard', err);
      status.textContent = 'ランキングを取得できませんでした。';
      status.style.display = 'block';
    }
  }

  function openOverlay() {
    if (!elements.overlay) return;
    const UI = window.PSR?.UI;
    if (UI?.openOverlay) {
      UI.openOverlay(elements.overlay);
    } else {
      elements.overlay.hidden = false;
      elements.overlay.classList.add('show');
      document.body?.classList?.add('modal-open');
    }
    loadLeaderboard(true);
  }

  async function submitScore(name, result) {
    const payload = {
      name,
      score: Math.max(0, Math.floor(Number(result?.score) || 0)),
      level: Math.max(1, Math.floor(Number(result?.level) || 1)),
      coins: Math.max(0, Math.floor(Number(result?.coins) || 0)),
      char: result?.char || '',
      fingerprint: window.PSR?.RunLog?.fingerprint || ''
    };
    const res = await fetch(leaderboardUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.json().catch(() => ({}));
  }

  async function requestNameChange() {
    const current = ensurePlayerName();
    const input = prompt('新しい名前を入力してください。（1〜40文字）', current);
    if (input === null) {
      return { changed: false, name: current };
    }
    const sanitized = Utils.sanitizeName?.(input) || '';
    if (!sanitized) {
      alert('名前は1〜40文字で入力してください。');
      return { changed: false, name: current };
    }
    const finalName = savePlayerName(sanitized);
    return { changed: finalName !== current, name: finalName };
  }

  async function handleAfterGame(result) {
    if (elements.overlay) {
      const UI = window.PSR?.UI;
      if (UI?.openOverlay) {
        UI.openOverlay(elements.overlay);
      } else {
        elements.overlay.hidden = false;
        elements.overlay.classList.add('show');
        document.body?.classList?.add('modal-open');
      }
    }
    const name = ensurePlayerName();
    updateNameLabel(name);
    const isPositiveScore = !!result && Number(result.score) > 0;
    const isHighScore = !!(result && (result.didUpdateBest || result.isNewBest || result.bestUpdated));
    if (isPositiveScore && isHighScore) {
      try {
        await submitScore(name, result);
      } catch (err) {
        console.error('Failed to submit leaderboard', err);
        alert('ランキングへの送信に失敗しました。通信状況をご確認ください。');
      }
    }
    await loadLeaderboard(true);
  }

  function init() {
    if (elements.close) {
      elements.close.onclick = () => {
        if (!elements.overlay) return;
        const UI = window.PSR?.UI;
        if (UI?.closeOverlay) {
          UI.closeOverlay(elements.overlay);
        } else {
          elements.overlay.hidden = true;
          elements.overlay.classList.remove('show');
          if (!document.querySelector('.overlay:not([hidden])')) {
            document.body?.classList?.remove('modal-open');
          }
        }
      };
    }
    if (elements.button) {
      elements.button.onclick = () => openOverlay();
    }
    if (elements.refresh) {
      elements.refresh.onclick = () => loadLeaderboard(true);
    }
    if (elements.rename) {
      elements.rename.onclick = () => { requestNameChange(); };
    }
  }

  window.PSR.Leaderboard = {
    init,
    load: loadLeaderboard,
    open: openOverlay,
    handleAfterGame,
    loadPlayerName,
    savePlayerName,
    ensurePlayerName,
    requestNameChange,
    DEFAULT_PLAYER_NAME
  };
})();
