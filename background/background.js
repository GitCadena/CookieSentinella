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

      // Mostrar notificación INMEDIATAMENTE con idioma apropiado
      await createLocalizedNotification('protection', {
        id: 'protection_' + Date.now(),
        priority: 2
      });
      
      // Guardar evento para notificaciones
      await saveNotificationEvent('session_protected', {
        timestamp: new Date().toISOString(),
        message: await getLocalizedMessage('sessionProtected'),
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
  
  // Mostrar notificación de limpieza INMEDIATAMENTE con idioma apropiado
  await createLocalizedNotification('cleanup', {
    id: 'cleanup_' + Date.now(),
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
    message: await getLocalizedMessage('sessionClosed'),
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
    case 'languageChanged':
      // Actualizar notificaciones con nuevo idioma
      updateNotificationLanguage(request.language).then(() => {
        // Notificar a todas las pestañas sobre el cambio de idioma
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'languageUpdated', 
              language: request.language 
            }).catch(() => {
              // Ignorar errores si la pestaña no puede recibir mensajes
            });
          });
        });
        sendResponse({ success: true });
      });
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

// Función para actualizar el idioma de las notificaciones
async function updateNotificationLanguage(language) {
  try {
    // Actualizar idioma de notificaciones futuras
    await chrome.storage.local.set({ notificationLanguage: language });
    console.log(`Idioma de notificaciones actualizado a: ${language}`);
  } catch (error) {
    console.error('Error actualizando idioma de notificaciones:', error);
  }
}

// Función para obtener idioma actual
async function getCurrentLanguage() {
  try {
    const stored = await chrome.storage.local.get(['notificationLanguage']);
    return stored.notificationLanguage || 'es';
  } catch (error) {
    console.error('Error obteniendo idioma:', error);
    return 'es';
  }
}

// Función para obtener mensaje localizado
async function getLocalizedMessage(messageKey) {
  const lang = await getCurrentLanguage();
  
  const messages = {
    es: {
      sessionProtected: 'Sesión protegida exitosamente',
      sessionClosed: 'Sesión cerrada y cookies limpiadas'
    },
    en: {
      sessionProtected: 'Session successfully protected',
      sessionClosed: 'Session closed and cookies cleaned'
    }
  };
  
  return messages[lang][messageKey] || messageKey;
}

// Función para crear notificaciones con idioma apropiado
async function createLocalizedNotification(notificationType, options = {}) {
  try {
    const lang = await getCurrentLanguage();
    
    // Definir las notificaciones por tipo
    const notificationData = {
      protection: {
        es: {
          title: 'CookieSentinella — Protección activa',
          message: 'Sesión segura: cookies blindadas (Secure/HttpOnly/SameSite), bloqueo XSS y alerta por cambios sospechosos.\nLimpieza automática al cerrar sesión.'
        },
        en: {
          title: 'CookieSentinella — Active Protection', 
          message: 'Secure session: armored cookies (Secure/HttpOnly/SameSite), XSS blocking and suspicious change alerts.\nAutomatic cleanup on logout.'
        }
      },
      cleanup: {
        es: {
          title: 'CookieSentinella — Limpieza completada',
          message: 'Cookies de sesión eliminadas y protección desactivada.'
        },
        en: {
          title: 'CookieSentinella — Cleanup Completed',
          message: 'Session cookies deleted and protection disabled.'
        }
      },
      cookieTampering: {
        es: {
          title: 'Manipulación de Cookie Detectada',
          message: 'Cambio no autorizado en cookie MoodleSession'
        },
        en: {
          title: 'Cookie Tampering Detected',
          message: 'Unauthorized change in MoodleSession cookie'
        }
      },
      fingerprintChanged: {
        es: {
          title: 'Huella Digital del Dispositivo Cambiada',
          message: 'Se detectaron cambios significativos en la huella digital del dispositivo.'
        },
        en: {
          title: 'Device Fingerprint Changed',
          message: 'Significant changes detected in device fingerprint.'
        }
      },
      xssAttempt: {
        es: {
          title: 'Intento de XSS Detectado',
          message: 'Se bloqueó un intento de ataque XSS.'
        },
        en: {
          title: 'XSS Attempt Detected',
          message: 'An XSS attack attempt was blocked.'
        }
      }
    };

    // Obtener datos de la notificación según el tipo e idioma
    const notification = notificationData[notificationType]?.[lang];
    
    if (!notification) {
      console.error(`Tipo de notificación no encontrado: ${notificationType}`);
      return;
    }

    const notificationOptions = {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: notification.title,
      message: notification.message,
      priority: options.priority || 1
    };

    // Crear notificación
    if (options.id) {
      return chrome.notifications.create(options.id, notificationOptions);
    } else {
      return chrome.notifications.create(notificationOptions);
    }
  } catch (error) {
    console.error('Error creando notificación localizada:', error);
    
    // Fallback a notificación básica en español
    const fallbackNotifications = {
      protection: {
        title: 'CookieSentinella — Protección activa',
        message: 'Sesión segura: cookies blindadas (Secure/HttpOnly/SameSite), bloqueo XSS y alerta por cambios sospechosos.\nLimpieza automática al cerrar sesión.'
      },
      cleanup: {
        title: 'CookieSentinella — Limpieza completada',
        message: 'Cookies de sesión eliminadas y protección desactivada.'
      }
    };
    
    const fallback = fallbackNotifications[notificationType];
    if (fallback) {
      return chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: fallback.title,
        message: fallback.message,
        priority: options.priority || 1
      });
    }
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
  if (notificationId.startsWith('protection_') || notificationId.startsWith('cleanup_')) {
    chrome.action.openPopup();
  }
});

