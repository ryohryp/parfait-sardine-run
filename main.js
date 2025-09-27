(()=>{
// ====== 基本 ======
const cv = document.getElementById('cv');
const c = cv.getContext('2d');
const hud = document.getElementById('hud');
const btnStart = document.getElementById('start');
const btnRestart = document.getElementById('restart');
const btnHow = document.getElementById('howto');
const btnUlt = document.getElementById('ultBtn');
const btnGacha = document.getElementById('gachaOpen');
const btnGacha10 = document.getElementById('gacha10');
const btnCollection = document.getElementById('collection');
const btnCodex = document.getElementById('codexBtn');
const btnLeaderboard = document.getElementById('leaderboardBtn');
const btnComment = document.getElementById('commentBtn');
const charInfo = document.getElementById('charInfo');
const howOverlay = document.getElementById('howOverlay');
const howClose = document.getElementById('howClose');
const howStart = document.getElementById('howStart');
const howLead = document.getElementById('howLead');
const howList = document.getElementById('howList');
const howFooterNote = document.getElementById('howFooterNote');
const resultOverlay = document.getElementById('resultOverlay');
const resultClose = document.getElementById('resultClose');
const resultSummary = document.getElementById('resultSummary');
const resultItemList = document.getElementById('resultItemList');
const resultEnemyList = document.getElementById('resultEnemyList');
const resultReplay = document.getElementById('resultReplay');

// ガチャUI
const ov = document.getElementById('gachaOverlay');
const resWrap = document.getElementById('gachaResults');
document.getElementById('gachaClose').onclick = ()=> ov.style.display='none';
document.getElementById('pull1').onclick = ()=> doGacha(1);
document.getElementById('pull10').onclick = ()=> doGacha(10);

// コレクションUI
const colOv = document.getElementById('colOverlay');
const colGrid = document.getElementById('colGrid');
const colClose = document.getElementById('colClose');
const colEquip = document.getElementById('colEquip');
let colSelectedKey = null;
colClose.onclick = ()=>{ colOv.style.display='none'; colSelectedKey=null; colEquip.disabled=true; };
colEquip.onclick = ()=>{ if(colSelectedKey){ setCurrentChar(colSelectedKey); colOv.style.display='none'; } };

// 図鑑UI
const codexOverlay = document.getElementById('codexOverlay');
const codexClose = document.getElementById('codexClose');
const codexList = document.getElementById('codexList');
if (btnCodex){
  btnCodex.onclick = ()=>{
    populateCodex();
    if (codexOverlay) codexOverlay.style.display = 'flex';
  };
}
if (codexClose){
  codexClose.onclick = ()=>{ if (codexOverlay) codexOverlay.style.display='none'; };
}

// ランキングUI
const lbOverlay = document.getElementById('leaderboardOverlay');
const lbClose = document.getElementById('leaderboardClose');
const lbRefresh = document.getElementById('leaderboardRefresh');
const lbStatus = document.getElementById('leaderboardStatus');
const lbList = document.getElementById('leaderboardList');
const lbJump = document.getElementById('leaderboardJump');
if (lbClose){ lbClose.onclick = ()=>{ lbOverlay.style.display='none'; }; }
if (btnLeaderboard){ btnLeaderboard.onclick = ()=>{ openLeaderboardOverlay(); }; }
if (lbRefresh){ lbRefresh.onclick = ()=>{ loadLeaderboard(true); }; }

// コメントUI
const commentOverlay = document.getElementById('commentOverlay');
const commentClose = document.getElementById('commentClose');
const commentForm = document.getElementById('commentForm');
const commentNameInput = document.getElementById('commentName');
const commentEmailInput = document.getElementById('commentEmail');
const commentMessageInput = document.getElementById('commentMessage');
const commentSubmitBtn = document.getElementById('commentSubmit');
const commentStatus = document.getElementById('commentStatus');
const commentList = document.getElementById('commentList');
const commentFeedStatus = document.getElementById('commentFeedStatus');
const commentFeedList = document.getElementById('commentFeedList');
if (btnComment){ btnComment.onclick = ()=>{ openCommentOverlay(); }; }
if (commentClose){ commentClose.onclick = ()=>{ if(commentOverlay) commentOverlay.style.display='none'; }; }
if (commentOverlay){
  commentOverlay.addEventListener('click', (ev)=>{
    if (ev.target === commentOverlay){ commentOverlay.style.display='none'; }
  });
}
if (commentForm){
  commentForm.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    submitComment();
  });
}
if (commentList){ commentList.addEventListener('click', onCommentListClick); }
if (commentFeedList){ commentFeedList.addEventListener('click', onCommentListClick); }

const DEFAULT_HOWTO_COPY = {
  initialLead: 'まずは操作をチェック！60秒ランでベストスコアを狙い、コインでキャラを集めましょう。',
  defaultLead: '困ったらいつでもここで操作と目的を確認できます。',
  steps: [
    '画面左タップ/クリックでジャンプ。二段ジャンプ可能なキャラもいます。',
    '画面右タップで攻撃、長押し or 右下の<strong>必殺</strong>ボタンでゲージ100%時の必殺技を発動。',
    '🍨や🐟アイテムでスコア＆コイン、⭐で無敵とゲージUP。敵を倒すとさらにボーナス。',
    '集めたコインでガチャを回し、キャラを装備して能力を入れ替えましょう。'
  ],
  hint: 'ヒント：ベストスコアは自動保存。連続プレイで令和チャンプを目指そう！'
};

let howtoCopy = { ...DEFAULT_HOWTO_COPY };
let howtoLeadMode = 'default';

function renderHowtoCopy(){
  if (howList){
    howList.innerHTML = '';
    for (const step of howtoCopy.steps){
      const li = document.createElement('li');
      li.innerHTML = step;
      howList.appendChild(li);
    }
  }
  if (howFooterNote){
    howFooterNote.textContent = howtoCopy.hint;
  }
}

async function loadHowtoCopy(){
  if (typeof fetch !== 'function') return;
  try {
    const response = await fetch('howto.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    howtoCopy = {
      initialLead: data.initialLead || howtoCopy.initialLead,
      defaultLead: data.defaultLead || howtoCopy.defaultLead,
      steps: Array.isArray(data.steps) && data.steps.length ? data.steps : howtoCopy.steps,
      hint: data.hint || howtoCopy.hint
    };
    renderHowtoCopy();
    if (howLead){
      if (howOverlay && howOverlay.style.display === 'flex'){
        howLead.textContent = howtoLeadMode === 'initial' ? howtoCopy.initialLead : howtoCopy.defaultLead;
      } else if (!howLead.textContent){
        howLead.textContent = howtoCopy.defaultLead;
      }
    }
  } catch (err) {
    console.warn('Failed to load how-to copy', err);
  }
}

renderHowtoCopy();
if (howLead && !howLead.textContent){
  howLead.textContent = howtoCopy.defaultLead;
}
loadHowtoCopy();

const PLAYER_NAME_KEY = 'psrun_player_name_v1';
const PLAYER_EMAIL_KEY = 'psrun_player_email_v1';
const DEFAULT_PLAYER_NAME = 'プレイヤー';
const COMMENT_POST_ID = 103;
const COMMENT_API_DEFAULT = 'https://howasaba-code.com/wp-json/psr/v1';
const COMMENT_REFRESH_MS = 60000;
let lastCommentFetch = 0;
const COMMENT_CLIENT_ID_KEY = 'psrun_comment_client_id_v1';
const COMMENT_CLIENT_HEADER = 'X-PSR-Client';
let cachedComments = [];
const pendingLikeIds = new Set();
let commentFeedStatusTimer = null;

loadComments(true);

function leaderboardUrl(){
  const base = (typeof window !== 'undefined' && window.PSRUN_API_BASE)
    ? String(window.PSRUN_API_BASE).trim().replace(/\/$/, '')
    : 'https://howasaba-code.com/wp-json/psrun/v2';
  return base.endsWith('/leaderboard') ? base : `${base}/leaderboard`;
}

function graphemeLength(str){
  return Array.from(str || '').length;
}

function clampGraphemes(str, limit){
  const arr = Array.from(str || '');
  if (arr.length <= limit) return arr.join('');
  return arr.slice(0, limit).join('');
}

function sanitizeName(raw){
  if (!raw) return '';
  const cleaned = String(raw)
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clampGraphemes(cleaned, 40);
}

function loadPlayerName(){
  try{ return localStorage.getItem(PLAYER_NAME_KEY) || ''; }
  catch{ return ''; }
}

function savePlayerName(name){
  try{ localStorage.setItem(PLAYER_NAME_KEY, name); }
  catch{}
}

function loadPlayerEmail(){
  try{ return localStorage.getItem(PLAYER_EMAIL_KEY) || ''; }
  catch{ return ''; }
}

function savePlayerEmail(email){
  try{
    if (email){
      localStorage.setItem(PLAYER_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(PLAYER_EMAIL_KEY);
    }
  }
  catch{}
}

function openLeaderboardOverlay(){
  if (!lbOverlay) return;
  lbOverlay.style.display='flex';
  loadLeaderboard(true);
}

function openCommentOverlay(){
  if (!commentOverlay) return;
  commentOverlay.style.display='flex';
  if (commentStatus){
    commentStatus.style.display = 'none';
    commentStatus.textContent = '';
  }
  if (commentNameInput){
    const stored = sanitizeName(loadPlayerName() || DEFAULT_PLAYER_NAME);
    if (stored && !commentNameInput.value){
      commentNameInput.value = stored;
    }
  }
  if (commentEmailInput){
    const storedEmail = loadPlayerEmail();
    if (storedEmail && !commentEmailInput.value){
      commentEmailInput.value = storedEmail;
    }
  }
  if (commentMessageInput){
    try{ commentMessageInput.focus({ preventScroll:true }); }
    catch{ commentMessageInput.focus(); }
  }
  const now = Date.now();
  if (!lastCommentFetch || (now - lastCommentFetch) > COMMENT_REFRESH_MS){
    loadComments(true);
  }
}

function describeCharLabel(key){
  if (!key) return '-';
  const ch = characters?.[key];
  return ch ? `${ch.emoji} ${ch.name}` : key;
}

function formatLeaderboardDate(entry){
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
    try{
      return dt.toLocaleString('ja-JP', {
        year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit'
      });
    }catch{
      return dt.toISOString().slice(0,16).replace('T',' ');
    }
  }
  return String(raw);
}

