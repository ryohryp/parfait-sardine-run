const BASE_W = 390;
const BASE_H = 844;

const rootStyle = document.documentElement.style;
let sceneRoot = null;

function getSceneRoot() {
  if (!sceneRoot || !document.contains(sceneRoot)) {
    sceneRoot = document.querySelector('.scene-root');
  }
  return sceneRoot;
}

let naturalWidth = BASE_W;
let naturalHeight = BASE_H;

rootStyle.setProperty('--scene-base-w', String(BASE_W));
rootStyle.setProperty('--scene-base-h', String(BASE_H));

export function measureScene() {
  const rootEl = getSceneRoot();

  if (!rootEl) {
    naturalWidth = BASE_W;
    naturalHeight = BASE_H;
    return;
  }

  const measuredWidth = Math.max(BASE_W, Math.round(rootEl.scrollWidth));
  const measuredHeight = Math.max(BASE_H, Math.round(rootEl.scrollHeight));

  naturalWidth = measuredWidth;
  naturalHeight = measuredHeight;
}

function getVisualHeight() {
  if (window.visualViewport && typeof window.visualViewport.height === 'number') {
    return Math.max(1, window.visualViewport.height);
  }
  return Math.max(1, window.innerHeight);
}

export function fitScene() {
  measureScene();
  const vw = Math.max(1, window.innerWidth);
  const vh = getVisualHeight();
  const widthScale = Math.max(0, vw / naturalWidth);
  const heightScale = Math.max(0, vh / naturalHeight);
  const scale = Math.min(1, widthScale, heightScale);
  rootStyle.setProperty('--scene-scale', scale.toFixed(4));
}

function bindViewportEvents() {
  window.addEventListener('resize', fitScene, { passive: true });
  window.addEventListener('orientationchange', fitScene, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitScene, { passive: true });
    window.visualViewport.addEventListener('scroll', fitScene, { passive: true });
  }
}

let initialized = false;

export function initSceneScaling() {
  if (initialized) return;
  initialized = true;

  bindViewportEvents();

  const runInitialFits = () => {
    fitScene();
    requestAnimationFrame(fitScene);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInitialFits, { once: true });
  } else {
    runInitialFits();
  }
}

initSceneScaling();
