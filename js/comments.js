(function(){
  window.PSR = window.PSR || {};
  const Utils = window.PSR.Utils || {};
  const Leaderboard = window.PSR.Leaderboard || {};

  const elements = {
    button: document.getElementById('commentBtn'),
    overlay: document.getElementById('commentOverlay'),
    close: document.getElementById('commentClose'),
    form: document.getElementById('commentForm'),
    nameInput: document.getElementById('commentName'),
    emailInput: document.getElementById('commentEmail'),
    messageInput: document.getElementById('commentMessage'),
    submit: document.getElementById('commentSubmit'),
    status: document.getElementById('commentStatus'),
    list: document.getElementById('commentList'),
    feedStatus: document.getElementById('commentFeedStatus'),
    feedList: document.getElementById('commentFeedList')
  };

  const COMMENT_POST_ID = 103;
  const COMMENT_API_DEFAULT = 'https://howasaba-code.com/wp-json/psr/v1';
  const COMMENT_REFRESH_MS = 60000;
  const COMMENT_CLIENT_ID_KEY = 'psrun_comment_client_id_v1';
  const COMMENT_CLIENT_HEADER = 'X-PSR-Client';

  let lastFetch = 0;
  let cachedComments = [];
  const pendingLikeIds = new Set();
  let feedStatusTimer = null;

  function ensureClientId(){
    if (typeof window === 'undefined') return '';
    if (!window.__psrunCommentClientId){
      let stored = '';
      try { stored = localStorage.getItem(COMMENT_CLIENT_ID_KEY) || ''; }
      catch { stored = ''; }
      if (!stored){
        const fallback = `psr-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
        try {
          const uuid = window.crypto?.randomUUID?.();
          stored = uuid ? `psr-${uuid}` : fallback;
        } catch {
          stored = fallback;
        }
        try { localStorage.setItem(COMMENT_CLIENT_ID_KEY, stored); }
        catch { }
      }
      window.__psrunCommentClientId = stored;
    }
    return window.__psrunCommentClientId || '';
  }

  function apiBase(){
    let candidate = COMMENT_API_DEFAULT;
    if (typeof window !== 'undefined'){
      const raw = window.PSRUN_COMMENT_API_BASE ?? window.PSRUN_API_BASE;
      if (raw){
        candidate = String(raw).trim();
      }
    }
    if (!candidate) candidate = COMMENT_API_DEFAULT;
    let base = String(candidate).trim();
    if (!base) base = COMMENT_API_DEFAULT;
    base = base
      .replace(/\/(comments?|comment)(\?.*)?$/i, '')
      .replace(/\/leaderboard(\?.*)?$/i, '')
      .replace(/\/$/, '');
    if (/\/wp-json\/psrun\/v2/i.test(base)){
      base = base.replace(/\/wp-json\/psrun\/v2.*/i, '/wp-json/psr/v1');
    }
    return base || COMMENT_API_DEFAULT;
  }

  function listUrl(){
    const params = new URLSearchParams({ post_id: String(COMMENT_POST_ID), page: '1', per_page: '20' });
    return `${apiBase()}/comments?${params.toString()}`;
  }

  function postUrl(){
    return `${apiBase()}/comment`;
  }

  function likeUrl(){
    return `${apiBase()}/like`;
  }

  function extractCommentId(entry){
    const candidates = [entry?.comment_id, entry?.commentId, entry?.id, entry?.ID, entry?.commentid];
    for (const candidate of candidates){
      if (candidate === undefined || candidate === null) continue;
      if (typeof candidate === 'number' && Number.isFinite(candidate)){
        return String(Math.trunc(candidate));
      }
      const str = String(candidate).trim();
      if (str && /^\d+$/.test(str)){
        return String(Number(str));
      }
    }
    return null;
  }

  function normalizeLikeCount(value){
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number' && Number.isFinite(value)){
      return Math.max(0, Math.round(value));
    }
    const num = Number(String(value).trim().replace(/[^0-9.-]/g, ''));
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

  function normalizeCollection(raw){
    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== 'object'){
      if (typeof raw === 'string'){
        try { return normalizeCollection(JSON.parse(raw)); }
        catch { return []; }
      }
      return [];
    }
    const keys = ['comments','items','results','data'];
    for (const key of keys){
      if (Array.isArray(raw[key])) return raw[key];
    }
    if (raw.data && typeof raw.data === 'object'){
      const nested = normalizeCollection(raw.data);
      if (nested.length) return nested;
    }
    return [];
  }

  function renderLists(){
    const targets = [];
    if (elements.list) targets.push({ el: elements.list, empty: 'まだコメントがありません。' });
    if (elements.feedList) targets.push({ el: elements.feedList, empty: 'まだコメントがありません。' });
    targets.forEach(target => {
      if (!target.el) return;
      target.el.innerHTML = '';
      if (!cachedComments.length){
        const li = document.createElement('li');
        li.className = 'commentItem commentItemEmpty';
        li.textContent = target.empty;
        target.el.appendChild(li);
        return;
      }
      cachedComments.forEach(item => {
        const li = document.createElement('li');
        li.className = 'commentItem';
        if (item.id) li.dataset.commentId = item.id;

        const header = document.createElement('div');
        header.className = 'commentItemHeader';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'commentItemName';
        nameSpan.textContent = item.name || '匿名';

        const metaWrap = document.createElement('div');
        metaWrap.className = 'commentItemMeta';

        const dateSpan = document.createElement('span');
        dateSpan.className = 'commentItemDate';
        dateSpan.textContent = item.date || '-';
        metaWrap.appendChild(dateSpan);

        if (item.id){
          const likeBtn = document.createElement('button');
          likeBtn.type = 'button';
          likeBtn.className = 'commentLikeBtn';
          likeBtn.dataset.commentId = item.id;
          likeBtn.disabled = pendingLikeIds.has(item.id);
          if (item.liked){
            likeBtn.classList.add('isLiked');
          }
          likeBtn.setAttribute('aria-pressed', item.liked ? 'true' : 'false');

          const iconSpan = document.createElement('span');
          iconSpan.className = 'commentLikeIcon';
          iconSpan.setAttribute('aria-hidden', 'true');
          iconSpan.textContent = item.liked ? '❤' : '♡';
          likeBtn.appendChild(iconSpan);

          const countSpan = document.createElement('span');
          countSpan.className = 'commentLikeCount';
          countSpan.textContent = String(item.likeCount);
          likeBtn.appendChild(countSpan);

          const ariaLabel = item.liked ? `いいねを取り消す（${item.likeCount}）` : `いいね（${item.likeCount}）`;
          likeBtn.setAttribute('aria-label', ariaLabel);
          metaWrap.appendChild(likeBtn);
        }

        header.appendChild(nameSpan);
        header.appendChild(metaWrap);

        const message = document.createElement('p');
        message.className = 'commentItemMessage';
        message.textContent = item.message || '…';

        li.appendChild(header);
        li.appendChild(message);
        target.el.appendChild(li);
      });
    });
  }

  function updateCached(commentId, patch){
    cachedComments = cachedComments.map(entry => entry.id === commentId ? { ...entry, ...patch } : entry);
  }

  function showError(message){
    const text = message || 'エラーが発生しました。時間をおいて再度お試しください。';
    let shown = false;
    if (elements.overlay && elements.overlay.style.display === 'flex' && elements.status){
      elements.status.textContent = text;
      elements.status.style.display = 'block';
      shown = true;
    }
    if (elements.feedStatus){
      elements.feedStatus.textContent = text;
      elements.feedStatus.style.display = 'block';
      if (feedStatusTimer) clearTimeout(feedStatusTimer);
      feedStatusTimer = setTimeout(() => {
        if (elements.feedStatus.textContent === text){
          elements.feedStatus.style.display = 'none';
          elements.feedStatus.textContent = '';
        }
      }, 4000);
      shown = true;
    }
    if (!shown){
      console.warn(text);
    }
  }

  async function toggleLike(commentId){
    if (!commentId) return;
    const entry = cachedComments.find(item => item.id === commentId) || null;
    const currentLiked = entry ? normalizeLiked(entry.liked) : false;
    pendingLikeIds.add(commentId);
    renderLists();
    try {
      const clientId = ensureClientId();
      const payload = {
        comment_id: Number(commentId),
        client_id: clientId,
        op: currentLiked ? 'unlike' : 'like'
      };
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      };
      if (clientId){
        headers[COMMENT_CLIENT_HEADER] = clientId;
      }
      const res = await fetch(likeUrl(), { method: 'POST', headers, body: JSON.stringify(payload) });
      let detail = null;
      try { detail = await res.json(); }
      catch { detail = null; }
      if (!res.ok){
        const code = (detail?.code || detail?.data?.code || '').toString();
        let friendly = '';
        if (res.status === 429 || code === 'rate_limited'){
          friendly = 'いいねの回数が多すぎます。少し時間をおいて再度お試しください。';
        } else if (res.status === 403 || code === 'origin_not_allowed'){
          friendly = 'この環境からはいいねできません。';
        } else if (res.status === 400 && code === 'bad_comment_id'){
          friendly = 'このコメントにはいいねできません。';
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
      updateCached(commentId, { likeCount, liked });
    } catch (err){
      console.error('Failed to toggle like', err);
      showError(err?.message || 'いいねに失敗しました。時間をおいて再度お試しください。');
    } finally {
      pendingLikeIds.delete(commentId);
      renderLists();
    }
  }

  async function loadComments(showLoading){
    const targets = [];
    if (elements.list) targets.push(elements.list);
    if (elements.feedList) targets.push(elements.feedList);
    if (!targets.length) return;

    if (showLoading && elements.status){
      elements.status.textContent = '最新コメントを読み込み中…';
      elements.status.style.display = 'block';
    }
    if (elements.feedStatus){
      elements.feedStatus.textContent = 'コメントを読み込み中…';
      elements.feedStatus.style.display = 'block';
    }
    targets.forEach(el => { el.innerHTML = ''; });

    try {
      const headers = { 'Accept': 'application/json' };
      const clientId = ensureClientId();
      if (clientId){
        headers[COMMENT_CLIENT_HEADER] = clientId;
      }
      const res = await fetch(listUrl(), { method: 'GET', headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let raw = null;
      try { raw = await res.json(); }
      catch { raw = []; }
      const collection = Array.isArray(raw?.items) ? raw.items : normalizeCollection(raw);
      cachedComments = collection
        .map(entry => {
          const id = extractCommentId(entry);
          const likeRaw = entry?.like_count ?? entry?.likes ?? entry?.likeCount ?? entry?.meta?.psr_like_count ?? entry?.meta?.like_count;
          const likedRaw = entry?.liked ?? entry?.has_liked ?? entry?.is_liked ?? entry?.meta?.liked;
          const messageSource = entry?.content ?? entry?.message ?? entry?.comment ?? entry?.body ?? (typeof entry?.content?.rendered === 'string' ? entry.content.rendered : '');
          const sanitizedMessage = Utils.sanitizeCommentMessage(messageSource, 1000);
          const sanitizedName = Utils.sanitizeName(entry?.author_name ?? entry?.author ?? entry?.name ?? entry?.user ?? entry?.title ?? '匿名') || '匿名';
          return {
            id: id || null,
            name: sanitizedName,
            message: sanitizedMessage,
            date: entry?.date_gmt ?? entry?.date ?? entry?.createdAt ?? entry?.created_at ?? entry?.updatedAt ?? entry?.updated_at ?? entry?.time ?? '-',
            likeCount: normalizeLikeCount(likeRaw),
            liked: normalizeLiked(likedRaw)
          };
        })
        .filter(entry => entry.message.length > 0)
        .slice(0, 30);
      renderLists();
      if (showLoading && elements.status){
        elements.status.style.display = 'none';
        elements.status.textContent = '';
      }
      if (elements.feedStatus){
        elements.feedStatus.style.display = 'none';
        elements.feedStatus.textContent = '';
      }
      lastFetch = Date.now();
    } catch (err){
      console.error('Failed to load comments', err);
      if (showLoading && elements.status){
        elements.status.textContent = 'コメントを取得できませんでした。';
        elements.status.style.display = 'block';
      }
      if (elements.feedStatus){
        elements.feedStatus.textContent = 'コメントを表示できませんでした。';
        elements.feedStatus.style.display = 'block';
      }
    }
  }

  async function submitComment(){
    if (!elements.messageInput || !elements.status || !elements.submit) return;
    const rawName = elements.nameInput?.value ?? '';
    const sanitizedName = Utils.sanitizeName(rawName) || Leaderboard.DEFAULT_PLAYER_NAME || 'プレイヤー';
    const nameLength = Utils.graphemeLength(sanitizedName);
    if (nameLength < 1 || nameLength > 40){
      elements.status.textContent = '名前は1〜40文字で入力してください。';
      elements.status.style.display = 'block';
      elements.nameInput?.focus();
      return;
    }
    const message = Utils.sanitizeCommentMessage(elements.messageInput.value, 1000);
    if (!message){
      elements.status.textContent = 'コメントは1〜1000文字で入力してください。';
      elements.status.style.display = 'block';
      elements.messageInput.focus();
      return;
    }
    let email = '';
    if (elements.emailInput){
      const rawEmail = (elements.emailInput.value || '').trim();
      if (rawEmail){
        const trimmedEmail = Utils.clampGraphemes(rawEmail, 254);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)){
          elements.status.textContent = 'メールアドレスの形式が正しくありません。';
          elements.status.style.display = 'block';
          elements.emailInput.focus();
          return;
        }
        email = trimmedEmail;
      }
    }
    elements.status.textContent = '送信中…';
    elements.status.style.display = 'block';
    elements.submit.disabled = true;
    try {
      const payload = {
        author_name: sanitizedName,
        content: message,
        author_email: email,
        post_id: COMMENT_POST_ID
      };
      const headers = (() => {
        const base = { 'Content-Type': 'application/json; charset=utf-8', 'Accept': 'application/json' };
        const clientId = ensureClientId();
        if (clientId){
          base[COMMENT_CLIENT_HEADER] = clientId;
        }
        return base;
      })();
      const res = await fetch(postUrl(), { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!res.ok){
        let detail = null;
        try { detail = await res.json(); }
        catch { }
        const code = (detail?.code || detail?.data?.code || '').toString();
        const serverMessage = typeof detail?.message === 'string' ? detail.message.trim() : '';
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
      Leaderboard.savePlayerName?.(sanitizedName);
      try {
        if (email){
          localStorage.setItem('psrun_player_email_v1', email);
        } else {
          localStorage.removeItem('psrun_player_email_v1');
        }
      } catch { }
      elements.messageInput.value = '';
      elements.status.textContent = 'コメントを送信しました。承認後に公開されます。ありがとう！';
      elements.status.style.display = 'block';
      loadComments(false);
    } catch (err){
      console.error('Failed to submit comment', err);
      elements.status.textContent = err?.message || 'コメントの送信に失敗しました。時間をおいて再度お試しください。';
      elements.status.style.display = 'block';
    } finally {
      elements.submit.disabled = false;
    }
  }

  function onListClick(ev){
    const button = ev.target.closest?.('button.commentLikeBtn');
    if (!button) return;
    const commentId = button.dataset.commentId;
    if (!commentId || pendingLikeIds.has(commentId)) return;
    ev.preventDefault();
    toggleLike(commentId);
  }

  function showOverlay(){
    if (!elements.overlay) return;
    const UI = window.PSR?.UI;
    if (UI?.openOverlay){
      UI.openOverlay(elements.overlay);
    } else {
      elements.overlay.hidden = false;
      elements.overlay.classList.add('show');
      document.body?.classList?.add('modal-open');
    }
    if (elements.status){
      elements.status.style.display = 'none';
      elements.status.textContent = '';
    }
    if (elements.nameInput){
      const stored = Utils.sanitizeName(Leaderboard.loadPlayerName?.() || Leaderboard.DEFAULT_PLAYER_NAME || 'プレイヤー');
      if (stored && !elements.nameInput.value){
        elements.nameInput.value = stored;
      }
    }
    if (elements.emailInput){
      const storedEmail = (() => {
        try { return localStorage.getItem('psrun_player_email_v1') || ''; }
        catch { return ''; }
      })();
      if (storedEmail && !elements.emailInput.value){
        elements.emailInput.value = storedEmail;
      }
    }
    if (elements.messageInput){
      try { elements.messageInput.focus({ preventScroll: true }); }
      catch { elements.messageInput.focus(); }
    }
    const now = Date.now();
    if (!lastFetch || (now - lastFetch) > COMMENT_REFRESH_MS){
      loadComments(true);
    }
  }

  function hideOverlay(){
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

  function init(){
    if (elements.button){
      elements.button.onclick = () => showOverlay();
    }
    if (elements.close){
      elements.close.onclick = () => hideOverlay();
    }
    if (elements.overlay){
      elements.overlay.addEventListener('click', ev => {
        if (ev.target === elements.overlay){
          hideOverlay();
        }
      });
    }
    if (elements.form){
      elements.form.addEventListener('submit', ev => {
        ev.preventDefault();
        submitComment();
      });
    }
    if (elements.list){
      elements.list.addEventListener('click', onListClick);
    }
    if (elements.feedList){
      elements.feedList.addEventListener('click', onListClick);
    }
    loadComments(true);
  }

  window.PSR.Comments = {
    init,
    open: showOverlay,
    close: hideOverlay,
    reload: () => loadComments(true)
  };
})();