async function loadLeaderboard(showLoading){
  if (!lbList || !lbStatus) return;
  if (lbJump){ lbJump.style.display = 'none'; lbJump.onclick = null; }
  if (showLoading){
    lbStatus.textContent = '読み込み中…';
    lbStatus.style.display = 'block';
  }
  lbList.innerHTML = '';
  try{
    const res = await fetch(leaderboardUrl(), { method:'GET', headers:{ 'Accept':'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const raw = await res.json();
    const entries = normalizeLeaderboardEntries(raw);
    if (!entries.length){

      lbStatus.textContent = 'No results yet';
      lbStatus.style.display = 'block';
      return;
    }
    lbStatus.textContent = '';
    lbStatus.style.display = 'none';

    const limit = Math.min(50, entries.length);
    const storedName = sanitizeName(loadPlayerName() || DEFAULT_PLAYER_NAME);
    const targetName = storedName || '';
    let selfRank = -1;

    const prepared = entries.slice(0, limit).map((entry, idx)=>{
      const sanitized = sanitizeName(entry?.name || '');
      const isSelf = !!targetName && sanitized === targetName;
      if (isSelf && selfRank === -1) selfRank = idx+1;
      return { entry, rank: idx+1, isSelf };
    });

    if (targetName && selfRank === -1){
      for (let i = limit; i < entries.length; i++){
        const entry = entries[i];
        const sanitized = sanitizeName(entry?.name || '');
        if (sanitized && sanitized === targetName){
          selfRank = i+1;
          prepared.push({ entry, rank: i+1, isSelf:true });
          break;
        }
      }
    }

    let selfElement = null;
    prepared.forEach(data=>{
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
      dateSpan.textContent = formatLeaderboardDate(entry);

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
      lbList.appendChild(li);
    });

    if (lbJump && selfElement){
      lbJump.style.display = 'inline-flex';
      lbJump.textContent = selfRank>0 ? `自分の順位へ (#${selfRank})` : '自分の順位へ';
      lbJump.onclick = ()=>{
        selfElement.scrollIntoView({ behavior:'smooth', block:'center' });
        selfElement.classList.add('selfEntry');
      };
    }
  }catch(err){
    console.error('Failed to load leaderboard', err);
    lbStatus.textContent = 'ランキングを取得できませんでした。';
    lbStatus.style.display = 'block';
  }
}

function ensureCommentClientId(){
  if (typeof window === 'undefined') return '';
  if (!window.__psrunCommentClientId){
    let stored = '';
    try{ stored = localStorage.getItem(COMMENT_CLIENT_ID_KEY) || ''; }
    catch{ stored = ''; }
    if (!stored){
      const fallback = `psr-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      try{
        const uuid = window.crypto?.randomUUID?.();
        stored = uuid ? `psr-${uuid}` : fallback;
      }catch{
        stored = fallback;
      }
      try{ localStorage.setItem(COMMENT_CLIENT_ID_KEY, stored); }
      catch{}
    }
    window.__psrunCommentClientId = stored;
  }
  return window.__psrunCommentClientId || '';
}

function commentApiBase(){
  let candidate = COMMENT_API_DEFAULT;
  if (typeof window !== 'undefined'){
    const raw = window.PSRUN_COMMENT_API_BASE ?? window.PSRUN_API_BASE;
    if (raw){
      candidate = String(raw).trim();
    }
  }
  if (!candidate){
    candidate = COMMENT_API_DEFAULT;
  }
  let base = String(candidate).trim();
  if (!base){
    base = COMMENT_API_DEFAULT;
  }
  base = base
    .replace(/\/(comments?|comment)(\?.*)?$/i, '')
    .replace(/\/leaderboard(\?.*)?$/i, '')
    .replace(/\/$/, '');
  if (/\/wp-json\/psrun\/v2/i.test(base)){
    base = base.replace(/\/wp-json\/psrun\/v2.*/i, '/wp-json/psr/v1');
  }
  return base || COMMENT_API_DEFAULT;
}

function commentListUrl(){
  const base = commentApiBase();
  const params = new URLSearchParams({ post_id: String(COMMENT_POST_ID), page: '1', per_page: '20' });
  return `${base}/comments?${params.toString()}`;
}

function commentPostUrl(){
  return `${commentApiBase()}/comment`;
}

function commentLikeUrl(){
  return `${commentApiBase()}/like`;
}

function sanitizeCommentMessage(raw, limit = 1000){
  if (!raw) return '';
  let normalized = String(raw)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ');
  normalized = normalized.replace(/[<>]/g, '');
  normalized = normalized.trim();
  return clampGraphemes(normalized, limit).trim();
}

function extractCommentId(entry){
  const candidates = [
    entry?.comment_id,
    entry?.commentId,
    entry?.id,
    entry?.ID,
    entry?.commentid
  ];
  for (const candidate of candidates){
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate === 'number' && Number.isFinite(candidate)){
      return String(Math.trunc(candidate));
    }
    const str = String(candidate).trim();
    if (str){
      if (/^\d+$/.test(str)){
        return String(Number(str));
      }
    }
  }
  return null;
}

function normalizeLikeCount(value){
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)){
    return Math.max(0, Math.round(value));
  }
  const str = String(value).trim();
  if (!str) return 0;
  const num = Number(str.replace(/[^0-9.-]/g, ''));
  if (Number.isFinite(num)){
    return Math.max(0, Math.round(num));
  }
  return 0;
}

function normalizeLiked(value){
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string'){
    const str = value.trim().toLowerCase();
    if (!str) return false;
    return str === '1' || str === 'true' || str === 'yes' || str === 'liked';
  }
  return false;
}

function normalizeComments(raw){
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object'){
    if (typeof raw === 'string'){
      try{ return normalizeComments(JSON.parse(raw)); }
      catch{ return []; }
    }
    return [];
  }
  const candidates = ['comments','items','results','data'];
  for (const key of candidates){
    if (Array.isArray(raw[key])) return raw[key];
  }
  if (raw.data && typeof raw.data === 'object'){
    const nested = normalizeComments(raw.data);
    if (nested.length) return nested;
  }
  return [];
}

function formatCommentDate(entry){
  return formatLeaderboardDate(entry);
}

function renderComments(targetList, items, emptyMessage='まだコメントがありません。'){
  if (!targetList) return;
  targetList.innerHTML = '';
  if (!items.length){
    const li = document.createElement('li');
    li.className = 'commentItem commentItemEmpty';
    li.textContent = emptyMessage;
    targetList.appendChild(li);
    return;
  }
  items.forEach(item=>{
    const li = document.createElement('li');
    li.className = 'commentItem';
    if (item?.id){
      li.dataset.commentId = item.id;
    }

    const header = document.createElement('div');
    header.className = 'commentItemHeader';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'commentItemName';
    const nameRaw = item?.name ?? item?.author ?? item?.author_name ?? '';
    const sanitizedName = typeof item?.name === 'string' ? item.name : (sanitizeName(nameRaw) || '匿名');
    nameSpan.textContent = sanitizedName || '匿名';

    const metaWrap = document.createElement('div');
    metaWrap.className = 'commentItemMeta';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'commentItemDate';
    dateSpan.textContent = formatCommentDate(item);
    metaWrap.appendChild(dateSpan);

    const likeCapable = typeof item?.id === 'string' && item.id;
    const likeCount = normalizeLikeCount(item?.likeCount ?? item?.likes ?? item?.like_count ?? 0);
    const likedState = normalizeLiked(item?.liked);
    if (likeCapable){
      const likeBtn = document.createElement('button');
      likeBtn.type = 'button';
      likeBtn.className = 'commentLikeBtn';
      likeBtn.dataset.commentId = item.id;
      likeBtn.disabled = pendingLikeIds.has(item.id);
      if (likedState){
        likeBtn.classList.add('isLiked');
      }
      likeBtn.setAttribute('aria-pressed', likedState ? 'true' : 'false');
      const countSpan = document.createElement('span');
      countSpan.className = 'commentLikeCount';
      countSpan.textContent = String(likeCount);
      const iconSpan = document.createElement('span');
      iconSpan.className = 'commentLikeIcon';
      iconSpan.setAttribute('aria-hidden', 'true');
      iconSpan.textContent = likedState ? '❤' : '♡';
      likeBtn.appendChild(iconSpan);
      likeBtn.appendChild(countSpan);
      const ariaLabel = likedState
        ? `いいねを取り消す（${likeCount}）`
        : `いいね（${likeCount}）`;
      likeBtn.setAttribute('aria-label', ariaLabel);
      metaWrap.appendChild(likeBtn);
    }

    header.appendChild(nameSpan);
    header.appendChild(metaWrap);

    const message = document.createElement('p');
    message.className = 'commentItemMessage';
    const source = item?.message ?? item?.comment ?? item?.body ?? item?.content ?? item?.content?.rendered ?? '';
    const sanitizedMessage = typeof item?.message === 'string' ? item.message : sanitizeCommentMessage(typeof source === 'string' ? source : '', 1000);
    message.textContent = sanitizedMessage || '…';

    li.appendChild(header);
    li.appendChild(message);
    targetList.appendChild(li);
  });
}

function renderAllCommentLists(){
  const lists = [];
  if (commentList) lists.push({ el: commentList, empty: 'まだコメントがありません。' });
  if (commentFeedList) lists.push({ el: commentFeedList, empty: 'まだコメントがありません。' });
  lists.forEach(entry=>{
    if (!entry.el) return;
    renderComments(entry.el, cachedComments, entry.empty);
  });
}

function updateCachedComment(commentId, patch){
  if (!commentId || !patch) return;
  cachedComments = cachedComments.map(entry=>{
    if (entry.id === commentId){
      return { ...entry, ...patch };
    }
    return entry;
  });
}

function showCommentError(message){
  const text = message || 'エラーが発生しました。時間をおいて再度お試しください。';
  let shown = false;
  if (commentOverlay && commentOverlay.style.display === 'flex' && commentStatus){
    commentStatus.textContent = text;
    commentStatus.style.display = 'block';
    shown = true;
  }
  if (commentFeedStatus){
    commentFeedStatus.textContent = text;
    commentFeedStatus.style.display = 'block';
    if (commentFeedStatusTimer){
      clearTimeout(commentFeedStatusTimer);
    }
    commentFeedStatusTimer = setTimeout(()=>{
      if (commentFeedStatus.textContent === text){
        commentFeedStatus.style.display = 'none';
        commentFeedStatus.textContent = '';
      }
    }, 4000);
    shown = true;
  }
  if (!shown){
    console.warn(text);
  }
}

function onCommentListClick(ev){
  const target = ev.target;
  if (!(target instanceof Element)) return;
  const button = target.closest('button.commentLikeBtn');
  if (!button) return;
  const commentId = button.dataset.commentId;
  if (!commentId || pendingLikeIds.has(commentId)) return;
  ev.preventDefault();
  toggleCommentLike(commentId);
}

async function toggleCommentLike(commentId){
  if (!commentId) return;
  const entry = cachedComments.find(item=>item.id === commentId) || null;
  const currentLiked = entry ? normalizeLiked(entry.liked) : false;
  pendingLikeIds.add(commentId);
  renderAllCommentLists();
  try{
    const clientId = ensureCommentClientId();
    const payload = {
      comment_id: Number(commentId),        // 常に数値で
      client_id: clientId,                  // 必須
      op: currentLiked ? 'unlike' : 'like'  // ← ここを修正
    };
    const likeHeaders = {
      'Content-Type':'application/json; charset=utf-8',
      'Accept':'application/json'
    };
    if (clientId){
      likeHeaders[COMMENT_CLIENT_HEADER] = clientId;
    }
    const res = await fetch(commentLikeUrl(), {
      method:'POST',
      headers: likeHeaders,
      body: JSON.stringify(payload)
    });
    let detail = null;
    try{ detail = await res.json(); }
    catch{ detail = null; }
    if (!res.ok){
      const code = (detail?.code || detail?.data?.code || '').toString();
      let friendly = '';
      if (res.status === 429 || code === 'rate_limited'){
        friendly = 'いいねの回数が多すぎます。少し時間をおいて再度お試しください。';
      } else if (res.status === 403 || code === 'origin_not_allowed'){
        friendly = 'この環境からはいいねできません。';
      } else if (res.status === 400){
        if (code === 'bad_comment_id'){ friendly = 'このコメントにはいいねできません。'; }
      } else if (res.status >= 500){
        friendly = 'サーバーエラーが発生しました。時間をおいて再度お試しください。';
      }
      throw new Error(friendly || (typeof detail?.message === 'string' ? detail.message : '') || `HTTP ${res.status}`);
    }
    const liked = normalizeLiked(detail?.liked ?? detail?.is_liked ?? detail?.has_liked ?? (!currentLiked));
    const likeCountSource = detail?.like_count ?? detail?.likes ?? detail?.count;
    let likeCount = normalizeLikeCount(likeCountSource);
    if (likeCountSource === undefined || likeCountSource === null){
      const baseCount = entry ? normalizeLikeCount(entry.likeCount) : 0;
      const delta = liked === currentLiked ? 0 : (liked ? 1 : -1);
      likeCount = Math.max(0, baseCount + delta);
    }
    updateCachedComment(commentId, {
      likeCount: likeCount,
      liked: liked
    });
    pendingLikeIds.delete(commentId);
    renderAllCommentLists();
  }catch(err){
    pendingLikeIds.delete(commentId);
    renderAllCommentLists();
    console.error('Failed to toggle like', err);
    showCommentError(err?.message || 'いいねに失敗しました。時間をおいて再度お試しください。');
  }
}

async function loadComments(showLoading){
  const lists = [];
  if (commentList) lists.push({ el: commentList, empty: 'まだコメントがありません。' });
  if (commentFeedList) lists.push({ el: commentFeedList, empty: 'まだコメントがありません。' });
  if (!lists.length) return;
  if (showLoading && commentStatus){
    commentStatus.textContent = '最新コメントを読み込み中…';
    commentStatus.style.display = 'block';
  }
  if (commentFeedStatus){
    commentFeedStatus.textContent = 'コメントを読み込み中…';
    commentFeedStatus.style.display = 'block';
  }
  lists.forEach(entry=>{ entry.el.innerHTML = ''; });
  try{
    const headers = { 'Accept':'application/json' };
    const clientId = ensureCommentClientId();
    if (clientId){
      headers[COMMENT_CLIENT_HEADER] = clientId;
    }
    const res = await fetch(commentListUrl(), { method:'GET', headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let raw = null;
    try{ raw = await res.json(); }
    catch{ raw = []; }
    const collection = Array.isArray(raw?.items) ? raw.items : normalizeComments(raw);
    const normalized = collection
      .map(entry=>{
        const id = extractCommentId(entry);
        const likeRaw = entry?.like_count ?? entry?.likes ?? entry?.likeCount ?? entry?.meta?.psr_like_count ?? entry?.meta?.like_count;
        const likedRaw = entry?.liked ?? entry?.has_liked ?? entry?.is_liked ?? entry?.meta?.liked;
        const messageSource = entry?.content ?? entry?.message ?? entry?.comment ?? entry?.body ?? (typeof entry?.content?.rendered === 'string' ? entry.content.rendered : '');
        const sanitizedMessage = sanitizeCommentMessage(messageSource, 1000);
        const sanitizedName = sanitizeName(entry?.author_name ?? entry?.author ?? entry?.name ?? entry?.user ?? entry?.title ?? '匿名') || '匿名';
        return {
          id: id || null,
          name: sanitizedName,
          message: sanitizedMessage,
          date: entry?.date_gmt ?? entry?.date ?? entry?.createdAt ?? entry?.created_at ?? entry?.updatedAt ?? entry?.updated_at ?? entry?.time ?? null,
          likeCount: normalizeLikeCount(likeRaw),
          liked: normalizeLiked(likedRaw)
        };
      })
      .filter(entry=>entry.message.length > 0)
      .slice(0, 30);
    cachedComments = normalized;
    renderAllCommentLists();
    if (showLoading && commentStatus){
      commentStatus.style.display = 'none';
      commentStatus.textContent = '';
    }
    if (commentFeedStatus){
      commentFeedStatus.style.display = 'none';
      commentFeedStatus.textContent = '';
    }
    lastCommentFetch = Date.now();
  }catch(err){
    console.error('Failed to load comments', err);
    if (showLoading && commentStatus){
      commentStatus.textContent = 'コメントを取得できませんでした。';
      commentStatus.style.display = 'block';
    }
    if (commentFeedStatus){
      commentFeedStatus.textContent = 'コメントを表示できませんでした。';
      commentFeedStatus.style.display = 'block';
    }
  }
}

async function submitComment(){
  if (!commentMessageInput || !commentStatus || !commentSubmitBtn) return;
  const rawName = commentNameInput?.value ?? '';
  const sanitizedName = sanitizeName(rawName) || DEFAULT_PLAYER_NAME;
  const nameLength = graphemeLength(sanitizedName);
  if (nameLength < 1 || nameLength > 40){
    commentStatus.textContent = '名前は1〜40文字で入力してください。';
    commentStatus.style.display = 'block';
    commentNameInput?.focus();
    return;
  }
  const message = sanitizeCommentMessage(commentMessageInput.value, 1000);
  if (!message){
    commentStatus.textContent = 'コメントは1〜1000文字で入力してください。';
    commentStatus.style.display = 'block';
    commentMessageInput.focus();
    return;
  }
  let email = '';
  if (commentEmailInput){
    const rawEmail = (commentEmailInput.value || '').trim();
    if (rawEmail){
      const trimmedEmail = clampGraphemes(rawEmail, 254);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)){
        commentStatus.textContent = 'メールアドレスの形式が正しくありません。';
        commentStatus.style.display = 'block';
        commentEmailInput.focus();
        return;
      }
      email = trimmedEmail;
    }
  }
  commentStatus.textContent = '送信中…';
  commentStatus.style.display = 'block';
  commentSubmitBtn.disabled = true;
  try{
    const payload = {
      author_name: sanitizedName,
      content: message,
      author_email: email,
      post_id: COMMENT_POST_ID
    };
    const res = await fetch(commentPostUrl(), {
      method:'POST',
      headers:(()=>{
        const baseHeaders = { 'Content-Type':'application/json; charset=utf-8','Accept':'application/json' };
        const clientIdHeader = ensureCommentClientId();
        if (clientIdHeader){
          baseHeaders[COMMENT_CLIENT_HEADER] = clientIdHeader;
        }
        return baseHeaders;
      })(),
      body: JSON.stringify(payload)
    });
    if (!res.ok){
      let errorDetail = null;
      try{ errorDetail = await res.json(); }
      catch{}
      const code = (errorDetail?.code || errorDetail?.data?.code || '').toString();
      const serverMessage = typeof errorDetail?.message === 'string' ? errorDetail.message.trim() : '';
      let friendly = '';
      if (res.status === 429 || code === 'rate_limited'){
        friendly = '短時間に多数の送信が行われたため、しばらく時間をおいて再度お試しください。';
      } else if (res.status === 403 || code === 'origin_not_allowed'){
        friendly = 'この環境からはコメントを送信できません。';
      } else if (res.status === 400){
        if (code === 'bad_author_name') friendly = '名前は1〜40文字で入力してください。';
        else if (code === 'bad_content_length') friendly = 'コメントは1〜1000文字で入力してください。';
        else if (code === 'bad_email') friendly = 'メールアドレスの形式が正しくありません。';
        else friendly = serverMessage || '入力内容を確認してください。';
      } else if (res.status >= 500){
        friendly = 'サーバーエラーが発生しました。時間をおいて再度お試しください。';
      }
      throw new Error(friendly || serverMessage || `HTTP ${res.status}`);
    }
    savePlayerName(sanitizedName);
    savePlayerEmail(email);
    commentMessageInput.value = '';
    commentStatus.textContent = 'コメントを送信しました。承認後に公開されます。ありがとう！';
    commentStatus.style.display = 'block';
    loadComments(false);
  }catch(err){
    console.error('Failed to submit comment', err);
    commentStatus.textContent = err?.message || 'コメントの送信に失敗しました。時間をおいて再度お試しください。';
    commentStatus.style.display = 'block';
  }finally{
    commentSubmitBtn.disabled = false;
  }
}

function normalizeLeaderboardEntries(raw){
  if (Array.isArray(raw)){
    return raw;
  }
  if (!raw || typeof raw !== 'object'){
    if (typeof raw === 'string'){
      try{ return normalizeLeaderboardEntries(JSON.parse(raw)); }
      catch{ return []; }
    }
    return [];
  }
  if (Array.isArray(raw.data)){
    return raw.data;
  }
  if (Array.isArray(raw.leaderboard)){
    return raw.leaderboard;
  }
  if (Array.isArray(raw.results)){
    return raw.results;
  }
  if (raw.data && typeof raw.data === 'object'){
    const nested = normalizeLeaderboardEntries(raw.data);
    if (nested.length) return nested;
  }
  return [];
}

function populateCodex(){
  if (!codexList) return;
  codexList.innerHTML='';
  ITEM_CATALOG.forEach(item=>{
    const li = document.createElement('li');
    li.className = 'codexItem';

    const icon = document.createElement('div');
    icon.className = 'codexIcon';
    icon.textContent = item.icon;

    const body = document.createElement('div');
    body.className = 'codexBody';

    const title = document.createElement('h3');
    title.textContent = `${item.icon} ${item.name}`;

    const desc = document.createElement('p');
    desc.textContent = item.description;

    const meta = document.createElement('div');
    meta.className = 'codexMeta';

    const scoreSpan = document.createElement('span');
    scoreSpan.textContent = `スコア: ${item.score}`;

    const effectSpan = document.createElement('span');
    effectSpan.textContent = `効果: ${item.effect}`;

    meta.appendChild(scoreSpan);
    meta.appendChild(effectSpan);

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(meta);

    li.appendChild(icon);
    li.appendChild(body);

    codexList.appendChild(li);
  });
}


async function submitLeaderboardScore(name, result){
  const payload = {
    name,
    score: Math.max(0, Math.floor(Number(result?.score) || 0)),
    level: Math.max(1, Math.floor(Number(result?.level) || 1)),
    coins: Math.max(0, Math.floor(Number(result?.coins) || 0)),
    char: result?.char || ''
  };
  try{
    const res = await fetch(leaderboardUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.json().catch(()=> ({}));
    return true;
  }catch(err){
    console.error('Failed to submit leaderboard', err);
    if (lbStatus){
      lbStatus.textContent = 'ランキングへの送信に失敗しました。';
      lbStatus.style.display = 'block';
    }
    return false;
  }
}

async function handleLeaderboardAfterGame(result){
  if (lbOverlay){
    lbOverlay.style.display = 'flex';
  }
  if (!result || result.score<=0){
    await loadLeaderboard(true);
    return;
  }
  const stored = loadPlayerName() || DEFAULT_PLAYER_NAME;
  const input = prompt(`ランキングにスコア(${result.score})を登録します。名前を入力してください。`, stored);
  if (input===null){
    await loadLeaderboard(true);
    return;
  }
  const name = sanitizeName(input);
  if (!name){
    alert('名前が空のため送信をスキップしました。');
    await loadLeaderboard(true);
    return;
  }
  savePlayerName(name);
  const ok = await submitLeaderboardScore(name, result);
  if (!ok){
    alert('ランキングへの送信に失敗しました。通信状況をご確認ください。');
  }
  await loadLeaderboard(true);
}

function openHowto(initial=false){
  if (!howOverlay) return;
  howtoLeadMode = initial ? 'initial' : 'default';
  renderHowtoCopy();
  if (howLead){
    howLead.textContent = howtoLeadMode === 'initial' ? howtoCopy.initialLead : howtoCopy.defaultLead;
  }
  howOverlay.style.display='flex';
}

if (btnHow){
  btnHow.addEventListener('click', ()=> openHowto(false));
}
if (howClose){
  howClose.addEventListener('click', ()=>{ howOverlay.style.display='none'; });
}
if (howStart){
  howStart.addEventListener('click', ()=>{
    howOverlay.style.display='none';
    if (!gameOn) startGame();
  });
}
const INTRO_KEY = 'psrun_intro_seen_v2';
try{
  if (!localStorage.getItem(INTRO_KEY)){
    openHowto(true);
    localStorage.setItem(INTRO_KEY,'1');
  }
}catch{
  openHowto(true);
}

// 物理 & ゲーム基本
const G = 0.62, BASE_JUMP = -12.2, GROUND = 72;
const GAME_TIME = 60000;
const INVINCIBILITY_DURATION = 3000;

let gameOn=false, t0=0;
let lastItem=0, lastEnemy=0, lastPower=0, lastShot=0;
let score=0, level=1, lives=3, invUntil=0, hurtUntil=0;
let ult=0, ultReady=false, ultActiveUntil=0;
let coins=0; // ガチャ用
let autoShootUntil=0, bulletBoostUntil=0, scoreMulUntil=0;

const shootCD=250, powerMillis=INVINCIBILITY_DURATION, enemyBonus=3, itemLv=15;
const player = { x:120, y:cv.height-GROUND-46, w:46, h:46, vy:0, onGround:true, color:'#ff6347' };

let items=[], enemies=[], bullets=[], powers=[], ultProjectiles=[];

// ステージ
const stages = [
  { name:'草原',  bg1:'#9ed6ee', bg2:'#fff7e6', ground:'#7fb10a', enemyMul:1.00 },
  { name:'砂漠',  bg1:'#ffd28a', bg2:'#ffe9c7', ground:'#d2a659', enemyMul:1.10 },
  { name:'雪原',  bg1:'#c8e7ff', bg2:'#f6fbff', ground:'#b9d3e5', enemyMul:1.22 },
  { name:'宇宙',  bg1:'#0b1833', bg2:'#1b2850', ground:'#0b1833', enemyMul:1.38 },
];
function stageForLevel(lv){
  if (lv>=10) return stages[3];
  if (lv>=7)  return stages[2];
  if (lv>=4)  return stages[1];
  return stages[0];
}

const ITEM_CATALOG = [
  {
    key:'parfait',
    icon:'🍨',
    name:'パフェデラックス',
    description:'甘さたっぷりの必須スイーツ。食べるほどスコアとコインが増えていく。',
    base:2,
    score:'+2pt',
    effect:'スコア+2／コイン+1／必殺ゲージ+10%'
  },
  {
    key:'fish',
    icon:'🐟',
    name:'イワシキャッチ',
    description:'キレのある塩味で集中力アップ。連続で拾ってコンボを狙おう。',
    base:1,
    score:'+1pt',
    effect:'スコア+1／コイン+1／必殺ゲージ+6%'
  },
  {
    key:'star',
    icon:'⭐',
    name:'スターブースト',
    description:'黄金に輝く守護星。掴んだ瞬間、短時間の無敵とゲージ加速が発動する。',
    base:0,
    score:'スコアなし',
    effect:'無敵3秒／必殺ゲージ+12%'
  }
];
const itemCatalogMap = ITEM_CATALOG.reduce((map,item)=>{ map[item.key]=item; return map; }, {});
let runStats = createRunStats();

// ====== キャラ定義 ======
/*
  各値は倍率/ミリ秒。
  special: ['magnet','oneGuard','doubleJump','pierce']
  ult: 'rainbow' | 'storm' | 'ncha' | 'yadon' | null
*/
const characters = {
  // Common
  parfen:   { key:'parfen',   name:'🍓パフェン',    emoji:'🍓', rar:'C', move:1.00, jump:1.00, bullet:1.00, inv:INVINCIBILITY_DURATION, ultRate:1.00, special:[],             ult:null },
  iwassy:   { key:'iwassy',   name:'🐟イワッシー',  emoji:'🐟', rar:'C', move:1.00, jump:1.10, bullet:1.00, inv:INVINCIBILITY_DURATION, ultRate:1.00, special:['airAttack'], ult:null },

  // Rare
  choco:    { key:'choco',    name:'🍫チョコパフェン', emoji:'🍫', rar:'R', move:1.00, jump:1.00, bullet:1.15, inv:INVINCIBILITY_DURATION, ultRate:1.00, special:[],           ult:null },
  missile:  { key:'missile',  name:'🚀ミサイル君',   emoji:'🚀', rar:'R', move:1.10, jump:1.00, bullet:1.00, inv:INVINCIBILITY_DURATION, ultRate:1.05, special:[],           ult:null },

  // Epic
  ice:      { key:'ice',      name:'❄️アイス皇帝',  emoji:'❄️', rar:'E', move:1.00, jump:1.20, bullet:1.00, inv:INVINCIBILITY_DURATION, ultRate:1.00, special:['slowEnemy'], ult:null },

  // Legendary
  king:     { key:'king',     name:'👑キングパフェ', emoji:'👑', rar:'L', move:1.15, jump:1.10, bullet:1.10, inv:INVINCIBILITY_DURATION, ultRate:1.20, special:[], ult:'rainbow' },
  ncha:     { key:'ncha',     name:'🤖んちゃマシン', emoji:'🤖', rar:'L', move:1.20, jump:1.05, bullet:1.25, inv:INVINCIBILITY_DURATION, ultRate:1.25, special:['pierce'], ult:'ncha' },

  // Mythic
  aurora:   { key:'aurora',   name:'🌈オーロラパフェ', emoji:'🌈', rar:'M', move:1.18, jump:1.12, bullet:1.15, inv:INVINCIBILITY_DURATION, ultRate:1.35, special:['magnet','oneGuard'], ult:'rainbow' },
  iwashiK:  { key:'iwashiK',  name:'🌀トルネード鰯王', emoji:'🌀', rar:'M', move:1.15, jump:1.20, bullet:1.10, inv:INVINCIBILITY_DURATION, ultRate:1.30, special:['doubleJump','pierce'], ult:'storm' },
  yadon:    { key:'yadon',    name:'🦛まったりヤドン', emoji:'🦛', rar:'M', move:0.98, jump:1.08, bullet:1.05, inv:INVINCIBILITY_DURATION, ultRate:1.45, special:['magnet'], ult:'yadon' },
};

// レア→カラー/順序
const rarOrder = ['C','R','E','L','M'];
function rarClass(r){ return r==='M'?'rar-m':r==='L'?'rar-l':r==='E'?'rar-e':r==='R'?'rar-r':'rar-c'; }

// 所持データ（localStorage）
const STORE_KEY = 'psrun_char_collection_v1';
const BEST_SCORE_KEY = 'psrun_best_score_v1';
let collection = loadCollection();
let currentCharKey = collection.current || 'parfen';
if(!collection.owned[currentCharKey]) {
  // 初回はパフェン付与
  collection.owned.parfen = { owned:true, dup:0, limit:0 };
  saveCollection();
  currentCharKey = 'parfen';
}
updateCharInfo();
let bestScore = loadBestScore();

// ====== ガチャ：確率 & 天井 ======
/*
  確率：C60/R24/E10/L5/M1
  天井：30連でL以上保証 / 100連でM保証
*/
const pityKey = 'psrun_pity_v1';
let pity = loadPity(); // {sinceL:0, sinceM:0}

function rollRarity(){
  const p = Math.random();
  if (p < 0.01) return 'M';
  if (p < 0.06) return 'L';
  if (p < 0.16) return 'E';
  if (p < 0.40) return 'R';
  return 'C';
}
function rollCharByRar(r){
  const pool = Object.values(characters).filter(c=>c.rar===r);
  return pool[Math.floor(Math.random()*pool.length)];
}
function doGacha(n){
  const cost = n===10?100:10;
  if (coins<cost) return;
  coins -= cost;

  // 保障適用のため、結果配列を先にレアだけ決める
  let rarities = [];
  for(let i=0;i<n;i++){
    let r = rollRarity();
    // 30連L保障（sinceL>=29 で次はL以上保証）
    if (pity.sinceL >= 29 && i===0) r = (Math.random()<0.167)?'M':'L';
    rarities.push(r);
  }
  // 100連M保障（sinceM>=99 で最後をMに）
  if (pity.sinceM >= 99) rarities[rarities.length-1] = 'M';

  // 結果生成
  const results = rarities.map(r=>{
    const ch = rollCharByRar(r);
    addToCollection(ch.key);
    // pity更新
    if (r==='M') { pity.sinceM=0; pity.sinceL=0; }
    else if (r==='L') { pity.sinceL=0; pity.sinceM++; }
    else { pity.sinceL++; pity.sinceM++; }
    return ch;
  });
  savePity();
  setHUD(GAME_TIME-(now()-t0));

  // 表示
  resWrap.innerHTML='';
  resWrap.style.gridTemplateColumns = `repeat(${Math.min(5,results.length)},1fr)`;
  results.forEach(ch=>{
    const dv=document.createElement('div');
    dv.className=`miniCard ${rarClass(ch.rar)}`;
    const own = collection.owned[ch.key];
    dv.innerHTML = `<div class="big">${ch.emoji}</div>
      <div>${ch.name}</div>
      <div class="small">R:${ch.rar} / LB:${own.limit}</div>`;
    dv.onclick = ()=>{ setCurrentChar(ch.key); ov.style.display='none'; };
    resWrap.appendChild(dv);
  });
  ov.style.display='flex';
}

function addToCollection(key){
  if (!collection.owned[key]) collection.owned[key] = { owned:true, dup:0, limit:0 };
  else {
    collection.owned[key].dup++;
    // 限界突破ルール（被り強化）
    const rar = characters[key].rar;
    const inc = rar==='M' ? 0.04 : rar==='L' ? 0.03 : rar==='E' ? 0.025 : rar==='R' ? 0.015 : 0.005;
    collection.owned[key].limit = +(collection.owned[key].limit + inc).toFixed(3); // 小数で蓄積
  }
  saveCollection();
}

// コレクションUI
btnCollection.onclick = ()=>{
  colGrid.innerHTML='';
  // ソート：レア→所持→名前
  const list = Object.values(characters).sort((a,b)=>{
    const ra = rarOrder.indexOf(a.rar), rb = rarOrder.indexOf(b.rar);
    if (ra!==rb) return ra-rb;
    const oa = !!collection.owned[a.key], ob = !!collection.owned[b.key];
    if (oa!==ob) return (ob?1:-1);
    return a.name.localeCompare(b.name,'ja');
  });
  list.forEach(ch=>{
    const own = collection.owned[ch.key];
    const dv=document.createElement('div');
    dv.className=`miniCard ${rarClass(ch.rar)}`;
    dv.innerHTML = `<div class="big">${ch.emoji}</div>
      <div>${ch.name}</div>
      <div class="small">${own?`R:${ch.rar} / LB:${own.limit||0}`:'未所持'}</div>`;
    dv.onclick = ()=>{
      colSelectedKey = ch.key;
      colEquip.disabled = !own;
      // 軽い選択ハイライト
      [...colGrid.children].forEach(x=>x.style.outline='none');
      dv.style.outline='2px solid #fff';
    };
    colGrid.appendChild(dv);
  });
  colOv.style.display='flex';
};

// ====== HUD / 便利 ======
function hearts(n){ return '❤️'.repeat(n) + '♡'.repeat(3-n); }
function setHUD(remainMs){
  const sec = Math.max(0, Math.ceil(remainMs/1000));
  const invActive = now()<invUntil;
  const st = stageForLevel(level).name;
  const ch = characters[currentCharKey];
  const own = collection.owned[currentCharKey];
  const lb = own?.limit? own.limit : 0;
  const bestText = (Number.isFinite(bestScore) ? bestScore : 0).toLocaleString('ja-JP');
  const scoreText = score.toLocaleString('ja-JP');
  const coinText = coins.toLocaleString('ja-JP');
  hud.innerHTML = `
    <div class="hudRow">
      <span class="hudItem"><strong>ステージ</strong><span class="value">${st}</span></span>
      <span class="hudItem"><strong>レベル</strong><span class="value">${level}</span></span>
      <span class="hudItem"><strong>残り</strong><span class="value">${sec}秒</span></span>
      ${invActive ? '<span class="hudItem"><span class="hudTag">無敵中</span></span>' : ''}
    </div>
    <div class="hudRow">
      <span class="hudItem hudHearts"><strong>ライフ</strong><span class="value">${hearts(lives)}</span></span>
      <span class="hudItem"><strong>スコア</strong><span class="value">${scoreText}</span></span>
      <span class="hudItem hudCoins"><strong>コイン</strong><span class="value">🪙${coinText}</span></span>
      <span class="hudItem"><strong>必殺</strong><span class="value">${Math.floor(ult)}%</span></span>
      <span class="hudItem"><strong>ベスト</strong><span class="value">${bestText}</span></span>
    </div>`;
  charInfo.textContent = `CHAR: ${ch.emoji} ${ch.name} [${ch.rar}]  LB:${lb}`;
  btnUlt.style.display = ultReady ? 'block':'none';
  btnGacha.disabled = coins < 10;
  btnGacha10.disabled = coins < 100;
}

function refreshHUD(){
  const remain = gameOn ? (GAME_TIME - (now()-t0)) : 0;
  setHUD(remain);
}
const now = ()=>performance.now();
const rand = (a,b)=> a + Math.random()*(b-a);
const AABB = (a,b)=> a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
const clamp = (v,min,max)=> Math.max(min, Math.min(max,v));

function createRunStats(){
  const itemStats = {};
  ITEM_CATALOG.forEach(item=>{
    itemStats[item.key] = { count:0, total:0 };
  });
  return {
    items: itemStats,
    enemies: {
      totalCount:0,
      totalScore:0,
      types:{}
    }
  };
}

function resetRunStats(){
  runStats = createRunStats();
}

function registerItemGain(key, gained){
  if (!runStats?.items?.[key]) return;
  runStats.items[key].count += 1;
  runStats.items[key].total += gained;
}

function awardEnemyDefeat(enemy){
  score += enemyBonus;
  coins += 2;
  if (!runStats?.enemies) return;
  runStats.enemies.totalCount += 1;
  runStats.enemies.totalScore += enemyBonus;
  const type = enemy?.type || 'other';
  if (!runStats.enemies.types[type]){
    runStats.enemies.types[type] = { count:0, total:0 };
  }
  runStats.enemies.types[type].count += 1;
  runStats.enemies.types[type].total += enemyBonus;
}

function buildItemBreakdown(){
  return ITEM_CATALOG.map(item=>{
    const data = runStats?.items?.[item.key] || { count:0, total:0 };
    const count = data.count || 0;
    const base = item.base || 0;
    const total = Number(data.total || 0);
    const baseTotal = count * base;
    const bonus = Math.max(0, total - baseTotal);
    return {
      key:item.key,
      icon:item.icon,
      name:item.name,
      count,
      base,
      total,
      bonus,
      note: base===0 ? item.effect : ''
    };
  });
}

function buildEnemyBreakdown(){
  const enemyStats = runStats?.enemies || { totalCount:0, totalScore:0, types:{} };
  const breakdown = [];
  const seen = new Set();
  Object.entries(enemyTypeMeta).forEach(([type, meta])=>{
    const data = enemyStats.types?.[type] || { count:0, total:0 };
    const count = data.count || 0;
    const total = Number(data.total || 0);
    const bonus = Math.max(0, total - enemyBonus * count);
    breakdown.push({
      type,
      icon: meta.icon,
      name: meta.label,
      count,
      base: enemyBonus,
      total,
      bonus
    });
    seen.add(type);
  });
  Object.entries(enemyStats.types || {}).forEach(([type, data])=>{
    if (seen.has(type)) return;
    const count = data.count || 0;
    const total = Number(data.total || 0);
    const bonus = Math.max(0, total - enemyBonus * count);
    const label = type === 'other' ? 'その他' : `その他 (${type})`;
    breakdown.push({
      type,
      icon: enemyTypeIcons[type] || '⚔',
      name: label,
      count,
      base: enemyBonus,
      total,
      bonus
    });
  });
  return {
    totalCount: enemyStats.totalCount || 0,
    totalScore: enemyStats.totalScore || 0,
    types: breakdown
  };
}

function buildScoreBreakdownLines(){
  const lines = [];
  const itemBreakdown = buildItemBreakdown();
  itemBreakdown.forEach(entry=>{
    const totalText = Number(entry.total || 0).toLocaleString('ja-JP');
    if (entry.base === 0){
      const note = entry.count>0 && entry.note ? `（${entry.note}）` : '';
      lines.push(`${entry.icon} ${entry.name}: ${entry.count}個 ×0 = 0pt${note ? note : ''}`);
    }else{
      let line = `${entry.icon} ${entry.name}: ${entry.count}個 ×${entry.base} = ${totalText}pt`;
      if (entry.bonus>0){
        line += `（ボーナス+${entry.bonus.toLocaleString('ja-JP')}）`;
      }
      lines.push(line);
    }
  });
  const enemyBreak = buildEnemyBreakdown();
  const counted = enemyBreak.types.filter(entry=>entry.count>0);
  if (counted.length){
    counted.forEach(entry=>{
      let line = `${entry.icon} ${entry.name}: ${entry.count}体 ×${entry.base} = ${Number(entry.total || 0).toLocaleString('ja-JP')}pt`;
      if (entry.bonus>0){
        line += `（ボーナス+${entry.bonus.toLocaleString('ja-JP')}）`;
      }
      lines.push(line);
    });
  }else{
    lines.push('⚔ 敵撃破: 0体 ×0 = 0pt');
  }
  return lines;
}

function populateResultOverlay(result){
  if (!resultOverlay) return;
  if (resultSummary){
    const ch = characters[currentCharKey];
    const summaryRows = [
      { label:'SCORE', value:(Number(result?.score) || 0).toLocaleString('ja-JP') },
      { label:'LEVEL', value:`${Number(result?.level) || 1}` },
      { label:'COINS', value:`🪙${(Number(result?.coins) || 0).toLocaleString('ja-JP')}` },
      { label:'CHAR', value:`${ch.emoji} ${ch.name}` },
      { label:'BEST', value:(Number.isFinite(bestScore) ? bestScore : 0).toLocaleString('ja-JP') }
    ];
    resultSummary.innerHTML = '';
    summaryRows.forEach(row=>{
      const div = document.createElement('div');
      div.className = 'resultSummaryRow';
      const strong = document.createElement('strong');
      strong.textContent = row.label;
      const span = document.createElement('span');
      span.textContent = row.value;
      div.appendChild(strong);
      div.appendChild(span);
      resultSummary.appendChild(div);
    });
  }

  if (resultItemList){
    resultItemList.innerHTML = '';
    const items = buildItemBreakdown();
    items.forEach(entry=>{
      const li = document.createElement('li');
      li.className = 'resultItem';
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = `${entry.icon} ${entry.name}`;
      const value = document.createElement('span');
      value.className = 'value';
      value.textContent = `${entry.count}個 ×${entry.base} = ${Number(entry.total || 0).toLocaleString('ja-JP')}pt`;
      if (entry.bonus>0){
        const bonus = document.createElement('small');
        bonus.textContent = `ボーナス+${entry.bonus.toLocaleString('ja-JP')}`;
        value.appendChild(bonus);
      }else if (entry.base===0 && entry.note && entry.count>0){
        const note = document.createElement('span');
        note.className = 'note';
        note.textContent = entry.note;
        value.appendChild(note);
      }
      li.appendChild(label);
      li.appendChild(value);
      resultItemList.appendChild(li);
    });
  }

  if (resultEnemyList){
    resultEnemyList.innerHTML = '';
    const enemyData = buildEnemyBreakdown();
    const entries = enemyData.types;
    if (!entries.length){
      const li = document.createElement('li');
      li.className = 'resultEmpty';
      li.textContent = '敵データなし';
      resultEnemyList.appendChild(li);
    }else{
      const allZero = entries.every(entry=>entry.count===0);
      entries.forEach(entry=>{
        const li = document.createElement('li');
        if (!entry.count) li.classList.add('muted');
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = `${entry.icon} ${entry.name}`;
        const value = document.createElement('span');
        value.className = 'value';
        value.textContent = `${entry.count}体 ×${entry.base} = ${Number(entry.total || 0).toLocaleString('ja-JP')}pt`;
        if (entry.bonus>0){
          const bonus = document.createElement('small');
          bonus.textContent = `ボーナス+${entry.bonus.toLocaleString('ja-JP')}`;
          value.appendChild(bonus);
        }
        li.appendChild(label);
        li.appendChild(value);
        resultEnemyList.appendChild(li);
      });
      if (allZero){
        const note = document.createElement('li');
        note.className = 'resultEmpty';
        note.textContent = '敵を撃破していません';
        resultEnemyList.appendChild(note);
      }
    }
  }
}

function hideResultOverlay(){
  if (resultOverlay){
    resultOverlay.style.display = 'none';
  }
}

function showResultOverlay(result){
  if (!resultOverlay) return;
  populateResultOverlay(result);
  resultOverlay.style.display = 'flex';
}

if (resultClose){
  resultClose.addEventListener('click', hideResultOverlay);
}
if (resultOverlay){
  resultOverlay.addEventListener('click', (ev)=>{
    if (ev.target === resultOverlay) hideResultOverlay();
  });
}
if (resultReplay){
  resultReplay.addEventListener('click', ()=>{
    hideResultOverlay();
    startGame();
  });
}

// ====== スポーン ======
function spawnItem(){
  const isParfait = Math.random()<0.5;
  items.push({
    x: cv.width+24,
    y: cv.height - GROUND - 44 - rand(0, 95),
    w: 30, h: 30,
    v: 3.0 + rand(.6,1.8) + (level-1)*.22,
    char: isParfait ? '🍨' : '🐟',
    score: isParfait ? 2 : 1
  });
}
const enemyTypeMeta = {
  straight:{ icon:'👾', label:'直進型' },
  zigzag:{ icon:'🐍', label:'蛇行型' },
  dash:{ icon:'💥', label:'加速突進型' },
  hover:{ icon:'🛸', label:'上下ホバー型' }
};
const enemyTypeIcons = Object.fromEntries(Object.entries(enemyTypeMeta).map(([type, meta])=>[type, meta.icon]));

function pickEnemyType(lv){
  const r = Math.random();
  if (lv < 3){
    return r < 0.75 ? 'straight' : 'zigzag';
  }
  if (lv < 6){
    if (r < 0.55) return 'straight';
    if (r < 0.8) return 'zigzag';
    return 'hover';
  }
  if (r < 0.4) return 'straight';
  if (r < 0.65) return 'zigzag';
  if (r < 0.85) return 'hover';
  return 'dash';
}

function spawnEnemy(offset=0){
  const st = stageForLevel(level);
  const baseSpeed = (2.7 + (level-1)*.35) * st.enemyMul;
  const type = pickEnemyType(level);
  const baseY = cv.height - GROUND - 36;
  const enemy = {
    x: cv.width+30 + offset,
    y: baseY,
    w: 36,
    h: 36,
    vx: baseSpeed,
    type,
    icon: enemyTypeIcons[type] || '👾',
    spawnAt: now(),
    phase: Math.random()*Math.PI*2,
    baseY
  };

  if (type === 'zigzag'){
    enemy.vx = baseSpeed*0.9;
    enemy.amplitude = rand(28, 68);
    enemy.frequency = rand(0.08, 0.14);
    enemy.baseY = baseY - rand(10, 50);
  } else if (type === 'dash'){
    enemy.vx = baseSpeed*0.75;
    enemy.maxV = baseSpeed*1.9;
    enemy.accel = baseSpeed*0.045;
    enemy.charge = rand(260, 460);
    enemy.boosted = false;
  } else if (type === 'hover'){
    enemy.vx = baseSpeed*0.85;
    enemy.hoverRange = rand(28, 92);
    enemy.hoverSpeed = rand(0.02, 0.035);
    enemy.baseY = baseY - rand(40, 120);
  }

  enemies.push(enemy);
}
function spawnPower(){
  powers.push({
    x: cv.width+26,
    y: cv.height - GROUND - 44 - rand(0, 120),
    w: 26, h: 26,
    v: 3.0 + (level-1)*.25
  });
}

// ====== 入力 ======
let canDouble = false, guardReadyTime = 0;
function jump(){
  if (!gameOn) return;
  // 二段ジャンプ判定
  const hasDouble = characters[currentCharKey].special?.includes('doubleJump');
  if (player.onGround){
    player.vy = currentStats.jump; player.onGround=false;
    canDouble = hasDouble; // 地上離陸時に2段目権利付与
  } else if (hasDouble && canDouble){
    player.vy = currentStats.jump * 0.9; // 2段目はやや弱め
    canDouble = false;
  }
}
function shoot(){
  if (!gameOn) return;
  const t=now(); if (t-lastShot<shootCD) return; lastShot=t;
  const pierce = characters[currentCharKey].special?.includes('pierce');
  const v = 9+level*.6 + (now()<bulletBoostUntil? 4:0);
  bullets.push({ x:player.x+player.w, y:player.y+player.h/2-3, w:12, h:6, v: v*currentStats.bullet, hitsLeft: pierce? 2 : 1 });
}
function tryUlt(){
  if (!gameOn||!ultReady) return;
  ultReady=false; ult=0;
  const type = characters[currentCharKey].ult;
  ultProjectiles.length = 0;
  if (type==='storm') {
    ultActiveUntil = now()+1600;
  } else if (type==='ncha') {
    ultActiveUntil = now()+1500;
  } else if (type==='yadon') {
    ultActiveUntil = now()+2600;
    const baseY = player.y + player.h/2;
    const count = 6;
    for (let i=0;i<count;i++){
      const spread = i - (count-1)/2;
      ultProjectiles.push({
        x: player.x + player.w - 8,
        y: baseY + spread*20,
        w: 32,
        h: 32,
        vx: 5.4 + Math.abs(spread)*0.6,
        vy: spread*0.28,
        gravity: 0.08,
        hits: 2,
        char: '🦛',
        expires: now()+2800,
        dead: false,
      });
    }
  } else {
    ultActiveUntil = now()+2000; // rainbowデフォ
  }
}

// PCキー
window.addEventListener('keydown', e=>{
  if (e.code==='Space' || e.code==='ArrowUp') jump();
  if (e.key==='z'||e.key==='x'||e.key==='Z'||e.key==='X') shoot();
  if (e.key==='c' || e.key==='C') tryUlt();
});

// タッチ（左＝ジャンプ、右＝攻撃 or 長押しで必殺）
let pressTimer=null, pressedRight=false;
cv.addEventListener('touchstart', e=>{
  e.preventDefault();
  const rect=cv.getBoundingClientRect();
  const x=e.changedTouches[0].clientX - rect.left;
  const isLeft = x < rect.width/2;
  if (isLeft){ jump(); pressedRight=false; }
  else {
    pressedRight=true;
    pressTimer=setTimeout(()=>{ if(pressedRight) tryUlt(); }, 350);
    shoot();
  }
},{passive:false});
cv.addEventListener('touchend', ()=>{ pressedRight=false; clearTimeout(pressTimer); }, {passive:true});
btnUlt.addEventListener('click', tryUlt);

// ====== キャラ適用 ======
let currentStats = getEffectiveStats(currentCharKey);
function getEffectiveStats(key){
  // 基本
  const ch = characters[key];
  const lb = collection.owned[key]?.limit || 0; // 小数の累積
  // 限界突破ぶんを等倍増加（例：+0.03 なら +3%）
  return {
    move:   ch.move   * (1+lb),
    jump:   BASE_JUMP * ch.jump * (1+lb*0.5), // ジャンプは控えめに反映
    bullet: ch.bullet * (1+lb),
    inv:    Math.min(INVINCIBILITY_DURATION, Math.floor(ch.inv * (1+lb*0.5))),
    ultRate:ch.ultRate* (1+lb*0.5),
    special: ch.special,
    ult: ch.ult,
  };
}
function setCurrentChar(key){
  currentCharKey = key;
  collection.current = key;
  saveCollection();
  currentStats = getEffectiveStats(key);
  updateCharInfo();
}
function updateCharInfo(){
  const ch = characters[currentCharKey];
  const own = collection.owned[currentCharKey];
  const lb = own?.limit? own.limit : 0;
  charInfo.textContent = `CHAR: ${ch.emoji} ${ch.name} [${ch.rar}]  LB:${lb}`;
}

// ====== 更新 ======
function update(t){
  if(!gameOn) return;
  const elapsed=t-t0, remain=GAME_TIME-elapsed;
  if (remain<=0) return endGame();

  // レベル
  level = Math.max(1, Math.floor(score/itemLv)+1);
  const st = stageForLevel(level);

  // 生成間隔
  const itemIv  = clamp(1200 - (level-1)*100, 480, 1200);
  const enemyIv = clamp(1600 - (level-1)*120, 520, 1600);
  const powerIv = 11000;

  if(t-lastItem  > itemIv)  { spawnItem();  lastItem=t; }
  if(t-lastEnemy > enemyIv) {
    spawnEnemy();
    const extraChance = clamp(0.06 + level*0.018, 0.06, 0.45);
    if (Math.random()<extraChance){
      spawnEnemy(rand(36, 120));
    }
    lastEnemy=t;
  }
  if(t-lastPower > powerIv) { spawnPower(); lastPower=t; }

  // 物理
  player.vy += G; player.y += player.vy;
  if (player.y+player.h >= cv.height-GROUND){
    player.y=cv.height-GROUND-player.h; player.vy=0; player.onGround=true; canDouble = characters[currentCharKey].special?.includes('doubleJump');
  }

  // オート射撃（ガチャ効果など将来用）
  if (now()<autoShootUntil && t-lastShot>shootCD*0.6){ shoot(); }

  // 弾
  bullets = bullets.filter(b=> {
    b.x += b.v;
    return (b.x < cv.width+24) && b.hitsLeft>0;
  });

  // アイテム（Mythic magnet）
  const hasMagnet = characters[currentCharKey].special?.includes('magnet');
  items = items.filter(it=>{
    // 吸引
    if (hasMagnet){
      const dx = (player.x - it.x), dy = (player.y - it.y);
      const dist = Math.hypot(dx,dy);
      if (dist < 160){
        it.x += dx*0.18; it.y += dy*0.18;
      }
    }
    it.x -= it.v;
    if (AABB(player,it)){
      const mul = now()<scoreMulUntil ? 2 : 1;
      const gained = it.score*mul;
      score += gained; coins += 1 * mul;
      const itemKey = it.char==='🍨' ? 'parfait' : 'fish';
      registerItemGain(itemKey, gained);
      ult = clamp(ult + (it.char==='🍨'?10:6) * currentStats.ultRate, 0, 100);
      return false;
    }
    return it.x+it.w>0;
  });

  // ⭐
  powers = powers.filter(pw=>{
    pw.x -= pw.v;
    if (AABB(player,pw)){
      registerItemGain('star', 0);
      invUntil=now()+Math.max(powerMillis,currentStats.inv);
      ult=Math.min(100,ult+12*currentStats.ultRate);
      return false;
    }
    return pw.x+pw.w>0;
  });

  // 必殺投射体（ヤドン砲）
  ultProjectiles.forEach(p=>{
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
  });

  // 必殺準備
  if (ult>=100) ultReady=true;

  // 敵
  const hasSlow = characters[currentCharKey].special?.includes('slowEnemy');
  enemies = enemies.filter(en=>{
    const spawnAt = en.spawnAt ?? (en.spawnAt = now());
    if (!Number.isFinite(en.vx)) en.vx = en.v ?? 0;
    if (!Number.isFinite(en.baseY)) en.baseY = en.y;
    if (!Number.isFinite(en.phase)) en.phase = 0;

    if (en.type === 'zigzag'){
      const freq = en.frequency ?? 0.1;
      en.phase += freq;
      const amp = en.amplitude ?? 36;
      en.y = en.baseY + Math.sin(en.phase) * amp;
    } else if (en.type === 'hover'){
      const speed = en.hoverSpeed ?? 0.028;
      const range = en.hoverRange ?? 52;
      en.phase += speed;
      en.y = en.baseY + Math.sin(en.phase) * range;
    } else if (en.type === 'dash'){
      const charge = en.charge ?? 320;
      if (!en.boosted && (t - spawnAt) >= charge){
        en.boosted = true;
      }
      if (en.boosted){
        const accel = en.accel ?? (en.vx*0.05);
        const maxV = en.maxV ?? (en.vx*2.1);
        en.vx = Math.min(maxV, en.vx + accel);
      }
    }

    en.y = clamp(en.y, 18, cv.height - GROUND - en.h + 6);
    en.x -= en.vx;

    // 必殺
    if (now()<ultActiveUntil){
      const type = characters[currentCharKey].ult;
      if (type==='storm'){
        const cx = player.x+player.w/2, cy = player.y+player.h/2;
        const ex = en.x+en.w/2, ey = en.y+en.h/2;
        const hit = Math.hypot(cx-ex, cy-ey) <= 120;
        if (hit){ awardEnemyDefeat(en); return false; }
      } else if (type==='ncha'){
        const beamX = player.x + player.w - 6;
        const beamTop = player.y - 36;
        const beamBottom = player.y + player.h + 36;
        const hit = (en.x+en.w) >= beamX && en.x <= cv.width && en.y <= beamBottom && (en.y+en.h) >= beamTop;
        if (hit){ awardEnemyDefeat(en); return false; }
      } else {
        const lanes = [player.y + player.h/2, player.y + player.h/2 - 36, player.y + player.h/2 + 36];
        const hit = lanes.some(y=> en.y-6 <= y && y <= en.y+en.h+6);
        if (hit){ awardEnemyDefeat(en); return false; }
      }
    }

    if (characters[currentCharKey].ult==='yadon'){
      for (let i=0;i<ultProjectiles.length;i++){
        const shot = ultProjectiles[i];
        if (!shot || shot.dead) continue;
        if (AABB(en, shot)){
          awardEnemyDefeat(en);
          shot.hits--;
          if (shot.hits<=0) shot.dead=true;
          return false;
        }
      }
    }

    for (let i=0;i<bullets.length;i++){
      if (AABB(en,bullets[i])){
        awardEnemyDefeat(en);
        bullets[i].hitsLeft--;
        if (hasSlow){
          en.vx = Math.max(en.vx*0.6, 1.6);
        }
        if (bullets[i].hitsLeft<=0) bullets.splice(i,1);
        return false;
      }
    }

    if (AABB(player,en)){
      if (now()<invUntil){ awardEnemyDefeat(en); return false; }
      const hasGuard = characters[currentCharKey].special?.includes('oneGuard');
      if (hasGuard && now() - guardReadyTime > 7000){
        guardReadyTime = now();
        return false;
      }
      if (now()>hurtUntil){
        lives=Math.max(0,lives-1); hurtUntil=now()+900;
        if (lives===0){ endGame(); return false; }
      }
    }
    return en.x+en.w>0 && en.y < cv.height;
  });

  ultProjectiles = ultProjectiles.filter(p=> !p.dead && now()<p.expires && p.x<cv.width+60 && p.y>-80 && p.y<cv.height+80 && p.hits>0);

  draw(remain, st);
  requestAnimationFrame(update);
}

// ====== 描画 ======
function draw(remain, st){
  const g=c.createLinearGradient(0,0,0,cv.height);
  g.addColorStop(0, st.bg1); g.addColorStop(1, st.bg2);
  c.fillStyle=g; c.fillRect(0,0,cv.width,cv.height);
  c.fillStyle=st.ground; c.fillRect(0, cv.height-GROUND, cv.width, GROUND);

  if (now()<invUntil){ c.strokeStyle='#f5c542'; c.lineWidth=4; c.strokeRect(player.x-2,player.y-2,player.w+4,player.h+4); }
  const blink = now()<hurtUntil && Math.floor(now()/60)%2===0;
  if (!blink){ c.fillStyle=player.color; c.fillRect(player.x,player.y,player.w,player.h); }

  // 必殺描画
  if (now()<ultActiveUntil){
    const type = characters[currentCharKey].ult;
    if (type==='storm'){
      const cx = player.x+player.w/2, cy = player.y+player.h/2;
      c.fillStyle='rgba(80,160,255,.25)'; c.beginPath(); c.arc(cx,cy,120,0,Math.PI*2); c.fill();
      c.strokeStyle='rgba(200,230,255,.7)'; c.lineWidth=3; c.beginPath(); c.arc(cx,cy,88,0,Math.PI*2); c.stroke();
    } else if (type==='ncha'){
      const beamX = player.x + player.w - 6;
      const beamTop = player.y - 36;
      const beamH = player.h + 72;
      const intensity = 0.45 + 0.25 * ((Math.sin(now()/90)+1)/2);
      c.fillStyle=`rgba(255,235,59,${intensity})`; c.fillRect(beamX, beamTop, cv.width-beamX, beamH);
      c.fillStyle='rgba(255,255,255,0.8)'; c.fillRect(beamX, beamTop + beamH/2 - 6, cv.width-beamX, 12);
    } else if (type==='yadon'){
      const auraPulse = 40 + Math.sin(now()/140)*6;
      c.strokeStyle='rgba(255,192,203,0.7)';
      c.lineWidth=6;
      c.beginPath(); c.arc(player.x+player.w/2, player.y+player.h/2, auraPulse, 0, Math.PI*2); c.stroke();
    } else {
      const laneYs = [player.y + player.h/2, player.y + player.h/2 - 36, player.y + player.h/2 + 36];
      laneYs.forEach((y,idx)=>{
        c.fillStyle=`rgba(${180+idx*25},${80+idx*50},255,.65)`; c.fillRect(player.x, y-6, cv.width-player.x, 12);
        c.fillStyle='rgba(255,255,255,.55)'; c.fillRect(player.x, y-2, cv.width-player.x, 4);
      });
    }
  }

  // 弾
  if (bullets.length){
    c.save();
    c.lineJoin = 'round';
    c.lineCap = 'round';
    bullets.forEach(b=>{
      const grad = c.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
      grad.addColorStop(0, '#fef3c7');
      grad.addColorStop(1, '#f97316');
      c.fillStyle = grad;
      c.fillRect(b.x, b.y, b.w, b.h);
      c.strokeStyle = 'rgba(124,45,18,0.75)';
      c.lineWidth = 1.2;
      c.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    });
    c.restore();
  }

  // アイテム
  c.font='28px serif'; c.textBaseline='top';
  items.forEach(it=> c.fillText(it.char,it.x,it.y));

  // ヤドン砲の群れ
  if (ultProjectiles.length){
    c.font='32px serif';
    ultProjectiles.forEach(p=>{
      const fade = Math.max(0.35, Math.min(1, (p.expires - now())/400));
      c.save();
      c.globalAlpha = fade;
      c.fillText(p.char, p.x, p.y);
      c.restore();
    });
  }

  // ⭐
  powers.forEach(pw=>{ c.font='26px serif'; c.fillText('⭐', pw.x, pw.y); });

  // 敵
  enemies.forEach(en=>{ c.font='32px serif'; c.fillText(en.icon || '👾', en.x, en.y-4); });

  setHUD(remain);
}

// ====== 開始/終了 ======
function startGame(){
  hideResultOverlay();
  resetRunStats();
  score=0; level=1; lives=3; invUntil=0; hurtUntil=0; ult=0; ultReady=false; ultActiveUntil=0;
  coins=0; autoShootUntil=0; bulletBoostUntil=0; scoreMulUntil=0;
  items.length=0; enemies.length=0; bullets.length=0; powers.length=0; ultProjectiles.length=0;
  player.x=120; player.y=cv.height-GROUND-player.h; player.vy=0; player.onGround=true;
  canDouble = characters[currentCharKey].special?.includes('doubleJump');
  guardReadyTime = 0;
  btnStart.style.display='none'; btnRestart.style.display='none';
  t0=now(); gameOn=true;
  lastItem=lastEnemy=lastPower=lastShot=t0;
  currentStats = getEffectiveStats(currentCharKey);
  setHUD(GAME_TIME); draw(GAME_TIME, stageForLevel(level));
  requestAnimationFrame(update);
}
function endGame(){
  if(!gameOn) return; gameOn=false;
  const st = stageForLevel(level);
  draw(0, st);
  c.fillStyle='rgba(0,0,0,.55)'; c.fillRect(0,0,cv.width,cv.height);
  c.fillStyle='#fff'; c.textAlign='center';
  c.font='36px sans-serif'; c.fillText('ゲーム終了！', cv.width/2, cv.height/2 - 24);
  c.font='24px sans-serif'; c.fillText(`最終スコア: ${score}　レベル: ${level}　コイン: 🪙${coins}`, cv.width/2, cv.height/2 + 10);
  c.font='18px sans-serif';
  const breakdown = buildScoreBreakdownLines();
  breakdown.forEach((line, idx)=>{
    c.fillText(line, cv.width/2, cv.height/2 + 46 + idx*24);
  });
  const finalResult = { score, level, coins, char: currentCharKey };
  updateBestScore(finalResult.score);
  showResultOverlay(finalResult);
  c.textAlign='start'; btnRestart.style.display='inline-block';
  setTimeout(()=>{ handleLeaderboardAfterGame(finalResult).catch(err=>console.error(err)); }, 200);
}

// ====== ボタン ======
btnStart.addEventListener('click', startGame);
btnRestart.addEventListener('click', startGame);

btnHow.addEventListener('click', ()=>{
  alert(
    '▶ 基本ルール\n' +
    '・スタートで60秒ラン開始。敵を避けつつ🍨や🐟を集めてスコアを伸ばそう。\n' +
    '・ダメージを受けるとライフ減。ゼロになるとゲーム終了。\n\n' +
    '▶ 操作（タッチ・マウス共通）\n' +
    '・画面左タップ：ジャンプ（対応キャラは二段ジャンプ可）。\n' +
    '・画面右タップ：攻撃。右長押し or 右下「必殺」でゲージ100%時に必殺技。\n' +
    '・キーボード：Space/↑＝ジャンプ、Z/X＝攻撃、C＝必殺技。\n\n' +
    '▶ コインとガチャ\n' +
    '・敵撃破やアイテムでコイン獲得。1回10コイン、10連100コイン。\n' +
    '・30連でレジェンド保証 / 100連でミシック保証。\n\n' +
    '▶ コレクション\n' +
    '・引いたキャラは自動登録。重複で限界突破して性能が少しアップ。\n' +
    '・装備したキャラの特性や必殺を活かしてハイスコアを狙おう！\n\n' +
    '▶ Legendaryキャラ\n' +
    '・👑キング：虹レーザー。\n' +
    '・🤖んちゃマシン：んちゃ砲。\n' +
    '▶ Mythicキャラ\n' +
    '・🌈オーロラ：吸引＋一度だけガード。必殺はレインボーレーザー。\n' +
    '・🌀鰯王：二段ジャンプ＋貫通弾。必殺はトルネード攻撃。\n' +
    '・🦛ヤドン：ヤドン砲。'
  );
});

// ====== スポーンと攻撃トリガ ======
function shootIfAuto(t){ /* 予備フック */ }

// ====== ガチャボタン ======
btnGacha.onclick = ()=> doGacha(1);
btnGacha10.onclick = ()=> doGacha(10);

// ====== ストレージ ======
function loadCollection(){
  try{
    const s = localStorage.getItem(STORE_KEY);
    if (s) return JSON.parse(s);
  }catch{}
  return { current:'parfen', owned: { parfen:{owned:true,dup:0,limit:0} } };
}
function saveCollection(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(collection)); }catch{} }
function loadPity(){
  try{ const s = localStorage.getItem(pityKey); if(s) return JSON.parse(s); }catch{}
  return { sinceL:0, sinceM:0 };
}
function savePity(){ try{ localStorage.setItem(pityKey, JSON.stringify(pity)); }catch{} }

function loadBestScore(){
  try{
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    if (raw !== null){
      const value = Number(raw);
      if (Number.isFinite(value)) return Math.max(0, Math.floor(value));
    }
  }catch{}
  return 0;
}

function saveBestScore(){
  try{ localStorage.setItem(BEST_SCORE_KEY, `${bestScore}`); }catch{}
}

function updateBestScore(latestScore){
  const normalized = Math.max(0, Math.floor(Number(latestScore) || 0));
  if (normalized > bestScore){
    bestScore = normalized;
    saveBestScore();
    refreshHUD();
  }
}

// ====== 初期HUD ======
setHUD(GAME_TIME);
updateCharInfo();
loadLeaderboard(false);
})();