// Escuchar mensajes de content scripts para eventos de seguridad
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Manejar eventos de XSS
  if (message.type === 'xss_attempt') {
    handleXSSAttempt(message);
    sendResponse({ success: true });
  }
  
  // Manejar cambios de fingerprint
  if (message.type === 'fingerprint_changed') {
    handleFingerprintChange(message);
    sendResponse({ success: true });
  }
});

// Manejar intentos de XSS
async function handleXSSAttempt(data) {
  try {
    // Guardar intento de XSS
    const result = await chrome.storage.local.get(['xss_attempts']);
    const attempts = result.xss_attempts || [];
    attempts.push({
      timestamp: new Date().toISOString(),
      url: data.url,
      details: data.details
    });
    await chrome.storage.local.set({ xss_attempts: attempts });

    // Mostrar notificación
    await createLocalizedNotification('xssAttempt', { priority: 2 });

    // Guardar evento
    await saveNotificationEvent('xss_attempt', {
      timestamp: new Date().toISOString(),
      message: `XSS bloqueado: ${data.details}`,
      type: 'warning'
    });

  } catch (error) {
    console.error('Error manejando intento de XSS:', error);
  }
}

// Manejar cambios de fingerprint
async function handleFingerprintChange(data) {
  try {
    // Guardar cambio de fingerprint
    const result = await chrome.storage.local.get(['fingerprint_changes']);
    const changes = result.fingerprint_changes || [];
    changes.push({
      timestamp: new Date().toISOString(),
      oldFingerprint: data.oldFingerprint,
      newFingerprint: data.newFingerprint
    });
    await chrome.storage.local.set({ fingerprint_changes: changes });

    // Mostrar notificación
    await createLocalizedNotification('fingerprintChanged', { priority: 1 });

    // Guardar evento
    await saveNotificationEvent('fingerprint_change', {
      timestamp: new Date().toISOString(),
      message: await getLocalizedMessage('fingerprintChanged'),
      type: 'info'
    });

  } catch (error) {
    console.error('Error manejando cambio de fingerprint:', error);
  }
}

// Inicialización al instalar/actualizar la extensión
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('CookieSentinella instalada');
    
    // Inicializar configuraciones por defecto
    await chrome.storage.local.set({
      protected_cookies_stats: 0,
      xss_attempts: [],
      fingerprint_changes: [],
      export_attempts: [],
      notification_events: [],
      notificationLanguage: 'es'
    });
  } else if (details.reason === 'update') {
    console.log('CookieSentinella actualizada');
  }
});

// Limpiar datos al desinstalar (cleanup)
chrome.runtime.onSuspend.addListener(() => {
  console.log('CookieSentinella suspendida');
});