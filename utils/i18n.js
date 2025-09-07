// utils/i18n.js - Sistema de internacionalización completo

class I18n {
  constructor() {
    this.currentLanguage = 'es';
    this.translations = {
      es: {
        // Header
        appName: 'CookieSentinella',
        
        // Estados principales
        protectionActive: 'Protección activa',
        protectionInactive: 'Protección inactiva',
        sessionActive: '🟢 Sesión activa',
        sessionInactive: '🔴 Sesión inactiva',
        loadingStatus: 'Cargando estado...',
        verifyingSession: 'Verificando sesión...',
        
        // Botones principales
        activateProtection: 'Activar protección',
        deactivateProtection: 'Desactivar protección',
        cleanSession: 'Limpiar Sesión',
        cleaning: 'Limpiando...',
        cleanupCompleted: '¡Limpieza completada!',
        cleanupError: 'Error en limpieza',
        
        // Navegación
        inicio: 'Inicio',
        notifications: 'Notificaciones',
        configuration: 'Configuración',
        help: 'Ayuda',
        
        // Página de Notificaciones
        protectedCookies: 'Cookies protegidas',
        xssAttempts: 'Intentos de XSS',
        fingerprintChanges: 'Cambios de fingerprint',
        exportAttempts: 'Intentos de exportación',
        recentEvents: 'Eventos Recientes',
        
        // Página de Configuración
        language: 'Idioma',
        spanish: 'ES Español',
        english: 'EN English',
        
        // Página de Ayuda
        faq: 'Preguntas frecuentes',
        support: 'Soporte',
        reportProblem: 'Informar de un problema',
        faqAlert: 'Aquí irán las preguntas frecuentes (FAQ).',
        reportAlert: 'Formulario de reporte en construcción.',
        
        // Notificaciones del sistema
        protectionActiveNotif: 'CookieSentinella — Protección activa',
        protectionMessage: 'Sesión segura: cookies blindadas (Secure/HttpOnly/SameSite), bloqueo XSS y alerta por cambios sospechosos.\nLimpieza automática al cerrar sesión.',
        cleanupNotif: 'CookieSentinella — Limpieza completada',
        cleanupMessage: 'Cookies de sesión eliminadas y protección desactivada.',
        cookieTamperingTitle: 'Cookie Tampering Detected',
        cookieTamperingMessage: 'Unauthorized change in MoodleSession cookie',
        fingerprintChangedTitle: 'Device Fingerprint Changed',
        fingerprintChangedMessage: 'Significant changes detected in device fingerprint.',
        xssAttemptTitle: 'XSS Attempt Detected',
        
        // Errores
        errorLoadingStatus: 'Error al cargar estado',
        errorLoadingStats: 'Error al cargar las estadísticas de notificaciones',
        
        // Eventos de notificaciones
        sessionProtected: 'Sesión protegida exitosamente',
        sessionClosed: 'Sesión cerrada y cookies limpiadas',
        
        // Estados de sesión
        success: 'éxito',
        info: 'información',
        warning: 'advertencia',
        error: 'error'
      },
      
      en: {
        // Header
        appName: 'CookieSentinella',
        
        // Main states
        protectionActive: 'Protection active',
        protectionInactive: 'Protection inactive',
        sessionActive: '🟢 Active session',
        sessionInactive: '🔴 Inactive session',
        loadingStatus: 'Loading status...',
        verifyingSession: 'Verifying session...',
        
        // Main buttons
        activateProtection: 'Activate protection',
        deactivateProtection: 'Deactivate protection',
        cleanSession: 'Clean Session',
        cleaning: 'Cleaning...',
        cleanupCompleted: 'Cleanup completed!',
        cleanupError: 'Cleanup error',
        
        // Navigation
        inicio: 'Home',
        notifications: 'Notifications',
        configuration: 'Configuration',
        help: 'Help',
        
        // Notifications Page
        protectedCookies: 'Protected cookies',
        xssAttempts: 'XSS attempts',
        fingerprintChanges: 'Fingerprint changes',
        exportAttempts: 'Export attempts',
        recentEvents: 'Recent Events',
        
        // Configuration Page
        language: 'Language',
        spanish: 'ES Spanish',
        english: 'EN English',
        
        // Help Page
        faq: 'Frequently Asked Questions',
        support: 'Support',
        reportProblem: 'Report a problem',
        faqAlert: 'Frequently Asked Questions (FAQ) will be here.',
        reportAlert: 'Report form under construction.',
        
        // System notifications
        protectionActiveNotif: 'CookieSentinella — Active Protection',
        protectionMessage: 'Secure session: armored cookies (Secure/HttpOnly/SameSite), XSS blocking and suspicious change alerts.\nAutomatic cleanup on logout.',
        cleanupNotif: 'CookieSentinella — Cleanup Completed',
        cleanupMessage: 'Session cookies deleted and protection disabled.',
        cookieTamperingTitle: 'Cookie Tampering Detected',
        cookieTamperingMessage: 'Unauthorized change in MoodleSession cookie',
        fingerprintChangedTitle: 'Device Fingerprint Changed',
        fingerprintChangedMessage: 'Significant changes detected in device fingerprint.',
        xssAttemptTitle: 'XSS Attempt Detected',
        
        // Errors
        errorLoadingStatus: 'Error loading status',
        errorLoadingStats: 'Error loading notification statistics',
        
        // Notification events
        sessionProtected: 'Session successfully protected',
        sessionClosed: 'Session closed and cookies cleaned',
        
        // Session states
        success: 'success',
        info: 'info',
        warning: 'warning',
        error: 'error'
      }
    };
    
    this.init();
  }
  
