(function(){
  const elements = {
    button: document.getElementById('settingsBtn'),
    overlay: document.getElementById('settingsOverlay'),
    close: document.getElementById('settingsClose'),
    name: document.getElementById('settingsPlayerName'),
    rename: document.getElementById('settingsRename')
  };

  function leaderboardModule(){
    return window.PSR?.Leaderboard || null;
  }

  function resolvePlayerName(){
    const lb = leaderboardModule();
    if (!lb) return 'ゲスト';
    if (typeof lb.ensurePlayerName === 'function'){
      try { return lb.ensurePlayerName(); }
      catch { }
    }
    if (typeof lb.loadPlayerName === 'function'){
      const loaded = lb.loadPlayerName();
      if (loaded) return loaded;
    }
    if (typeof lb.DEFAULT_PLAYER_NAME === 'string' && lb.DEFAULT_PLAYER_NAME){
      return lb.DEFAULT_PLAYER_NAME;
    }
    return 'ゲスト';
  }

  function updateNameDisplay(name){
    const target = elements.name;
    const finalName = typeof name === 'string' && name ? name : resolvePlayerName();
    if (target){
      target.textContent = `現在の名前：${finalName}`;
    }
  }

  function openOverlay(){
    if (!elements.overlay) return;
    const UI = window.PSR?.UI;
    if (UI?.openOverlay){
      UI.openOverlay(elements.overlay);
    } else {
      elements.overlay.hidden = false;
      elements.overlay.classList.add('show');
      document.body?.classList?.add('modal-open');
    }
    updateNameDisplay();
  }

  function closeOverlay(){
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

  async function handleRename(){
    const lb = leaderboardModule();
    if (!lb) return;
    if (typeof lb.requestNameChange === 'function'){
      const result = await lb.requestNameChange();
      if (result?.name){
        updateNameDisplay(result.name);
      } else {
        updateNameDisplay();
      }
      return;
    }
    const current = resolvePlayerName();
    const input = prompt('新しい名前を入力してください。（1〜40文字）', current);
    if (input === null) return;
    const sanitized = (window.PSR?.Utils?.sanitizeName?.(input)) || '';
    if (!sanitized){
      alert('名前は1〜40文字で入力してください。');
      return;
    }
    const saved = typeof lb.savePlayerName === 'function'
      ? lb.savePlayerName(sanitized)
      : sanitized;
    updateNameDisplay(saved);
  }

  if (elements.button){
    elements.button.addEventListener('click', openOverlay);
  }
  if (elements.close){
    elements.close.addEventListener('click', closeOverlay);
  }
  if (elements.rename){
    elements.rename.addEventListener('click', handleRename);
  }

  window.addEventListener('psr:playerNameChanged', event => {
    const detailName = event?.detail?.name;
    updateNameDisplay(detailName);
  });

  updateNameDisplay();
})();
