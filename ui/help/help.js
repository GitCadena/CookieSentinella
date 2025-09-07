// ui/help/help.js - Ayuda con sistema de idiomas

import { loadLayout } from '../components/layout/layout.js';
import i18n from '../../utils/i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar i18n y cargar layout
  await i18n.init();
  await loadLayout('ayuda');
  
  // Función para traducir la página
  function translateHelpPage() {
    // Traducir título principal
    const mainTitle = document.querySelector('h3');
    if (mainTitle) mainTitle.textContent = i18n.t('help');
    
    // Traducir botones de ayuda
    const faqText = document.querySelector('#faq-btn span');
    const supportText = document.querySelector('#support-btn span');
    const reportText = document.querySelector('#report-btn span');
    
    if (faqText) faqText.textContent = i18n.t('faq');
    if (supportText) supportText.textContent = i18n.t('support');
    if (reportText) reportText.textContent = i18n.t('reportProblem');
  }

  // Event listeners para los botones
  document.getElementById('faq-btn').addEventListener('click', () => {
    alert(i18n.t('faqAlert'));
  });

  document.getElementById('support-btn').addEventListener('click', () => {
    window.open('mailto:soporte@cookiesentinella.com', '_blank');
  });

  document.getElementById('report-btn').addEventListener('click', () => {
    alert(i18n.t('reportAlert'));
  });

  // Inicializar traducciones
  translateHelpPage();

  // Escuchar cambios de idioma
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'languageUpdated') {
      translateHelpPage();
      sendResponse({ success: true });
    }
  });
});