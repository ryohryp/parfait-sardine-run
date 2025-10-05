// js/comments.js — self-contained & safe (overlay focus fix)

(() => {
  'use strict';

  const root = window;

  // ---- Config ----
  const API_DEFAULT = 'https://howasaba-code.com/wp-json/psr/v1';
  const POST_ID = Number(root.PSR?.COMMENT_POST_ID || 103);
  const CLIENT_HEADER = 'X-PSR-Client';
  const CLIENT_KEY = 'psrun_comment_client_id_v1';
  const EMAIL_KEY  = 'psrun_player_email_v1';
  const COMMENT_REFRESH_MS = 60_000;

  // ---- Utils ----
  const Utils = (() => {
    const safe = {
      sanitizeName: (s) => String(s ?? '').slice(0, 40),
      sanitizeCommentMessage: (s, max = 1000) =>
        String(s ?? '').replace(/\r\n?/g, '\n').slice(0, max),
      graphemeLength: (s) => String(s ?? '').length,
      clampGraphemes: (s, n) => String(s ?? '').slice(0, n),
    };
    return Object.assign(safe, root.PSR?.Utils || {});
  })();
  const Leaderboard = root.PSR?.Leaderboard || {};

  // ---- DOM ----
  const els = {
    button:        document.getElementById('commentBtn'),
    overlay:       document.getElementById('commentOverlay'),
    close:         document.getElementById('commentClose'),
    status:        document.getElementById('commentStatus'),
    list:          document.getElementById('commentList'),
    more:          document.getElementById('commentMore'),
    form:          document.getElementById('commentForm'),
    name:          document.getElementById('commentName'),
    email:         document.getElementById('commentEmail'),
    message:       document.getElementById('commentMessage'),
    submit:        document.getElementById('commentSubmit'),
    resultComment: document.getElementById('resultComment'),
  };

  // ---- State ----
  const state = {
    comments: [],
    page: 1,
    perPage: 20,
    total: 0,
    loading: false,
    lastFetch: 0,
  };
  const pendingLikeIds = new Set();

  // ---- Helpers ----
  const setStatus = (text) => {
    if (!els.status) return;
    if (text) {
      els.status.textContent = text;
      els.status.style.display = 'block';
    } else {
      els.status.textContent = '';
      els.status.style.display = 'none';
    }
  };

  const closest = (node, sel) => {
    let el = node && (node.nodeType === 1 ? node : node.parentElement);
    while (el) {
      if (el.matches && el.matches(sel)) return el;
      el = el.parentElement;
    }
    return null;
  };

  const ensureClientId = () => {
    if (root.__psrCommentClientId) return root.__psrCommentClientId;
    let stored = '';
    try { stored = localStorage.getItem(CLIENT_KEY) || ''; } catch {}
    if (!stored) {
      const fallback = `psr-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      try {
        const uuid = root.crypto?.randomUUID?.();
        stored = uuid ? `psr-${uuid}` : fallback;
      } catch { stored = fallback; }
      try { localStorage.setItem(CLIENT_KEY, stored); } catch {}
    }
    root.__psrCommentClientId = stored;
    return stored;
  };

  const apiBase = () => {
    let base = root.PSRUN_COMMENT_API_BASE ?? root.PSRUN_API_BASE ?? API_DEFAULT;
    base = String(base || '').trim();
    base = base
      .replace(/\/(comments?|comment|like)(\?.*)?$/i, '')
      .replace(/\/leaderboard(\?.*)?$/i, '')
      .replace(/\/$/, '');
    if (/\/wp-json\/psrun\/v2/i.test(base)) {
      base = base.replace(/\/wp-json\/psrun\/v2.*/i, '/wp-json/psr/v1');
    }
    return base || API_DEFAULT;
  };
  const listUrl  = (page, perPage) => `${apiBase()}/comments?${new URLSearchParams({
    post_id: String(POST_ID),
    page: String(page),
    per_page: String(perPage),
    _: String(Date.now()),
  }).toString()}`;
  const postUrl  = () => `${apiBase()}/comment`;
  const likeUrl  = () => `${apiBase()}/like`;

  const extractCommentId = (entry) => {
    const cands = [entry?.comment_id, entry?.commentId, entry?.id, entry?.ID, entry?.commentid];
    for (const cand of cands) {
      if (cand === undefined || cand === null) continue;
      if (typeof cand === 'number' && Number.isFinite(cand)) return String(Math.trunc(cand));
      const str = String(cand).trim();
      if (str && /^\d+$/.test(str)) return String(Number(str));
    }
    return null;
  };
  const normalizeLikeCount = (v) => {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.round(v));
    const n = Number(String(v).trim().replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  };
  const normalizeLiked = (v) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v > 0;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      return s === '1' || s === 'true' || s === 'yes' || s === 'liked';
    }
    return false;
  };

  const normalizeEntry = (entry) => {
    const id = extractCommentId(entry);
    const likeRaw =
      entry?.like_count ??
      entry?.likes ??
      entry?.likeCount ??
      entry?.meta?.psr_like_count ??
      entry?.meta?.like_count;
    const likedRaw = entry?.liked ?? entry?.has_liked ?? entry?.is_liked ?? entry?.meta?.liked;
    const msgSource =
      entry?.content ??
      entry?.message ??
      entry?.comment ??
      entry?.body ??
      (typeof entry?.content?.rendered === 'string' ? entry.content.rendered : '');
    const nameSource =
      entry?.author_name ?? entry?.author ?? entry?.name ?? entry?.user ?? entry?.title ?? '匿名';

    return {
      id: id || null,
      name: Utils.sanitizeName(nameSource) || '匿名',
      message: Utils.sanitizeCommentMessage(msgSource, 1000),
      date:
        entry?.date_gmt ??
        entry?.date ??
        entry?.createdAt ??
        entry?.created_at ??
        entry?.updatedAt ??
        entry?.updated_at ??
        entry?.time ??
        '-',
      likeCount: normalizeLikeCount(likeRaw),
      liked: normalizeLiked(likedRaw),
    };
  };

  // ---- Render ----
  const renderList = () => {
    const list = els.list;
    if (!list) return;
    list.innerHTML = '';

    if (!state.comments.length) {
      const li = document.createElement('li');
      li.className = 'commentItem commentItemEmpty';
      li.textContent = 'まだコメントがありません。';
      list.appendChild(li);
      if (els.more) els.more.style.display = 'none';
      return;
    }

    state.comments.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'commentItem';
      if (item.id) li.dataset.commentId = item.id;

      const header = document.createElement('div');
      header.className = 'commentItemHeader';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'commentItemName';
      nameSpan.textContent = item.name || '匿名';

      const meta = document.createElement('div');
      meta.className = 'commentItemMeta';

      const dateSpan = document.createElement('span');
      dateSpan.className = 'commentItemDate';
      dateSpan.textContent = item.date || '-';
      meta.appendChild(dateSpan);

      if (item.id) {
        const likeBtn = document.createElement('button');
        likeBtn.type = 'button';
        likeBtn.className = 'commentLikeBtn';
        likeBtn.dataset.commentId = item.id;
        likeBtn.disabled = pendingLikeIds.has(item.id);
        likeBtn.setAttribute('aria-pressed', item.liked ? 'true' : 'false');
        if (item.liked) likeBtn.classList.add('isLiked');

        const iconSpan = document.createElement('span');
        iconSpan.className = 'commentLikeIcon';
        iconSpan.textContent = item.liked ? '❤' : '♡';
        likeBtn.appendChild(iconSpan);

        const countSpan = document.createElement('span');
        countSpan.className = 'commentLikeCount';
        countSpan.textContent = String(item.likeCount);
        likeBtn.appendChild(countSpan);

        likeBtn.setAttribute(
          'aria-label',
          item.liked ? `いいねを取り消す（${item.likeCount}）` : `いいね（${item.likeCount}）`,
        );
        meta.appendChild(likeBtn);
      }

      header.appendChild(nameSpan);
      header.appendChild(meta);

      const message = document.createElement('p');
      message.className = 'commentItemMessage';
      message.textContent = item.message || '…';

      li.appendChild(header);
      li.appendChild(message);
      list.appendChild(li);
    });

    if (els.more) {
      const loaded = state.page * state.perPage;
      els.more.style.display = state.total > loaded ? 'block' : 'none';
    }
  };

  // ---- Net ----
  const fetchComments = async (page = 1, { append = false, force = false, showLoading = false } = {}) => {
    if (state.loading) return;
    const now = Date.now();
    if (!force && state.lastFetch && now - state.lastFetch < 1200) return;

    state.loading = true;
    if (showLoading) setStatus('コメントを読み込み中…');
    try {
      const headers = { Accept: 'application/json' };
      const clientId = ensureClientId();
      if (clientId) headers[CLIENT_HEADER] = clientId;

      const res = await fetch(listUrl(page, state.perPage), { method: 'GET', headers, cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const raw = await res.json().catch(() => ([]));
      const items = Array.isArray(raw?.items) ? raw.items
                  : Array.isArray(raw)      ? raw
                  : Array.isArray(raw?.data) ? raw.data
                  : [];
      const normalized = items.map(normalizeEntry).filter((e) => e.message.length > 0);

      state.comments = append ? state.comments.concat(normalized) : normalized;

      const total =
        Number(res.headers.get('X-WP-Total')) ||
        Number(raw?.total) ||
        (append ? Math.max(state.total, state.comments.length) : state.comments.length);
      state.total = Number.isFinite(total) ? total : state.comments.length;

      state.page = page;
      state.lastFetch = now;

      renderList();
      setStatus('');
    } catch (err) {
      console.error('[Comments] load failed:', err);
      setStatus('コメントを取得できませんでした。');
    } finally {
      state.loading = false;
    }
  };

  const toggleLike = async (commentId) => {
    if (!commentId) return;
    const entry = state.comments.find((x) => x.id === commentId);
    const currentLiked = entry ? !!entry.liked : false;

    pendingLikeIds.add(commentId);
    renderList();

    try {
      const payload = {
        comment_id: Number(commentId),
        client_id: ensureClientId(),
        op: currentLiked ? 'unlike' : 'like',
      };
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      };
      if (payload.client_id) headers[CLIENT_HEADER] = payload.client_id;

      const res = await fetch(likeUrl(), { method: 'POST', headers, body: JSON.stringify(payload) });
      const detail = await res.json().catch(() => null);
      if (!res.ok) {
        const code = (detail?.code || detail?.data?.code || '').toString();
        let msg = '';
        if (res.status === 429 || code === 'rate_limited') msg = 'いいねの回数が多すぎます。少し時間をおいて再度お試しください。';
        else if (res.status === 403 || code === 'origin_not_allowed') msg = 'この環境からはいいねできません。';
        else if (res.status === 400 || code === 'bad_comment_id') msg = 'このコメントにはいいねできません。';
        else if (res.status >= 500) msg = 'サーバーエラーが発生しました。時間をおいて再度お試しください。';
        throw new Error(msg || (detail?.message || `HTTP ${res.status}`));
      }

      const liked = normalizeLiked(detail?.liked ?? detail?.is_liked ?? detail?.has_liked ?? (!currentLiked));
      let likeCount = normalizeLikeCount(detail?.like_count ?? detail?.likes ?? detail?.count);
      if (!Number.isFinite(likeCount) || likeCount < 0) {
        const base = entry ? normalizeLikeCount(entry.likeCount) : 0;
        likeCount = Math.max(0, base + (liked === currentLiked ? 0 : liked ? 1 : -1));
      }
      state.comments = state.comments.map((c) =>
        c.id === commentId ? { ...c, liked, likeCount } : c,
      );
      renderList();
    } catch (err) {
      console.error('[Comments] like failed:', err);
      setStatus(err?.message || 'いいねに失敗しました。');
    } finally {
      pendingLikeIds.delete(commentId);
    }
  };

  const submitComment = async (ev) => {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    if (!els.message || !els.submit) return;

    const rawName = els.name?.value ?? '';
    const name = Utils.sanitizeName(rawName) || Leaderboard.DEFAULT_PLAYER_NAME || 'ゲスト';
    const nlen = Utils.graphemeLength(name);
    if (nlen < 1 || nlen > 40) {
      setStatus('名前は1〜40文字で入力してください。');
      els.name?.focus();
      return;
    }

    const message = Utils.sanitizeCommentMessage(els.message.value, 1000);
    if (!message) {
      setStatus('コメントは1〜1000文字で入力してください。');
      els.message.focus();
      return;
    }

    let email = '';
    if (els.email) {
      const rawEmail = (els.email.value || '').trim();
      if (rawEmail) {
        const trimmed = Utils.clampGraphemes(rawEmail, 254);
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(trimmed)) {
          setStatus('メールアドレスの形式が正しくありません。');
          els.email.focus();
          return;
        }
        email = trimmed;
      }
    }

    els.submit.disabled = true;
    setStatus('送信中…');
    try {
      const payload = {
        author_name: name,
        content: message,
        author_email: email,
        post_id: POST_ID,
      };
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      };
      const clientId = ensureClientId();
      if (clientId) headers[CLIENT_HEADER] = clientId;

      const res = await fetch(postUrl(), { method: 'POST', headers, body: JSON.stringify(payload) });
      const detail = await res.json().catch(() => null);
      if (!res.ok) {
        const code = (detail?.code || detail?.data?.code || '').toString();
        const status = detail?.data?.status || res.status;
        let msg = '';
        if (status === 429 || code === 'rate_limited') msg = '短時間に多数の送信が行われたため、しばらく時間をおいて再度お試しください。';
        else if (status === 403 || code === 'origin_not_allowed') msg = 'この環境からはコメントを送信できません。';
        else if (status === 400) {
          if (code === 'bad_author_name') msg = '名前は1〜40文字で入力してください。';
          else if (code === 'bad_content_length') msg = 'コメントは1〜1000文字で入力してください。';
          else if (code === 'bad_email') msg = 'メールアドレスの形式が正しくありません。';
          else msg = detail?.message || '';
        } else if (status >= 500) msg = 'サーバーエラーが発生しました。時間をおいて再度お試しください。';
        throw new Error(msg || `HTTP ${res.status}`);
      }

      setStatus('コメントを送信しました。承認後に公開されます。ありがとう！');
      els.message.value = '';
      try { Leaderboard.savePlayerName?.(name); } catch {}
      try {
        if (email) localStorage.setItem(EMAIL_KEY, email);
        else localStorage.removeItem(EMAIL_KEY);
      } catch {}
      fetchComments(1, { append: false, force: true, showLoading: false });
    } catch (err) {
      console.error('[Comments] submit failed:', err);
      setStatus(err?.message || 'コメントの送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      els.submit.disabled = false;
    }
  };

  // ---- Overlay control (bring-to-front & exclusive open) ----
  const closeOtherOverlays = (exceptEl) => {
    document.querySelectorAll('.overlay').forEach((ov) => {
      if (ov === exceptEl) return;
      if (ov.hidden === false || ov.classList.contains('show')) {
        // use UI if available for consistent body class handling
        const UI = root.PSR?.UI;
        if (UI?.closeOverlay) UI.closeOverlay(ov);
        else {
          ov.hidden = true;
          ov.classList.remove('show');
        }
      }
    });
  };
  const bringToFront = (el) => {
    try {
      if (el && el.parentNode === document.body) {
        document.body.appendChild(el); // move to the end of <body> => top by stacking context
      }
    } catch {}
  };

  const showOverlay = () => {
    if (!els.overlay) return;

    // 1) 他のオーバーレイを閉じる（ランキング等の被り防止）
    closeOtherOverlays(els.overlay);

    // 2) 最前面へ
    bringToFront(els.overlay);

    // 3) 開く
    const UI = root.PSR?.UI;
    if (UI?.openOverlay) UI.openOverlay(els.overlay);
    else {
      els.overlay.hidden = false;
      els.overlay.classList.add('show');
      document.body?.classList?.add('modal-open');
    }

    // 入力初期化
    if (els.name && !els.name.value) {
      const stored = Utils.sanitizeName(
        Leaderboard.loadPlayerName?.() || Leaderboard.DEFAULT_PLAYER_NAME || 'ゲスト',
      );
      if (stored) els.name.value = stored;
    }
    if (els.email && !els.email.value) {
      try {
        const saved = localStorage.getItem(EMAIL_KEY) || '';
        if (saved) els.email.value = saved;
      } catch {}
    }
    try { els.message?.focus({ preventScroll: true }); } catch { els.message?.focus(); }

    const now = Date.now();
    if (!state.lastFetch || now - state.lastFetch > COMMENT_REFRESH_MS) {
      fetchComments(1, { append: false, force: true, showLoading: true });
    }
  };

  const hideOverlay = () => {
    if (!els.overlay) return;
    const UI = root.PSR?.UI;
    if (UI?.closeOverlay) UI.closeOverlay(els.overlay);
    else {
      els.overlay.hidden = true;
      els.overlay.classList.remove('show');
      if (!document.querySelector('.overlay:not([hidden])')) {
        document.body?.classList?.remove('modal-open');
      }
    }
  };

  const onBackgroundClick = (ev) => { if (ev.target === els.overlay) hideOverlay(); };
  const onListClick = (ev) => {
    const btn = closest(ev.target, 'button.commentLikeBtn');
    if (!btn) return;
    const cid = btn.dataset.commentId;
    if (!cid || pendingLikeIds.has(cid)) return;
    ev.preventDefault();
    ev.stopPropagation();
    toggleLike(cid);
  };
  const onMoreClick = () => {
    if (state.loading) return;
    fetchComments(state.page + 1, { append: true, force: true, showLoading: true });
  };

  // ---- Init ----
  let initialized = false;
  const init = () => {
    if (initialized) return;
    initialized = true;

    // クリック競合を防ぐために常に preventDefault + stopPropagation
    const safeOpen = (e) => { e?.preventDefault?.(); e?.stopPropagation?.(); showOverlay(); };

    els.button?.addEventListener('click', safeOpen);
    els.resultComment?.addEventListener('click', safeOpen);
    els.close?.addEventListener('click', (e) => { e?.preventDefault?.(); hideOverlay(); });
    els.overlay?.addEventListener('click', onBackgroundClick);
    els.form?.addEventListener('submit', submitComment);
    els.list?.addEventListener('click', onListClick);
    els.more?.addEventListener('click', onMoreClick);

    // 初期読み込み（UIが無くてもOK）
    fetchComments(1, { append: false, force: true, showLoading: false });
  };

  // ---- Public API ----
  root.PSR = root.PSR || {};
  root.PSR.Comments = {
    init,
    open: showOverlay,
    close: hideOverlay,
    reload: () => fetchComments(1, { append: false, force: true, showLoading: true }),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    try { init(); } catch (e) { console.error(e); }
  }
})();