  async init() {
    // Cargar idioma guardado o detectar idioma del navegador
    const stored = await this.getStoredLanguage();
    if (stored) {
      this.currentLanguage = stored;
    } else {
      // Detectar idioma del navegador
      const browserLang = navigator.language.split('-')[0];
      this.currentLanguage = ['es', 'en'].includes(browserLang) ? browserLang : 'es';
      await this.saveLanguage(this.currentLanguage);
    }
  }
  
  async getStoredLanguage() {
    try {
      const result = await chrome.storage.local.get(['selectedLanguage']);
      return result.selectedLanguage;
    } catch (error) {
      console.error('Error getting stored language:', error);
      return null;
    }
  }
  
  async saveLanguage(lang) {
    try {
      await chrome.storage.local.set({ selectedLanguage: lang });
      this.currentLanguage = lang;
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }
  
  t(key) {
    return this.translations[this.currentLanguage][key] || key;
  }
  
  getCurrentLanguage() {
    return this.currentLanguage;
  }
  
  async setLanguage(lang) {
    if (['es', 'en'].includes(lang)) {
      await this.saveLanguage(lang);
      return true;
    }
    return false;
  }
  
  // Método para traducir elementos del DOM automáticamente
  translatePage() {
    // Traducir elementos con atributo data-i18n
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      if (element.tagName === 'INPUT' && (element.type === 'button' || element.type === 'submit')) {
        element.value = translation;
      } else if (element.placeholder !== undefined) {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });
    
    // Actualizar título de la página si existe
    const titleElement = document.querySelector('title');
    if (titleElement && titleElement.hasAttribute('data-i18n')) {
      const key = titleElement.getAttribute('data-i18n');
      titleElement.textContent = this.t(key);
    }
  }
  
  // Método para obtener todas las traducciones de un idioma
  getAllTranslations(lang = null) {
    const language = lang || this.currentLanguage;
    return this.translations[language] || {};
  }
}

// Instancia global
const i18n = new I18n();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = i18n;
}

// Exportar para uso en extensiones de Chrome
if (typeof window !== 'undefined') {
  window.i18n = i18n;
}

export default i18n;