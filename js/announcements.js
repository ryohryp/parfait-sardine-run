(function(){
  window.PSR = window.PSR || {};

  const elements = {
    overlay: document.getElementById('announcementOverlay'),
    button: document.getElementById('announcementBtn'),
    close: document.getElementById('announcementClose'),
    list: document.getElementById('announcementList'),
    status: document.getElementById('announcementStatus')
  };

  const triggers = Array.from(document.querySelectorAll('[data-target="#announcementOverlay"], [data-target="announcementOverlay"]'));

  const CACHE_KEY = 'psrun_announcements_cache_v1';
  const FETCH_URL = 'announcements.json';

  const state = {
    fetchedAt: null,
    entries: [],
    loading: false,
    initialised: false
  };

  function formatDateLabel(value, withTime){
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())){
      return String(value);
    }
    const options = withTime
      ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Intl.DateTimeFormat('ja-JP', options).format(date);
  }

  function readCache(){
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (!Array.isArray(parsed.entries)) return null;
      return {
        entries: parsed.entries,
        fetchedAt: parsed.fetchedAt || null
      };
    } catch {
      return null;
    }
  }

  function writeCache(data){
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        entries: data.entries || [],
        fetchedAt: data.fetchedAt || null
      }));
    } catch {
      // ignore
    }
  }

  function setStatus(message, variant){
    if (!elements.status) return;
    elements.status.textContent = message || '';
    if (message){
      elements.status.removeAttribute('hidden');
    } else {
      elements.status.setAttribute('hidden', 'hidden');
    }
    if (variant){
      elements.status.dataset.variant = variant;
    } else {
      elements.status.removeAttribute('data-variant');
    }
  }

  function clearList(){
    if (!elements.list) return;
    elements.list.innerHTML = '';
  }

  function renderEntries(entries){
    if (!elements.list) return;
    clearList();
    if (!Array.isArray(entries) || !entries.length){
      const empty = document.createElement('li');
      empty.className = 'announcementEmpty';
      empty.textContent = '表示できるお知らせがありません。';
      elements.list.appendChild(empty);
      return;
    }

    entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'announcementItem';

      const header = document.createElement('div');
      header.className = 'announcementItemHeader';

      const version = document.createElement('span');
      version.className = 'announcementVersion';
      version.textContent = entry.version ? `バージョン ${entry.version}` : 'バージョン情報';
      header.appendChild(version);

      if (entry.date){
        const date = document.createElement('span');
        date.className = 'announcementDate';
        date.textContent = formatDateLabel(entry.date, false);
        header.appendChild(date);
      }

      item.appendChild(header);

      if (Array.isArray(entry.notes) && entry.notes.length){
        const notes = document.createElement('ul');
        notes.className = 'announcementNotes';
        entry.notes.forEach(note => {
          const noteItem = document.createElement('li');
          noteItem.textContent = String(note);
          notes.appendChild(noteItem);
        });
        item.appendChild(notes);
      } else if (entry.summary){
        const summary = document.createElement('p');
        summary.className = 'announcementSummary';
        summary.textContent = String(entry.summary);
        item.appendChild(summary);
      }

      elements.list.appendChild(item);
    });
  }

  async function loadAnnouncements(){
    if (state.loading) return;
    state.loading = true;
    setStatus('お知らせを読み込み中…', 'loading');

    try {
      const response = await fetch(FETCH_URL, { cache: 'no-store' });
      if (!response.ok){
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const entries = Array.isArray(data?.entries) ? data.entries : [];
      state.entries = entries;
      state.fetchedAt = Date.now();
      renderEntries(entries);
      setStatus(state.fetchedAt ? `最終更新: ${formatDateLabel(state.fetchedAt, true)}` : '最新のお知らせを表示しています。', 'success');
      writeCache({ entries, fetchedAt: state.fetchedAt });
    } catch (error) {
      console.warn('Failed to load announcements', error);
      const cached = readCache();
      if (cached && Array.isArray(cached.entries) && cached.entries.length){
        state.entries = cached.entries;
        state.fetchedAt = cached.fetchedAt || null;
        renderEntries(state.entries);
        const timeLabel = cached.fetchedAt ? formatDateLabel(cached.fetchedAt, true) : null;
        const suffix = timeLabel ? `（最終更新: ${timeLabel}）` : '';
        setStatus(`最新のお知らせを読み込めませんでした。保存済みの情報を表示しています${suffix}。`, 'warning');
      } else {
        state.entries = [];
        state.fetchedAt = null;
        renderEntries(state.entries);
        setStatus('お知らせを読み込めませんでした。時間をおいて再度お試しください。', 'error');
      }
    } finally {
      state.loading = false;
    }
  }

  function openOverlay(){
    if (!elements.overlay) return;
    elements.overlay.style.display = 'flex';
    if (!state.loading && (!Array.isArray(state.entries) || !state.entries.length)){
      if (typeof fetch === 'function'){
        loadAnnouncements();
      }
    }
  }

  function closeOverlay(){
    if (!elements.overlay) return;
    elements.overlay.style.display = 'none';
  }

  function bindEvents(){
    if (elements.button){
      elements.button.addEventListener('click', () => {
        openOverlay();
      });
    }
    triggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        openOverlay();
      });
    });
    if (elements.close){
      elements.close.addEventListener('click', () => {
        closeOverlay();
      });
    }
    if (elements.overlay){
      elements.overlay.addEventListener('click', (event) => {
        if (event.target === elements.overlay){
          closeOverlay();
        }
      });
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape'){
        closeOverlay();
      }
    });
  }

  function hydrateFromCache(){
    const cached = readCache();
    if (cached && Array.isArray(cached.entries) && cached.entries.length){
      state.entries = cached.entries;
      state.fetchedAt = cached.fetchedAt || null;
      renderEntries(state.entries);
      if (cached.fetchedAt){
        setStatus(`保存済みのお知らせ（最終更新: ${formatDateLabel(cached.fetchedAt, true)}）`, 'cached');
      } else {
        setStatus('保存済みのお知らせを表示しています。', 'cached');
      }
    } else {
      setStatus('', '');
    }
  }

  function init(){
    if (state.initialised) return;
    state.initialised = true;
    bindEvents();
    hydrateFromCache();
    if (typeof fetch === 'function'){
      loadAnnouncements();
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.PSR.Announcements = {
    open: openOverlay,
    close: closeOverlay,
    refresh: loadAnnouncements
  };
})();
