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

  // Función para animar los números
  function animateCounter(element, targetValue) {
    const duration = 1000; // 1 segundo
    const startValue = parseInt(element.textContent) || 0;
    const increment = (targetValue - startValue) / (duration / 16);
    let currentValue = startValue;

    const animate = () => {
      currentValue += increment;
      if ((increment > 0 && currentValue >= targetValue) || 
          (increment < 0 && currentValue <= targetValue)) {
        element.textContent = targetValue;
        return;
      }
      element.textContent = Math.floor(currentValue);
      requestAnimationFrame(animate);
    };

    animate();
  }

  // Función para cargar y mostrar estadísticas
  async function loadNotificationStats() {
    try {
      // Solicitar estadísticas al background script
      const stats = await chrome.runtime.sendMessage({ action: 'getNotificationStats' });

      // Animar los contadores
      animateCounter(protectedCookiesCount, stats.protectedCookies);
      animateCounter(xssAttemptsCount, stats.xssAttempts);
      animateCounter(fingerprintChangesCount, stats.fingerprintChanges);
      animateCounter(exportAttemptsCount, stats.exportAttempts);

      // Mostrar eventos recientes si los hay
      if (stats.recentEvents && stats.recentEvents.length > 0) {
        displayRecentEvents(stats.recentEvents);
      }

    } catch (error) {
      console.error('Error al cargar las estadísticas de notificaciones:', error);
      
      // Valores por defecto en caso de error
      protectedCookiesCount.textContent = '0';
      xssAttemptsCount.textContent = '0';
      fingerprintChangesCount.textContent = '0';
      exportAttemptsCount.textContent = '0';
    }
  }

  // Función para mostrar eventos recientes
  function displayRecentEvents(events) {
    // Crear contenedor de eventos si no existe
    let eventsContainer = document.getElementById('recentEvents');
    if (!eventsContainer) {
      eventsContainer = document.createElement('div');
      eventsContainer.id = 'recentEvents';
      eventsContainer.className = 'recent-events';
      
      const title = document.createElement('h4');
      title.textContent = 'Eventos Recientes';
      title.style.margin = '24px 0 16px 0';
      title.style.fontSize = '1.2rem';
      title.style.color = '#1f2937';
      
      // Insertar después de las tarjetas principales
      const container = document.querySelector('.popup-container.notification-container');
      container.appendChild(title);
      container.appendChild(eventsContainer);
    }

    // Limpiar eventos anteriores
    eventsContainer.innerHTML = '';

    // Mostrar últimos 5 eventos
    events.slice(0, 5).forEach(event => {
      const eventCard = document.createElement('div');
      eventCard.className = 'event-card';
      
      const eventTime = new Date(event.timestamp).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      let iconClass = 'blue';
      let icon = '📋';
      
      switch (event.type) {
        case 'session_protected':
          iconClass = 'green';
          icon = '🛡️';
          break;
        case 'session_cleanup':
          iconClass = 'yellow';
          icon = '🧹';
          break;
        case 'xss_attempt':
          iconClass = 'red';
          icon = '🚨';
          break;
        case 'fingerprint_change':
          iconClass = 'blue';
          icon = '🔍';
          break;
      }

      eventCard.innerHTML = `
        <div class="notification-icon small ${iconClass}">${icon}</div>
        <div class="event-text">
          <span class="event-message">${event.message}</span>
          <span class="event-time">${eventTime}</span>
        </div>
      `;

      eventsContainer.appendChild(eventCard);
    });
  }

  // Cargar estadísticas iniciales
  await loadNotificationStats();

  // Actualizar estadísticas cada 10 segundos
  setInterval(loadNotificationStats, 10000);

  // Escuchar mensajes del background script para actualizaciones en tiempo real
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'stats_updated') {
      loadNotificationStats();
    }
  });
});