(function(){
  window.PSR = window.PSR || {};

  let elements = {
    button: null,
    overlay: null,
    close: null,
    list: null,
    status: null
  };

  function cacheElements(){
    elements = {
      button: document.getElementById('noticeBtn'),
      overlay: document.getElementById('noticeOverlay'),
      close: document.getElementById('noticeClose'),
      list: document.getElementById('noticeList'),
      status: document.getElementById('noticeStatus')
    };
  }

  function ensureButtonLabel(){
    const { button } = elements;
    if (!button) return;
    const text = (button.textContent || '').trim();
    if (!text){
      button.textContent = 'お知らせ';
    }
  }

  const STORAGE_KEY = 'psrun_notice_last_read_v1';
  const DEFAULT_SOURCE = 'notices.json';
  const FALLBACK_NOTICE = [{
    id: 'welcome-2024',
    title: 'パフェRUNへようこそ！',
    body: 'イベントやメンテナンスのお知らせがここに表示されます。',
    publishedAt: '2024-01-01T00:00:00+09:00'
  }];

  let notices = [];
  let lastRead = loadLastRead();
  let latestTimestamp = 0;
  let loadError = false;

  function sourceUrl(){
    if (typeof window === 'undefined') return DEFAULT_SOURCE;
    const candidate = window.PSRUN_NOTICE_URL ?? window.PSRUN_NOTICE_JSON ?? window.PSRUN_NOTICES_URL;
    if (!candidate) return DEFAULT_SOURCE;
    const trimmed = String(candidate).trim();
    return trimmed || DEFAULT_SOURCE;
  }

  function loadLastRead(){
    if (typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return 0;
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      const ts = parseTimestamp(raw);
      return ts || 0;
    } catch {
      return 0;
    }
  }

  function saveLastRead(value){
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* noop */
    }
  }

  function parseTimestamp(value){
    if (value === undefined || value === null) return null;
    if (value instanceof Date){
      const time = value.getTime();
      return Number.isFinite(time) ? time : null;
    }
    if (typeof value === 'number'){
      if (!Number.isFinite(value)) return null;
      return value > 10_000_000_000 ? value : value * 1000;
    }
    const str = String(value).trim();
    if (!str) return null;
    if (/^-?\d+$/.test(str)){
      const num = Number(str);
      if (!Number.isFinite(num)) return null;
      return str.length >= 13 ? num : num * 1000;
    }
    const replaced = str.includes('-') ? str.replace(/-/g, '/') : str;
    const parsed = Date.parse(replaced);
    if (Number.isNaN(parsed)){
      const fallback = Date.parse(str);
      return Number.isNaN(fallback) ? null : fallback;
    }
    return parsed;
  }

  function formatDate(ts){
    if (!Number.isFinite(ts) || ts <= 0) return '';
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${d} ${hh}:${mm}`;
  }

  function normalize(raw){
    const collection = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.notices)
        ? raw.notices
        : Array.isArray(raw?.items)
          ? raw.items
          : [];

    const result = [];
    collection.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      const title = String(item.title ?? item.heading ?? '').trim();
      const body = String(item.body ?? item.description ?? item.content ?? '').trim();
      const link = String(item.url ?? item.link ?? '').trim();
      const ts = parseTimestamp(
        item.updatedAt ?? item.updated_at ??
        item.publishedAt ?? item.published_at ??
        item.date ?? item.timestamp ?? item.time ?? item.createdAt ?? item.created_at
      );
      let id = null;
      const candidates = [item.id, item.noticeId, item.notice_id, item.slug, item.key];
      for (const candidate of candidates){
        if (candidate === undefined || candidate === null) continue;
        const str = String(candidate).trim();
        if (str){
          id = str;
          break;
        }
      }
      const fallbackTs = Date.now() - index * 60_000;
      result.push({
        id: id || `${fallbackTs}-${index}`,
        title: title || `お知らせ ${index + 1}`,
        body,
        link,
        timestamp: ts || fallbackTs
      });
    });

    result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return result;
  }

  function setStatus(message){
    const { status } = elements;
    if (!status) return;
    if (message){
      status.textContent = message;
      status.style.display = 'block';
    } else {
      status.textContent = '';
      status.style.display = 'none';
    }
  }

  function render(){
    const { list } = elements;
    if (!list) return;
    list.innerHTML = '';

    if (!notices.length){
      const message = loadError
        ? 'お知らせを取得できませんでした。時間をおいて再度お試しください。'
        : '現在表示できるお知らせはありません。';
      setStatus(message);
      return;
    }

    setStatus('');

    notices.forEach(item => {
      const li = document.createElement('li');
      li.className = 'noticeItem';
      li.dataset.noticeId = item.id;

      const header = document.createElement('div');
      header.className = 'noticeItemHeader';

      const title = document.createElement('h3');
      title.className = 'noticeItemTitle';
      title.textContent = item.title;
      header.appendChild(title);

      const date = document.createElement('time');
      date.className = 'noticeItemDate';
      const formatted = formatDate(item.timestamp);
      if (formatted){
        date.textContent = formatted;
        date.dateTime = new Date(item.timestamp).toISOString();
      } else {
        date.textContent = '';
      }
      header.appendChild(date);

      li.appendChild(header);

      if (item.body){
        const body = document.createElement('p');
        body.className = 'noticeItemBody';
        body.textContent = item.body;
        li.appendChild(body);
      }

      if (item.link){
        const link = document.createElement('a');
        link.className = 'noticeItemLink';
        link.href = item.link;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = '詳しく見る';
        li.appendChild(link);
      }

      list.appendChild(li);
    });
  }

  function updateUnreadBadge(){
    const { button } = elements;
    if (!button) return;
    ensureButtonLabel();
    latestTimestamp = notices.reduce((max, item) => Math.max(max, item.timestamp || 0), 0);
    const unread = latestTimestamp > (lastRead || 0);
    if (unread){
      button.dataset.unread = '1';
      button.setAttribute('aria-label', 'お知らせ (新着あり)');
    } else {
      button.removeAttribute('data-unread');
      button.setAttribute('aria-label', 'お知らせ');
    }
  }

  function markAsRead(){
    if (!latestTimestamp) return;
    lastRead = latestTimestamp;
    saveLastRead(latestTimestamp);
    updateUnreadBadge();
  }

  function openOverlay(){
    const { overlay } = elements;
    if (!overlay) return;
    const UI = window.PSR?.UI;
    if (UI?.openOverlay){
      UI.openOverlay(overlay);
    } else {
      overlay.hidden = false;
      overlay.classList.add('show');
      document.body?.classList?.add('modal-open');
    }
    markAsRead();
  }

  function closeOverlay(){
    const { overlay } = elements;
    if (!overlay) return;
    const UI = window.PSR?.UI;
    if (UI?.closeOverlay){
      UI.closeOverlay(overlay);
    } else {
      overlay.hidden = true;
      overlay.classList.remove('show');
      if (!document.querySelector('.overlay:not([hidden])')){
        document.body?.classList?.remove('modal-open');
      }
    }
  }

  async function load(){
    setStatus('最新情報を読み込んでいます…');
    loadError = false;
    try {
      const response = await fetch(sourceUrl(), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      notices = normalize(data);
      if (!notices.length){
        notices = normalize(FALLBACK_NOTICE);
      }
    } catch (err){
      console.warn('Failed to load notices', err);
      loadError = true;
      if (!notices.length){
        notices = normalize(FALLBACK_NOTICE);
      }
    }
    render();
    updateUnreadBadge();
  }

  function init(){
    cacheElements();
    ensureButtonLabel();

    if (!elements.button || !elements.overlay){
      return;
    }

    elements.button.addEventListener('click', openOverlay);
    if (elements.close){
      elements.close.addEventListener('click', closeOverlay);
    }

    updateUnreadBadge();
    load();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.PSR.Notices = {
    reload: load,
    open: openOverlay,
    close: closeOverlay
  };
})();
