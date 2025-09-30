import { PSR_VER } from './presentation.js';

const versionLabel = document.getElementById('versionLabel');
if (versionLabel) {
  versionLabel.textContent = PSR_VER;
}

const versionBtn = document.getElementById('versionBtn');
if (versionBtn) {
  versionBtn.disabled = true;
}

const disableButton = () => {
  if (versionBtn) {
    versionBtn.disabled = true;
  }
};

const enableButton = () => {
  if (versionBtn) {
    versionBtn.disabled = false;
  }
};

let reloadScheduled = false;
const scheduleReload = (delay = 160) => {
  if (reloadScheduled) {
    return;
  }
  reloadScheduled = true;
  setTimeout(() => {
    window.location.reload();
  }, delay);
};

const params = new URLSearchParams(window.location.search);
const devMode = params.has('dev');

const setupUpdateControls = (reg) => {
  if (!versionBtn) {
    return;
  }

  const monitorWaiting = () => {
    const waiting = reg.waiting;
    if (!waiting) {
      return false;
    }
    waiting.postMessage('PSR_SKIP_WAITING');
    if (navigator.serviceWorker.controller) {
      scheduleReload();
    }
    return true;
  };

  const watchState = (sw) => {
    if (!sw) {
      return;
    }
    sw.addEventListener('statechange', () => {
      if (sw.state === 'installed') {
        monitorWaiting();
      }
    });
  };

  if (reg.installing) {
    watchState(reg.installing);
  }
  reg.addEventListener('updatefound', () => {
    watchState(reg.installing);
  });

  monitorWaiting();

  versionBtn.addEventListener('click', async () => {
    disableButton();
    try {
      if (monitorWaiting()) {
        return;
      }

      await reg.update();

      if (monitorWaiting()) {
        return;
      }

      await fetch(window.location.href, { cache: 'reload' }).catch(() => {});
      scheduleReload();
    } catch (error) {
      console.error('[PSR] update check failed:', error);
    } finally {
      enableButton();
    }
  });
};

if (!('serviceWorker' in navigator)) {
  disableButton();
} else if (devMode) {
  disableButton();
  navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
    .then(() => {
      console.log('[PWA] dev mode: SW unregistered');
    });
} else {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data === 'PSR_RELOAD') {
      scheduleReload();
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    scheduleReload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/parfait-sardine-run/service-worker.js')
      .catch((error) => {
        console.error('[PWA] register failed:', error);
      });
  });

  navigator.serviceWorker.ready
    .then((reg) => {
      setupUpdateControls(reg);
      enableButton();
    })
    .catch((error) => {
      console.error('[PSR] waiting for service worker failed:', error);
      enableButton();
    });
}
