import { PSR_VER } from './presentation.js';

const versionLabel = document.getElementById('versionLabel');
if (versionLabel) {
  versionLabel.textContent = PSR_VER;
}
