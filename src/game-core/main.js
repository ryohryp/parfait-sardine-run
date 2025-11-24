
import './js/utils.js';
import './js/howto.js';
import './js/leaderboard.js';
import { Settings } from './js/settings.js';
import './js/comments.js';
import { RunLog } from './js/api/runlog.js';
import { GameFactory } from './js/game/GameFactory.js';
import { registerSW, checkLatestAndBadge, initUpdateUI, ensureUpdateBtnOutside } from './js/app-update.js';

// Polyfill & Helpers
if (typeof Element !== 'undefined' && !Element.prototype.closest) {
  Element.prototype.closest = function (sel) {
    let el = this;
    while (el && el.nodeType === 1) {
      if (el.matches && el.matches(sel)) return el;
      el = el.parentElement || el.parentNode;
    }
    return null;
  };
}

function getEventElement(ev) {
  if (ev && ev.target instanceof Element) return ev.target;
  if (ev && typeof ev.composedPath === 'function') {
    const n = ev.composedPath().find(n => n instanceof Element);
    if (n) return n;
  }
  const t = ev && ev.target;
  if (t && t.parentElement instanceof Element) return t.parentElement;
  return null;
}

// Prevent selection on buttons
document.addEventListener('selectstart', (event) => {
  const el = getEventElement(event);
  if (el && el.closest('button')) {
    event.preventDefault();
  }
});

// Detach touch controls
(function detachTouchControls() {
  const wrap = document.querySelector('#sceneWrap, .scene-wrap');
  const panel = document.getElementById('touchControls');
  if (wrap && panel && wrap.contains(panel)) {
    document.body.appendChild(panel);
  }
})();

// App Update Logic
window.addEventListener('DOMContentLoaded', async () => {
  ensureUpdateBtnOutside();
  await registerSW();
  initUpdateUI();
  await checkLatestAndBadge();
  setInterval(checkLatestAndBadge, 6 * 60 * 60 * 1000);
});

// RunLog Setup
RunLog.setNicknameProvider(() => Settings.getNickname());
RunLog.setShareProvider(() => Settings.getShare());

// Initialize Game
const canvas = document.getElementById('cv');
const game = canvas ? GameFactory.create(canvas) : null;

// Expose for debugging if needed
window.PSR = window.PSR || {};
window.PSR.game = game;
