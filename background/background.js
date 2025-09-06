const COOKIE_NAME = 'MoodleSession';
const TARGET_DOMAIN = 'virtualunimayor.edu.co';
const LOGIN_URLS = ['/login/index.php'];
const POST_LOGIN_URLS = ['/my/', '/user/profile.php'];
const LOGOUT_URLS = ['/login/logout.php'];

let sessionActive = false;
let protectionEnabled = true;
let lastCookieValue = null;

// Escuchar cambios de navegación
chrome.webNavigation.onCommitted.addListener(async (details) => {
  const url = new URL(details.url);
  
  // Detectar logout
  if (LOGOUT_URLS.some(path => url.pathname.includes(path))) {
    await handleLogout();
    return;
  }

  // Verificar estado de sesión
  await checkSessionStatus(details.url);
});

// Verificar estado de sesión
async function checkSessionStatus(url) {
  if (!url.includes(TARGET_DOMAIN)) return;

  try {
    const [hasUserMenu, isPostLoginPage] = await Promise.all([
      checkUserMenuExistence(),
      POST_LOGIN_URLS.some(path => new URL(url).pathname.includes(path))
    ]);

    const newSessionStatus = hasUserMenu || isPostLoginPage;
    
    if (newSessionStatus && !sessionActive) {
      // Nueva sesión detectada
      await handleLogin();
    } else if (!newSessionStatus && sessionActive) {
      // Sesión perdida
      await handleLogout();
    }
  } catch (error) {
    console.error('Error verificando estado de sesión:', error);
  }
}

// Verificar elementos de UI que indican sesión activa
async function checkUserMenuExistence() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length) return false;

  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => !!document.querySelector('.usermenu, .userpicture')
    });
    return result[0]?.result || false;
  } catch (error) {
    return false;
  }
}

// Manejar inicio de sesión
async function handleLogin() {
  console.log('🟢 Sesión iniciada - Activando protección');
  sessionActive = true;
  
  // Proteger cookies existentes
  const cookies = await chrome.cookies.getAll({
    name: COOKIE_NAME,
    domain: TARGET_DOMAIN
  });
  
  if (cookies.length > 0) {
    const currentCookieValue = cookies[0].value;
    
    // Solo mostrar notificación si es una cookie nueva/diferente
    if (lastCookieValue !== currentCookieValue) {
      lastCookieValue = currentCookieValue;
      
      for (const cookie of cookies) {
        await protectCookie(cookie);
      }

      // Mostrar notificación INMEDIATAMENTE
      chrome.notifications.create('protection_' + Date.now(), {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'CookieSentinella — Protección activa',
        message: 'Sesión segura: cookies blindadas (Secure/HttpOnly/SameSite), bloqueo XSS y alerta por cambios sospechosos.\nLimpieza automática al cerrar sesión.',
        priority: 2
      });
      
      // Guardar evento para notificaciones
      await saveNotificationEvent('session_protected', {
        timestamp: new Date().toISOString(),
        message: 'Sesión protegida exitosamente',
        type: 'success'
      });
    }
  }
}

// Manejar cierre de sesión
async function handleLogout() {
  console.log('🔴 Sesión cerrada - Limpiando cookies');
  sessionActive = false;
  lastCookieValue = null;
  
  // Mostrar notificación de limpieza INMEDIATAMENTE
  chrome.notifications.create('cleanup_' + Date.now(), {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
    title: 'CookieSentinella — Limpieza completada',
    message: 'Cookies de sesión eliminadas y protección desactivada.',
    priority: 1
  });
  
  // Eliminar todas las cookies de sesión
  const cookies = await chrome.cookies.getAll({
    name: COOKIE_NAME,
    domain: TARGET_DOMAIN
  });
  
  for (const cookie of cookies) {
    await chrome.cookies.remove({
      url: `https://${cookie.domain}${cookie.path}`,
      name: cookie.name
    });
  }

  // Guardar evento para notificaciones
  await saveNotificationEvent('session_cleanup', {
    timestamp: new Date().toISOString(),
    message: 'Sesión cerrada y cookies limpiadas',
    type: 'info'
  });
}

// Proteger cookie específica
async function protectCookie(cookie) {
  if (!protectionEnabled || !sessionActive) return;

  try {
    // Verificar si ya está protegida
    if (cookie.secure && cookie.httpOnly && cookie.sameSite === 'lax') {
      return;
    }

    // Crear versión protegida
    const protectedCookie = {
      url: `https://${cookie.domain}${cookie.path}`,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      expirationDate: cookie.expirationDate
    };

    // Eliminar versiones no protegidas
    await chrome.cookies.remove({
      url: `https://${cookie.domain}${cookie.path}`,
      name: cookie.name
    });

    // Establecer cookie protegida
    await chrome.cookies.set(protectedCookie);
    console.log('Cookie protegida:', protectedCookie);

    // Incrementar contador de cookies protegidas
    await incrementProtectedCookiesCount();

  } catch (error) {
    console.error('Error protegiendo cookie:', error);
  }
}

// Incrementar contador de cookies protegidas
async function incrementProtectedCookiesCount() {
  try {
    const result = await chrome.storage.local.get(['protected_cookies_stats']);
    const currentCount = result.protected_cookies_stats || 0;
    await chrome.storage.local.set({ 
      protected_cookies_stats: currentCount + 1 
    });
  } catch (error) {
    console.error('Error incrementando contador:', error);
  }
}

// Guardar eventos para el panel de notificaciones
async function saveNotificationEvent(type, data) {
  try {
    const result = await chrome.storage.local.get(['notification_events']);
    const events = result.notification_events || [];
    
    events.unshift({ // Agregar al inicio
      id: Date.now(),
      type: type,
      ...data
    });
    
    // Mantener solo los últimos 50 eventos
    if (events.length > 50) {
      events.splice(50);
    }
    
    await chrome.storage.local.set({ notification_events: events });
  } catch (error) {
    console.error('Error guardando evento de notificación:', error);
  }
}

// Comunicación con la UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getStatus':
      sendResponse({ active: sessionActive, protection: protectionEnabled });
      break;
    case 'toggleProtection':
      protectionEnabled = request.enable;
      sendResponse({ success: true });
      break;
    case 'forceCleanup':
      handleLogout().then(() => sendResponse({ success: true }));
      return true;
    case 'getNotificationStats':
      getNotificationStats().then(stats => sendResponse(stats));
      return true;
  }
});

// Obtener estadísticas para el panel de notificaciones
async function getNotificationStats() {
  try {
    const result = await chrome.storage.local.get([
      'protected_cookies_stats',
      'xss_attempts',
      'fingerprint_changes',
      'export_attempts',
      'notification_events'
    ]);

    return {
      protectedCookies: result.protected_cookies_stats || 0,
      xssAttempts: result.xss_attempts?.length || 0,
      fingerprintChanges: result.fingerprint_changes?.length || 0,
      exportAttempts: result.export_attempts?.length || 0,
      recentEvents: result.notification_events?.slice(0, 10) || []
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return {
      protectedCookies: 0,
      xssAttempts: 0,
      fingerprintChanges: 0,
      exportAttempts: 0,
      recentEvents: []
    };
  }
}

// Monitoreo continuo
setInterval(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length) checkSessionStatus(tabs[0].url);
  });
}, 5000);

// Manejar clics en notificaciones
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('protection_')) {
    chrome.action.openPopup();
  }
});