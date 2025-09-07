// ui/popup.js - Popup principal con sistema de idiomas

import { loadLayout } from './components/layout/layout.js';
import i18n from '../utils/i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar i18n y cargar layout
  await i18n.init();
  await loadLayout();

  const statusEl = document.getElementById('status');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = statusEl.querySelector('span');
  const sessionEl = document.getElementById('sessionStatus');
  const toggleBtn = document.getElementById('toggleBtn');
  const cleanupBtn = document.getElementById('cleanupBtn');
  const errorEl = document.getElementById('error');

  function setStatusIcon(isProtected) {
    const timestamp = Date.now();
    const iconPath = isProtected ? 'icons/escudo-protegido.png' : 'icons/escudo-no.png';
    const fullPath = chrome.runtime.getURL(iconPath);

    if (statusIcon) {
      statusIcon.src = `${fullPath}?${timestamp}`;
      statusIcon.alt = isProtected ? i18n.t('protectionActive') : i18n.t('protectionInactive');
    }
  }

  async function updateUI() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStatus' });

      // Actualizar textos con traducciones
      statusText.textContent = response.protection
        ? i18n.t('protectionActive')
        : i18n.t('protectionInactive');
      
      statusEl.className = `statusBox ${response.protection ? 'active' : 'inactive'}`;
      
      toggleBtn.textContent = response.protection
        ? i18n.t('deactivateProtection')
        : i18n.t('activateProtection');
      
      toggleBtn.className = response.protection ? 'deactivate' : 'activate';
      setStatusIcon(response.protection);

      sessionEl.textContent = response.active
        ? i18n.t('sessionActive')
        : i18n.t('sessionInactive');
      
      sessionEl.className = response.active ? 'sessionActive' : 'sessionInactive';

      // Actualizar botón de limpieza
      if (!cleanupBtn.disabled) {
        cleanupBtn.textContent = i18n.t('cleanSession');
      }

      errorEl.textContent = '';
    } catch (err) {
      errorEl.textContent = i18n.t('errorLoadingStatus');
      setStatusIcon(false);
    }
  }

  function updateLoadingState() {
    statusText.textContent = i18n.t('loadingStatus');
    sessionEl.textContent = i18n.t('verifyingSession');
  }

  toggleBtn.addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
      await chrome.runtime.sendMessage({
        action: 'toggleProtection',
        enable: !response.protection
      });
      await updateUI();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  cleanupBtn.addEventListener('click', async () => {
    cleanupBtn.disabled = true;
    const originalHTML = cleanupBtn.innerHTML;

    cleanupBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="animate-spin">
        <path d="M21 12a9 9 0 11-6.219-8.56"></path>
      </svg>
      ${i18n.t('cleaning')}
    `;

    try {
      await chrome.runtime.sendMessage({ action: 'forceCleanup' });

      cleanupBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
        ${i18n.t('cleanupCompleted')}
      `;
      cleanupBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

      setTimeout(() => {
        cleanupBtn.innerHTML = originalHTML;
        cleanupBtn.style.background = '';
        cleanupBtn.disabled = false;
        updateUI(); // Refrescar traducciones
      }, 2000);

      updateUI();
    } catch (err) {
      cleanupBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M18 6L6 18"></path>
          <path d="M6 6l12 12"></path>
        </svg>
        ${i18n.t('cleanupError')}
      `;
      cleanupBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';

      setTimeout(() => {
        cleanupBtn.innerHTML = originalHTML;
        cleanupBtn.style.background = '';
        cleanupBtn.disabled = false;
        updateUI(); // Refrescar traducciones
      }, 3000);

      errorEl.textContent = err.message;
    }
  });

  // Inicializar con estado de carga
  updateLoadingState();
  
  // Actualizar UI inicial
  updateUI();
  
  // Actualizar cada 2 segundos
  setInterval(updateUI, 2000);
  
  // Escuchar cambios de idioma
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'languageUpdated') {
      updateUI();
      sendResponse({ success: true });
    }
  });
});