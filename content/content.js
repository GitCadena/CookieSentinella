(function() {
  'use strict';

  const COOKIE_NAME = 'MoodleSession';
  let sessionActive = false;

  // Detectar elementos de sesión
  function checkSessionStatus() {
    const hasUserMenu = document.querySelector('.usermenu, .userpicture');
    const isPostLoginPage = ['/my/', '/user/profile.php'].some(path => 
      window.location.pathname.includes(path)
    );

    const newSessionStatus = hasUserMenu || isPostLoginPage;

    if (newSessionStatus && !sessionActive) {
      // Notificar inicio de sesión
      chrome.runtime.sendMessage({ action: 'sessionStart' });
      sessionActive = true;
    } else if (!newSessionStatus && sessionActive) {
      // Notificar cierre de sesión
      chrome.runtime.sendMessage({ action: 'sessionEnd' });
      sessionActive = false;
    }
  }

  // Observar cambios en el DOM
  const observer = new MutationObserver(checkSessionStatus);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });

  // Verificar estado inicial
  checkSessionStatus();

  // Proteger cookies solo cuando hay sesión activa
  if (sessionActive) {
    protectCookieAccess();
  }

  function protectCookieAccess() {
    const originalGetter = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie').get;
    
    Object.defineProperty(document, 'cookie', {
      get: function() {
        const cookies = originalGetter.call(document);
        if (!cookies.includes(COOKIE_NAME)) return cookies;
        return cookies.replace(
          new RegExp(`${COOKIE_NAME}=[^;]+`), 
          `${COOKIE_NAME}=protected`
        );
      },
      set: function(value) {
        if (value.includes(COOKIE_NAME)) {
          console.warn('Intento de modificación de cookie bloqueado');
          return;
        }
        Object.getOwnPropertyDescriptor(Document.prototype, 'cookie').set.call(document, value);
      },
      configurable: true
    });
  }
})();