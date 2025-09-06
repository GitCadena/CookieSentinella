const COOKIE_NAME = 'MoodleSession';
const TARGET_DOMAIN = 'virtualunimayor.edu.co';
const LOGIN_URLS = ['/login/index.php'];
const POST_LOGIN_URLS = ['/my/', '/user/profile.php'];
const LOGOUT_URLS = ['/login/logout.php'];

let sessionActive = false;
let protectionEnabled = true;

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
  
  for (const cookie of cookies) {
    await protectCookie(cookie);
  }
}

// Manejar cierre de sesión
async function handleLogout() {
  console.log('🔴 Sesión cerrada - Limpiando cookies');
  sessionActive = false;
  
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

  } catch (error) {
    console.error('Error protegiendo cookie:', error);
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
  }
});

// Monitoreo continuo
setInterval(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length) checkSessionStatus(tabs[0].url);
  });
}, 5000);