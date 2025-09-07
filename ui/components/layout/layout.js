// layout.js - Layout con sistema de idiomas

import i18n from '../../../utils/i18n.js';

export async function loadLayout(activePage = '') {
  const headerContainer = document.getElementById('layout-header');
  const footerContainer = document.getElementById('layout-footer');

  // Detectar desde dónde se carga y ajustar la ruta base
  const currentPath = window.location.pathname;
  const isInSubfolder = currentPath.includes('/notification/') || currentPath.includes('/config/') || currentPath.includes('/help/');
  const basePath = isInSubfolder ? '../components/layout/' : './components/layout/';

  try {
    const [headerRes, footerRes] = await Promise.all([
      fetch(`${basePath}header.html`),
      fetch(`${basePath}footer.html`),
    ]);

    const headerHtml = await headerRes.text();
    const footerHtml = await footerRes.text();

    if (headerContainer) headerContainer.innerHTML = headerHtml;
    if (footerContainer) footerContainer.innerHTML = footerHtml;

    // Inicializar i18n
    await i18n.init();

    // Activar navegación una vez cargado
    const { default: Navigation } = await import('../shared/navigation.js');
    const nav = new Navigation(activePage);

    // Escuchar cambios de idioma para actualizar navegación
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'languageUpdated') {
        nav.updateTranslations();
        sendResponse({ success: true });
      }
    });

  } catch (err) {
    console.error('Error cargando layout:', err);
  }
}