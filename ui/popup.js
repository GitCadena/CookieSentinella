// ui/popup.js
import { loadLayout } from './components/layout/layout.js';

document.addEventListener('DOMContentLoaded', async () => {
  await loadLayout(); // Carga header y footer

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
    statusIcon.alt = isProtected ? 'Protegido' : 'No protegido';
  }
}


  async function updateUI() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStatus' });

      statusText.textContent = response.protection
        ? 'Protección activa'
        : 'Protección inactiva';
      statusEl.className = `statusBox ${response.protection ? 'active' : 'inactive'}`;
      toggleBtn.textContent = response.protection
        ? 'Desactivar protección'
        : 'Activar protección';
      toggleBtn.className = response.protection ? 'deactivate' : 'activate';
      setStatusIcon(response.protection);

      sessionEl.textContent = response.active
        ? '🟢 Sesión activa'
        : '🔴 Sesión inactiva';
      sessionEl.className = response.active ? 'sessionActive' : 'sessionInactive';

      errorEl.textContent = '';
    } catch (err) {
      errorEl.textContent = 'Error al cargar estado';
      setStatusIcon(false);
    }
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
      Limpiando...
    `;

    try {
      await chrome.runtime.sendMessage({ action: 'forceCleanup' });

      cleanupBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
        ¡Limpieza completada!
      `;
      cleanupBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

      setTimeout(() => {
        cleanupBtn.innerHTML = originalHTML;
        cleanupBtn.style.background = '';
        cleanupBtn.disabled = false;
      }, 2000);

      updateUI();
    } catch (err) {
      cleanupBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M18 6L6 18"></path>
          <path d="M6 6l12 12"></path>
        </svg>
        Error en limpieza
      `;
      cleanupBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';

      setTimeout(() => {
        cleanupBtn.innerHTML = originalHTML;
        cleanupBtn.style.background = '';
        cleanupBtn.disabled = false;
      }, 3000);

      errorEl.textContent = err.message;
    }
  });

  updateUI();
  setInterval(updateUI, 2000);
});
