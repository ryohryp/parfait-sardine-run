(() => {
  const BASE_W = 390;
  const BASE_H = 844;
  const rootStyle = document.documentElement.style;

  rootStyle.setProperty('--scene-base-h', String(BASE_H));

  function getVisualHeight() {
    if (window.visualViewport && typeof window.visualViewport.height === 'number') {
      return Math.max(1, window.visualViewport.height);
    }
    return Math.max(1, window.innerHeight);
  }

  function fitScene() {
    const vw = Math.max(1, window.innerWidth);
    const vh = getVisualHeight();
    const scale = Math.min(1, vw / BASE_W, vh / BASE_H);
    rootStyle.setProperty('--scene-scale', scale.toFixed(4));
  }

  window.addEventListener('resize', fitScene, { passive: true });
  window.addEventListener('orientationchange', fitScene, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitScene, { passive: true });
    window.visualViewport.addEventListener('scroll', fitScene, { passive: true });
  }
  document.addEventListener('DOMContentLoaded', fitScene);
  fitScene();
})();
