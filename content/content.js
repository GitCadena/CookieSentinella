(function() {
  'use strict';

  const COOKIE_NAME = 'MoodleSession';
  let sessionActive = false;

  // Detectar elementos de sesión
  function checkSessionStatus() {
    if (document.readyState === 'loading') return;

    const hasUserMenu = document.querySelector('.usermenu, .userpicture');
    const isPostLoginPage = ['/my/', '/user/profile.php'].some(path => 
      window.location.pathname.includes(path)
    );

    const newSessionStatus = hasUserMenu || isPostLoginPage;

    if (newSessionStatus && !sessionActive) {
      chrome.runtime.sendMessage({ action: 'sessionStart' });
      sessionActive = true;
    } else if (!newSessionStatus && sessionActive) {
      chrome.runtime.sendMessage({ action: 'sessionEnd' });
      sessionActive = false;
    }
  }

  // Configurar observador solo si document.body existe
  function setupObserver() {
    if (!document.body) {
      setTimeout(setupObserver, 100);
      return;
    }

    try {
      const observer = new MutationObserver(() => {
        checkSessionStatus();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } catch (error) {
      console.error('Error configurando observer:', error);
    }
  }

  // Inicializar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      checkSessionStatus();
      setupObserver();
    });
  } else {
    checkSessionStatus();
    setupObserver();
  }
})();