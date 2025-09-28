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
    let dt = null;
    if (typeof raw === 'number'){
      dt = new Date(raw);
    } else if (typeof raw === 'string'){
      const trimmed = raw.trim();
      if (!trimmed){
        return '-';
      }
      if (/^\d+$/.test(trimmed)){
        const num = Number(trimmed);
        dt = new Date(trimmed.length <= 10 ? num*1000 : num);
      } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)){
        dt = new Date(`${trimmed.replace(' ', 'T')}Z`);
      } else {
        dt = new Date(trimmed);
      }
    }
    if (dt && !Number.isNaN(dt.getTime())){
      try {
        return dt.toLocaleString('ja-JP', {
          year:'numeric', month:'2-digit', day:'2-digit',
          hour:'2-digit', minute:'2-digit',
          timeZone: 'Asia/Tokyo'
        });
      } catch {
        return dt.toISOString().slice(0,16).replace('T',' ');
      }
    }
    return String(raw);
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
      const res = await fetch(leaderboardUrl(), { method:'GET', headers:{ 'Accept':'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const entries = normalizeLeaderboardEntries(raw);
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

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'lbScore';
        scoreSpan.textContent = `Score: ${(Number(entry?.score) || 0).toLocaleString('ja-JP')}`;

        const dateSpan = document.createElement('span');
        dateSpan.className = 'lbDate';
        dateSpan.textContent = formatDate(entry);

        row.appendChild(rankSpan);
        row.appendChild(nameSpan);
        row.appendChild(scoreSpan);
        row.appendChild(dateSpan);

        li.appendChild(row);
        if (isSelf){
          li.classList.add('selfEntry');
          if (!selfElement) selfElement = li;
        }
        const charLabel = describeCharLabel(entry?.char);
        li.title = `Lv:${Number(entry?.level)||1} / Coins:${Number(entry?.coins)||0} / Char:${charLabel}`;
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
