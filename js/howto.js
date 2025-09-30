(function(){
  window.PSR = window.PSR || {};

  const elements = {
    button: document.getElementById('howto'),
    overlay: document.getElementById('howOverlay'),
    close: document.getElementById('howClose'),
    start: document.getElementById('howStart'),
    lead: document.getElementById('howLead'),
    list: document.getElementById('howList'),
    footer: document.getElementById('howFooterNote'),
    objective: document.getElementById('objective'),
    objectiveSlot: document.getElementById('howObjective')
  };

  const DEFAULT_COPY = {
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

  const state = {
    copy: { ...DEFAULT_COPY },
    leadMode: 'default',
    onStartGame: null,
    isGameRunning: () => false
  };

  function render(){
    const { list, footer, lead, overlay } = elements;
    const { copy, leadMode } = state;
    if (list){
      list.innerHTML = '';
      copy.steps.forEach(step => {
        const li = document.createElement('li');
        li.innerHTML = step;
        list.appendChild(li);
      });
    }
    if (footer){
      footer.textContent = copy.hint;
    }
    if (lead){
      if (overlay && !overlay.hidden){
        lead.textContent = leadMode === 'initial' ? copy.initialLead : copy.defaultLead;
      } else if (!lead.textContent){
        lead.textContent = copy.defaultLead;
      }
    }
  }

  async function loadCopy(){
    if (typeof fetch !== 'function') return;
    try {
      const response = await fetch('howto.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const copy = state.copy;
      state.copy = {
        initialLead: data.initialLead || copy.initialLead,
        defaultLead: data.defaultLead || copy.defaultLead,
        steps: Array.isArray(data.steps) && data.steps.length ? data.steps : copy.steps,
        hint: data.hint || copy.hint
      };
      render();
    } catch (err) {
      console.warn('Failed to load how-to copy', err);
    }
  }

  function open(initial){
    const { overlay, lead } = elements;
    if (!overlay) return;
    state.leadMode = initial ? 'initial' : 'default';
    render();
    if (lead){
      const { copy, leadMode } = state;
      lead.textContent = leadMode === 'initial' ? copy.initialLead : copy.defaultLead;
    }
    const UI = window.PSR?.UI;
    if (UI?.openOverlay){
      UI.openOverlay(overlay);
    } else {
      overlay.hidden = false;
      overlay.classList.add('show');
      document.body?.classList?.add('modal-open');
    }
  }

  function ensureObjectiveCopy(){
    const { objective, objectiveSlot } = elements;
    if (!objective || !objectiveSlot || objectiveSlot.dataset.bound === '1') return;

    const clone = objective.cloneNode(true);
    clone.removeAttribute('id');
    const heading = clone.querySelector('h2');
    if (heading){
      const replacement = document.createElement('h3');
      replacement.innerHTML = heading.innerHTML;
      heading.replaceWith(replacement);
    }
    clone.classList.add('howObjectiveContent');
    objectiveSlot.appendChild(clone);
    objectiveSlot.dataset.bound = '1';
  }

  function collapseObjective(){
    const { objective } = elements;
    if (!objective) return;
    objective.setAttribute('hidden', 'hidden');
    objective.setAttribute('aria-hidden', 'true');
  }

  function close(){
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

  function handleStartClick(){
    close();
    if (!state.isGameRunning() && typeof state.onStartGame === 'function'){
      state.onStartGame();
    }
  }

  function init(options){
    state.onStartGame = options?.onStartGame || null;
    state.isGameRunning = options?.isGameRunning || (() => false);

    render();
    loadCopy();
    ensureObjectiveCopy();

    if (elements.button){
      elements.button.addEventListener('click', () => open(false));
    }
    if (elements.close){
      elements.close.addEventListener('click', close);
    }
    if (elements.start){
      elements.start.addEventListener('click', handleStartClick);
    }

    const INTRO_KEY = 'psrun_intro_seen_v2';
    let isFirstVisit = true;
    try {
      if (localStorage.getItem(INTRO_KEY)){
        isFirstVisit = false;
      } else {
        localStorage.setItem(INTRO_KEY, '1');
      }
    } catch {
      isFirstVisit = true;
    }

    if (!isFirstVisit){
      collapseObjective();
    }

    if (isFirstVisit){
      open(true);
    }
  }

  window.PSR.Howto = {
    init,
    open,
    close
  };
})();
