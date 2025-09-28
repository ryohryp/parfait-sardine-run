(function(){
  window.PSR = window.PSR || {};
  const Utils = window.PSR.Utils || {};

  const elements = {
    button: document.getElementById('leaderboardBtn'),
    overlay: document.getElementById('leaderboardOverlay'),
    close: document.getElementById('leaderboardClose'),
    refresh: document.getElementById('leaderboardRefresh'),
    status: document.getElementById('leaderboardStatus'),
    list: document.getElementById('leaderboardList'),
    jump: document.getElementById('leaderboardJump')
  };

  const PLAYER_NAME_KEY = 'psrun_player_name_v1';
  const DEFAULT_PLAYER_NAME = 'プレイヤー';

  function loadPlayerName(){
    try { return localStorage.getItem(PLAYER_NAME_KEY) || ''; }
    catch { return ''; }
  }

  function savePlayerName(name){
    try { localStorage.setItem(PLAYER_NAME_KEY, name); }
    catch { }
  }

  function leaderboardUrl(){
    const base = (typeof window !== 'undefined' && window.PSRUN_API_BASE)
      ? String(window.PSRUN_API_BASE).trim().replace(/\/$/, '')
      : 'https://howasaba-code.com/wp-json/psrun/v2';
    return base.endsWith('/leaderboard') ? base : `${base}/leaderboard`;
  }

  function describeCharLabel(key){
    const data = window.PSR.GameData?.characters;
    if (!key || !data) return key || '-';
    const entry = data[key];
    return entry ? `${entry.emoji} ${entry.name}` : key;
  }

  function formatDate(entry){
    const raw = entry?.date ?? entry?.time ?? entry?.createdAt ?? entry?.created_at ?? entry?.updatedAt ?? entry?.updated_at;
    if (raw === undefined || raw === null) return '-';

    function parseDate(value){
      if (typeof value === 'number'){
        return new Date(value < 1e12 ? value * 1000 : value);
      }
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (/^\d+$/.test(trimmed)){
        const num = Number(trimmed);
        return new Date(trimmed.length <= 10 ? num * 1000 : num);
      }
      const baseMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})([T\s])(\d{2}:\d{2}:\d{2})(\.\d+)?$/);
      if (baseMatch && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)){
        const [, datePart,, timePart, frac = ''] = baseMatch;
        return new Date(`${datePart}T${timePart}${frac}+09:00`);
      }
      return new Date(trimmed);
    }

    const dt = parseDate(raw);
    if (dt && !Number.isNaN(dt.getTime())){
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

  function readNumericField(entry, key, fallback){
    if (!entry || typeof entry !== 'object') return fallback;
    const direct = entry[key];
    if (direct !== undefined && direct !== null && direct !== ''){
      const num = Number(direct);
      if (!Number.isNaN(num)) return num;
    }
    const meta = entry.meta || entry.fields || entry.extra || entry.attributes;
    if (meta && typeof meta === 'object'){
      const nested = meta[key];
      if (nested !== undefined && nested !== null && nested !== ''){
        const num = Number(nested);
        if (!Number.isNaN(num)) return num;
      }
    }
    return fallback;
  }

  function buildUrlWithParams(baseUrl, params){
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

  async function fetchLeaderboardPage(url){
    const res = await fetch(url, { method:'GET', headers:{ 'Accept':'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    try {
      return await res.json();
    } catch (err){
      throw new Error('Invalid leaderboard response');
    }
  }

  async function fetchLeaderboardEntries(maxEntries){
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
    let lastError = null;

    function entryKey(entry){
      const fallback = entry?.date ?? entry?.time ?? entry?.createdAt ?? entry?.created_at ?? entry?.updatedAt ?? entry?.updated_at ?? '';
      return [
        entry?.id ?? '',
        entry?.rank ?? '',
        entry?.name ?? '',
        entry?.score ?? '',
        fallback
      ].join('|');
    }

    async function tryStrategy(strategy, pageSize){
      const collected = [];
      const seen = new Set();
      const maxPages = Math.max(10, Math.ceil(maxEntries / Math.max(1, pageSize)) + 2);

      for (let pageIndex = 0; pageIndex < maxPages && collected.length < maxEntries; pageIndex += 1){
        const params = {};
        if (strategy.sizeParam){
          params[strategy.sizeParam] = String(pageSize);
        }
        if (strategy.pageParam){
          params[strategy.pageParam] = String(pageIndex + 1);
        }
        if (strategy.offsetParam){
          params[strategy.offsetParam] = String(pageIndex * pageSize);
        }

        let entries = [];
        try {
          const raw = await fetchLeaderboardPage(buildUrlWithParams(base, params));
          entries = normalizeLeaderboardEntries(raw);
        } catch (err){
          lastError = err;
          break;
        }

        if (!entries.length){
          break;
        }

        let added = 0;
        entries.forEach(entry => {
          const key = entryKey(entry);
          if (seen.has(key)) return;
          seen.add(key);
          collected.push(entry);
          added += 1;
        });

        if (entries.length < pageSize){
          break;
        }

        if (added === 0){
          break;
        }
      }

      return collected;
    }

    let bestEntries = [];
    for (const strategy of strategies){
      for (const size of candidateSizes){
        const entries = await tryStrategy(strategy, size);
        if (entries.length > bestEntries.length){
          bestEntries = entries;
        }
        const minExpected = Math.min(maxEntries, size);
        const canPaginate = !!(strategy.pageParam || strategy.offsetParam);
        if (entries.length >= maxEntries || entries.length >= minExpected || (!canPaginate && entries.length)){
          return entries.slice(0, maxEntries);
        }
      }
    }

    if (bestEntries.length){
      return bestEntries.slice(0, maxEntries);
    }

    try {
      const raw = await fetchLeaderboardPage(base);
      const entries = normalizeLeaderboardEntries(raw);
      if (entries.length){
        return entries.slice(0, maxEntries);
      }
    } catch (err){
      lastError = err;
    }

    if (lastError) throw lastError;
    return [];
  }

  function normalizeLeaderboardEntries(raw){
    if (Array.isArray(raw)){
      return raw;
    }
    if (!raw || typeof raw !== 'object'){
      if (typeof raw === 'string'){
        try { return normalizeLeaderboardEntries(JSON.parse(raw)); }
        catch { return []; }
      }
      return [];
    }
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.leaderboard)) return raw.leaderboard;
    if (Array.isArray(raw.results)) return raw.results;
    if (raw.data && typeof raw.data === 'object'){
      const nested = normalizeLeaderboardEntries(raw.data);
      if (nested.length) return nested;
    }
    return [];
  }

  async function loadLeaderboard(showLoading){
    const { list, status, jump } = elements;
    if (!list || !status) return;
    if (jump){ jump.style.display = 'none'; jump.onclick = null; }
    if (showLoading){
      status.textContent = '読み込み中…';
      status.style.display = 'block';
    }
    list.innerHTML = '';
    try {
      const entries = await fetchLeaderboardEntries(100);
      if (!entries.length){
        status.textContent = 'No results yet';
        status.style.display = 'block';
        return;
      }
      status.textContent = '';
      status.style.display = 'none';

      const limit = Math.min(100, entries.length);
      const storedName = Utils.sanitizeName(loadPlayerName() || DEFAULT_PLAYER_NAME);
      const targetName = storedName || '';
      let selfRank = -1;

      const prepared = entries.slice(0, limit).map((entry, idx) => {
        const sanitized = Utils.sanitizeName(entry?.name || '');
        const isSelf = !!targetName && sanitized === targetName;
        if (isSelf && selfRank === -1) selfRank = idx + 1;
        return { entry, rank: idx + 1, isSelf };
      });

      if (targetName && selfRank === -1){
        for (let i = limit; i < entries.length; i++){
          const entry = entries[i];
          const sanitized = Utils.sanitizeName(entry?.name || '');
          if (sanitized && sanitized === targetName){
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
        if (isSelf){
          li.classList.add('selfEntry');
          if (!selfElement) selfElement = li;
        }
        const charLabel = describeCharLabel(entry?.char);
        li.title = `Lv:${levelValue.toLocaleString('ja-JP')} / Coins:${coinValue.toLocaleString('ja-JP')} / Char:${charLabel}`;
        list.appendChild(li);
      });

      if (jump && selfElement){
        jump.style.display = 'inline-flex';
        jump.textContent = selfRank > 0 ? `自分の順位へ (#${selfRank})` : '自分の順位へ';
        jump.onclick = () => {
          selfElement.scrollIntoView({ behavior:'smooth', block:'center' });
          selfElement.classList.add('selfEntry');
        };
      }
    } catch (err){
      console.error('Failed to load leaderboard', err);
      status.textContent = 'ランキングを取得できませんでした。';
      status.style.display = 'block';
    }
  }

  function openOverlay(){
    if (!elements.overlay) return;
    elements.overlay.style.display = 'flex';
    loadLeaderboard(true);
  }

  async function submitScore(name, result){
    const payload = {
      name,
      score: Math.max(0, Math.floor(Number(result?.score) || 0)),
      level: Math.max(1, Math.floor(Number(result?.level) || 1)),
      coins: Math.max(0, Math.floor(Number(result?.coins) || 0)),
      char: result?.char || ''
    };
    const res = await fetch(leaderboardUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.json().catch(() => ({}));
  }

  async function handleAfterGame(result){
    if (elements.overlay){
      elements.overlay.style.display = 'flex';
    }
    if (!result || result.score <= 0){
      await loadLeaderboard(true);
      return;
    }
    const stored = loadPlayerName() || DEFAULT_PLAYER_NAME;
    const input = prompt(`ランキングにスコア(${result.score})を登録します。名前を入力してください。`, stored);
    if (input === null){
      await loadLeaderboard(true);
      return;
    }
    const name = Utils.sanitizeName(input);
    if (!name){
      alert('名前が空のため送信をスキップしました。');
      await loadLeaderboard(true);
      return;
    }
    try {
      savePlayerName(name);
      await submitScore(name, result);
    } catch (err){
      console.error('Failed to submit leaderboard', err);
      alert('ランキングへの送信に失敗しました。通信状況をご確認ください。');
    }
    await loadLeaderboard(true);
  }

  function init(){
    if (elements.close){
      elements.close.onclick = () => {
        if (elements.overlay) elements.overlay.style.display = 'none';
      };
    }
    if (elements.button){
      elements.button.onclick = () => openOverlay();
    }
    if (elements.refresh){
      elements.refresh.onclick = () => loadLeaderboard(true);
    }
  }

  window.PSR.Leaderboard = {
    init,
    load: loadLeaderboard,
    open: openOverlay,
    handleAfterGame,
    loadPlayerName,
    savePlayerName,
    DEFAULT_PLAYER_NAME
  };
})();
