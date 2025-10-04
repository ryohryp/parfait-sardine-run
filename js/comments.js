(() => {
  const root = window;
  root.PSR = root.PSR || {};
  const Utils = root.PSR.Utils || {};
  const Leaderboard = root.PSR.Leaderboard || {};

  const API_BASE = 'https://howasaba-code.com/wp-json/psr/v1';
  const POST_ID = 103;
  const COMMENT_REFRESH_MS = 60_000;
  const CLIENT_KEY = 'psrun_comment_client_id_v1';
  const EMAIL_KEY = 'psrun_player_email_v1';

  const els = {
    button: document.getElementById('commentBtn'),
    overlay: document.getElementById('commentOverlay'),
    close: document.getElementById('commentClose'),
    status: document.getElementById('commentStatus'),
    list: document.getElementById('commentList'),
    more: document.getElementById('commentMore'),
    form: document.getElementById('commentForm'),
    name: document.getElementById('commentName'),
    email: document.getElementById('commentEmail'),
    message: document.getElementById('commentMessage'),
    submit: document.getElementById('commentSubmit'),
    resultComment: document.getElementById('resultComment'),
  };

  const state = {
    comments: [],
    page: 1,
    perPage: 20,
    total: 0,
    loading: false,
    lastFetch: 0,
  };

  function clampString(str, limit) {
    const arr = Array.from(str || '');
    if (arr.length <= limit) return arr.join('');
    return arr.slice(0, limit).join('');
  }

  function ensureClientId() {
    if (root.__psrCommentClientId) return root.__psrCommentClientId;
    let stored = '';
    try {
      stored = localStorage.getItem(CLIENT_KEY) || '';
    } catch {
      stored = '';
    }
    if (!stored) {
      const fallback = `psr-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      try {
        const uuid = root.crypto?.randomUUID?.();
        stored = uuid ? `psr-${uuid}` : fallback;
      } catch {
        stored = fallback;
      }
      try { localStorage.setItem(CLIENT_KEY, stored); } catch { }
    }
    root.__psrCommentClientId = stored;
    return stored;
  }

  function setStatus(message) {
    if (!els.status) return;
    if (message) {
      els.status.hidden = false;
      els.status.textContent = message;
    } else {
      els.status.textContent = '';
      els.status.hidden = true;
    }
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[m] || m));
  }

  function normalize(entry) {
    if (!entry) {
      return { id: null, name: 'ゲスト', message: '', date: '-' };
    }
    const id = entry.id ?? entry.comment_id ?? entry.comment_ID ?? entry.commentId ?? null;
    const nameSource = entry.author ?? entry.author_name ?? entry.comment_author ?? entry.name ?? 'ゲスト';
    const messageSource = entry.content?.rendered ?? entry.content ?? entry.comment_content ?? entry.message ?? '';
    const dateSource = entry.date_gmt ?? entry.date ?? entry.comment_date_gmt ?? entry.comment_date ?? entry.createdAt ?? entry.created_at ?? new Date().toISOString();
    const sanitizedName = Utils.sanitizeName?.(nameSource) || clampString(String(nameSource || 'ゲスト'), 40) || 'ゲスト';
    const sanitizedMessage = Utils.sanitizeCommentMessage?.(messageSource, 1000) || clampString(String(messageSource || ''), 1000);
    return {
      id: id ? String(id) : null,
      name: sanitizedName || 'ゲスト',
      message: sanitizedMessage,
      date: dateSource,
    };
  }

  function commentKey(comment) {
    if (comment.id) return `id:${comment.id}`;
    return `msg:${comment.name}|${comment.date}|${comment.message}`;
  }

  function dedupe(list) {
    const seen = new Set();
    const result = [];
    for (const item of list) {
      const key = commentKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
    return result;
  }

  function buildListHTML(comments) {
    if (!comments.length) return '';
    return comments.map((comment) => `
      <li class="commentItem"${comment.id ? ` data-id="${esc(comment.id)}"` : ''}>
        <div class="commentItemHeader">
          <span class="commentItemName">${esc(comment.name || 'ゲスト')}</span>
          <div class="commentItemMeta">
            <span class="commentItemDate">${esc(new Date(comment.date).toLocaleString())}</span>
          </div>
        </div>
        <p class="commentItemMessage">${esc(comment.message || '')}</p>
      </li>
    `).join('');
  }

  function renderList() {
    if (!els.list) return;
    if (!state.comments.length) {
      els.list.innerHTML = '';
      return;
    }
    els.list.innerHTML = buildListHTML(state.comments);
  }

  function updateMoreVisibility() {
    if (!els.more) return;
    const shown = state.page * state.perPage < state.total;
    els.more.hidden = !shown;
  }

  function requestUrl(page) {
    const url = new URL(`${API_BASE}/comments`);
    url.searchParams.set('post_id', String(POST_ID));
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(state.perPage));
    url.searchParams.set('order', 'desc');
    url.searchParams.set('fingerprint', ensureClientId());
    url.searchParams.set('_', Date.now().toString());
    return url.toString();
  }

  function extractCollection(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    const keys = ['comments', 'items', 'data', 'results'];
    for (const key of keys) {
      const value = payload[key];
      if (Array.isArray(value)) return value;
    }
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    return [];
  }

  async function fetchComments(nextPage = 1, { append = false, force = false, showLoading = false } = {}) {
    if (!els.list || state.loading) return;
    const shouldSkip = !force && !append && nextPage === 1 && state.lastFetch && (Date.now() - state.lastFetch) < COMMENT_REFRESH_MS;
    if (shouldSkip) {
      renderList();
      updateMoreVisibility();
      if (!state.comments.length) {
        setStatus('まだコメントはありません。');
      } else {
        setStatus('');
      }
      return;
    }

    state.loading = true;
    if (showLoading) {
      setStatus('読み込み中…');
    }
    if (!append) {
      els.list.innerHTML = '';
    }

    try {
      const res = await fetch(requestUrl(nextPage), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-PSR-Client': ensureClientId(),
        },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let payload = null;
      try {
        payload = await res.json();
      } catch {
        payload = [];
      }
      const rows = extractCollection(payload).map(normalize).filter((row) => row.message);
      if (append) {
        state.comments = dedupe(state.comments.concat(rows));
      } else {
        state.comments = dedupe(rows);
      }
      const pageValue = Number(payload?.page ?? nextPage);
      state.page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : nextPage;
      const perPageValue = Number(payload?.per_page ?? state.perPage);
      state.perPage = Number.isFinite(perPageValue) && perPageValue > 0 ? perPageValue : state.perPage;
      const derivedTotal = payload?.total ?? payload?.total_items ?? (append ? state.comments.length : rows.length);
      const normalizedTotal = typeof derivedTotal === 'number' ? derivedTotal : Number(derivedTotal || 0);
      state.total = Number.isFinite(normalizedTotal) && normalizedTotal > 0 ? normalizedTotal : state.comments.length;
      state.lastFetch = Date.now();

      renderList();
      if (!state.comments.length) {
        setStatus('まだコメントはありません。');
      } else {
        setStatus('');
      }
      updateMoreVisibility();
    } catch (err) {
      console.error('Failed to load comments', err);
      if (!append) {
        state.comments = [];
        renderList();
      }
      setStatus('読み込みに失敗しました。');
      if (els.more) els.more.hidden = true;
    } finally {
      state.loading = false;
    }
  }

  function buildPostPayload(name, message, email) {
    const payload = {
      author_name: name,
      content: message,
      post_id: POST_ID,
      fingerprint: ensureClientId(),
    };
    if (email) {
      payload.author_email = email;
    }
    return payload;
  }

  function validateInput(value, min, max) {
    const trimmed = (value || '').trim();
    const length = Array.from(trimmed).length;
    if (length < min || length > max) return false;
    return true;
  }

  async function submitComment(ev) {
    ev.preventDefault();
    if (!els.form || !els.status) return;

    const rawName = els.name?.value ?? '';
    const sanitizedName = Utils.sanitizeName?.(rawName) || clampString(rawName, 40) || 'ゲスト';
    if (!validateInput(sanitizedName, 1, 40)) {
      setStatus('名前は1〜40文字で入力してください。');
      els.name?.focus();
      return;
    }

    const rawMessage = els.message?.value ?? '';
    const sanitizedMessage = Utils.sanitizeCommentMessage?.(rawMessage, 1000) || clampString(rawMessage, 1000).trim();
    if (!validateInput(sanitizedMessage, 1, 1000)) {
      setStatus('コメントは1〜1000文字で入力してください。');
      els.message?.focus();
      return;
    }

    let email = '';
    if (els.email && els.email.value) {
      email = clampString(els.email.value.trim(), 254);
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        setStatus('メールアドレスの形式が正しくありません。');
        els.email.focus();
        return;
      }
    }

    if (els.submit) {
      els.submit.disabled = true;
    }
    setStatus('送信中…');

    try {
      const res = await fetch(`${API_BASE}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json',
          'X-PSR-Client': ensureClientId(),
        },
        body: JSON.stringify(buildPostPayload(sanitizedName, sanitizedMessage, email)),
      });
      if (!res.ok) {
        let detail = null;
        try { detail = await res.json(); } catch { }
        const code = detail?.code || detail?.data?.code || '';
        const status = detail?.data?.status || res.status;
        let message = '';
        if (status === 429 || code === 'rate_limited') {
          message = '短時間に多数の送信が行われたため、しばらく時間をおいて再度お試しください。';
        } else if (status === 403 || code === 'origin_not_allowed') {
          message = 'この環境からはコメントを送信できません。';
        } else if (status === 400) {
          if (code === 'bad_author_name') message = '名前は1〜40文字で入力してください。';
          else if (code === 'bad_content_length') message = 'コメントは1〜1000文字で入力してください。';
          else if (code === 'bad_email') message = 'メールアドレスの形式が正しくありません。';
          else message = typeof detail?.message === 'string' ? detail.message : '';
        } else if (status >= 500) {
          message = 'サーバーエラーが発生しました。時間をおいて再度お試しください。';
        }
        throw new Error(message || `HTTP ${res.status}`);
      }

      let created = null;
      try { created = normalize(await res.json()); }
      catch { created = normalize({ name: sanitizedName, content: sanitizedMessage, date: new Date().toISOString() }); }

      state.comments = dedupe([created, ...state.comments]);
      state.total = Math.max(state.total + 1, state.comments.length);
      state.page = 1;
      renderList();
      setStatus('コメントを送信しました。ありがとう！');
      if (els.message) els.message.value = '';
      Leaderboard.savePlayerName?.(sanitizedName);
      try {
        if (email) {
          localStorage.setItem(EMAIL_KEY, email);
        } else {
          localStorage.removeItem(EMAIL_KEY);
        }
      } catch { }
      updateMoreVisibility();
    } catch (err) {
      console.error('Failed to submit comment', err);
      setStatus(err?.message || 'コメントの送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      if (els.submit) {
        els.submit.disabled = false;
      }
    }
  }

  function showOverlay() {
    if (!els.overlay) return;
    const UI = root.PSR?.UI;
    if (UI?.openOverlay) {
      UI.openOverlay(els.overlay);
    } else {
      els.overlay.hidden = false;
      els.overlay.classList.add('show');
      document.body?.classList?.add('modal-open');
    }

    if (els.name && !els.name.value) {
      const storedName = Utils.sanitizeName?.(Leaderboard.loadPlayerName?.() || Leaderboard.DEFAULT_PLAYER_NAME || 'ゲスト');
      if (storedName) els.name.value = storedName;
    }
    if (els.email && !els.email.value) {
      try {
        const storedEmail = localStorage.getItem(EMAIL_KEY) || '';
        if (storedEmail) els.email.value = storedEmail;
      } catch { }
    }

    try { els.message?.focus({ preventScroll: true }); }
    catch { els.message?.focus(); }

    const now = Date.now();
    if (!state.lastFetch || (now - state.lastFetch) > COMMENT_REFRESH_MS) {
      fetchComments(1, { append: false, force: true, showLoading: true });
    }
  }

  function hideOverlay() {
    if (!els.overlay) return;
    const UI = root.PSR?.UI;
    if (UI?.closeOverlay) {
      UI.closeOverlay(els.overlay);
    } else {
      els.overlay.hidden = true;
      els.overlay.classList.remove('show');
      if (!document.querySelector('.overlay:not([hidden])')) {
        document.body?.classList?.remove('modal-open');
      }
    }
  }

  function onBackgroundClick(ev) {
    if (ev.target === els.overlay) {
      hideOverlay();
    }
  }

  function onMoreClick() {
    if (state.loading) return;
    fetchComments(state.page + 1, { append: true, force: true, showLoading: true });
  }

  let initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;

    if (els.button) {
      els.button.addEventListener('click', showOverlay);
    }
    if (els.resultComment) {
      els.resultComment.addEventListener('click', showOverlay);
    }
    if (els.close) {
      els.close.addEventListener('click', hideOverlay);
    }
    if (els.overlay) {
      els.overlay.addEventListener('click', onBackgroundClick);
    }
    if (els.form) {
      els.form.addEventListener('submit', submitComment);
    }
    if (els.more) {
      els.more.addEventListener('click', onMoreClick);
    }

    fetchComments(1, { append: false, force: true, showLoading: false });
  }

  root.PSR.Comments = {
    init,
    open: showOverlay,
    close: hideOverlay,
    reload: () => fetchComments(1, { append: false, force: true, showLoading: true }),
  };
})();
