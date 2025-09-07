// navigation.js - Navegación centralizada robusta con sistema de idiomas

import i18n from '../../../utils/i18n.js';

class Navigation {
  constructor() {
    // Páginas relativas al directorio /ui/
    this.pages = {
      'btn-inicio': 'popup.html',
      'btn-notificaciones': 'notification/notification.html',
      'btn-configuracion': 'config/config.html',
      'btn-ayuda': 'help/help.html'
    };

    this.init();
  }

  async init() {
    // Inicializar i18n
    await i18n.init();
    
    this.setupEventListeners();
    this.highlightCurrentPage();
    this.translateNavigation();
  }

  setupEventListeners() {
    Object.keys(this.pages).forEach(btnId => {
      const button = document.getElementById(btnId);
      if (button) {
        button.addEventListener('click', () => this.navigateTo(this.pages[btnId]));
      }
    });
  }

  // Navegación robusta con chrome.runtime.getURL
  navigateTo(page) {
    const fullUrl = chrome.runtime.getURL('ui/' + page);
    console.log(`Navegando a: ${fullUrl}`);
    window.location.href = fullUrl;
  }

  // Resaltar la pestaña activa según el nombre del archivo
  highlightCurrentPage() {
    const currentPage = this.getCurrentPage();

    Object.keys(this.pages).forEach(btnId => {
      const button = document.getElementById(btnId);
      if (button) {
        button.classList.remove('active');

        const targetPage = this.pages[btnId];
        const targetFileName = targetPage.split('/').pop();

        if (currentPage === targetFileName) {
          button.classList.add('active');
        }
      }
    });
  }

  getCurrentPage() {
    const path = window.location.pathname;
    return path.split('/').pop() || 'popup.html';
  }

  // Traducir etiquetas de navegación
  translateNavigation() {
    const navButtons = {
      'btn-inicio': 'inicio',
      'btn-notificaciones': 'notifications',
      'btn-configuracion': 'configuration',
      'btn-ayuda': 'help'
    };

    Object.keys(navButtons).forEach(btnId => {
      const button = document.getElementById(btnId);
      if (button) {
        const textElement = button.querySelector('span');
        if (textElement) {
          textElement.textContent = i18n.t(navButtons[btnId]);
        }
      }
    });
  }

  // Método para actualizar traducciones cuando cambie el idioma
  updateTranslations() {
    this.translateNavigation();
  }
}

// Exportar clase (para uso dinámico en layout.js)
export default Navigation;

// También inicializar automáticamente si no es importado como módulo
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
  });
}