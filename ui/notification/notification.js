// Importa el layout
import { loadLayout } from '../components/layout/layout.js';

// Cargar layout con la pestaña "notificaciones" activa
loadLayout('notificaciones');

// Espera a que el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  // Referencias a los contadores en las tarjetas
  const protectedCookiesCount = document.getElementById('protectedCookiesCount');
  const xssAttemptsCount = document.getElementById('xssAttemptsCount');
  const fingerprintChangesCount = document.getElementById('fingerprintChangesCount');
  const exportAttemptsCount = document.getElementById('exportAttemptsCount');

  try {
    const result = await chrome.storage.local.get([
      'protected_cookies',
      'xss_attempts',
      'fingerprint_changes',
      'export_attempts'
    ]);

    // Cookies protegidas
    if (result.protected_cookies) {
      const cookies = JSON.parse(result.protected_cookies);
      protectedCookiesCount.textContent = cookies.length;
    } else {
      protectedCookiesCount.textContent = '0';
    }

    // Intentos XSS
    if (result.xss_attempts) {
      xssAttemptsCount.textContent = result.xss_attempts.length;
    } else {
      xssAttemptsCount.textContent = '0';
    }

    // Cambios de fingerprint
    if (result.fingerprint_changes) {
      fingerprintChangesCount.textContent = result.fingerprint_changes.length;
    } else {
      fingerprintChangesCount.textContent = '0';
    }

    // Intentos de exportación
    if (result.export_attempts) {
      exportAttemptsCount.textContent = result.export_attempts.length;
    } else {
      exportAttemptsCount.textContent = '0';
    }

  } catch (error) {
    console.error('Error al cargar las notificaciones:', error);
  }
});
