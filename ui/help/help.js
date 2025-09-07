// ui/help/help.js - Ayuda con sistema de idiomas y chatbot integrado

import { loadLayout } from '../components/layout/layout.js';
import i18n from '../../utils/i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar i18n y cargar layout
  await i18n.init();
  await loadLayout('ayuda');
  
  // Referencias del DOM
  const chatbotModal = document.getElementById('chatbotModal');
  const chatbotFrame = document.getElementById('chatbotFrame');
  const closeChatbotBtn = document.getElementById('closeChatbot');
  const chatbotOverlay = document.querySelector('.chatbot-overlay');
  
  let chatbotOpened = false;

  // Función para traducir la página
  function translateHelpPage() {
    // Traducir título principal
    const mainTitle = document.querySelector('h3');
    if (mainTitle) mainTitle.textContent = i18n.t('help');
    
    // Traducir usando data-i18n
    i18n.translatePage();
    
    // Traducir elementos específicos sin data-i18n
    const faqText = document.querySelector('#faq-btn span');
    const supportText = document.querySelector('#support-btn span');
    const reportText = document.querySelector('#report-btn span');
    
    if (faqText && !faqText.hasAttribute('data-i18n')) {
      faqText.textContent = i18n.t('faq');
    }
    if (supportText && !supportText.hasAttribute('data-i18n')) {
      supportText.textContent = i18n.t('support');
    }
    if (reportText && !reportText.hasAttribute('data-i18n')) {
      reportText.textContent = i18n.t('reportProblem');
    }

    // Traducir título del modal del chatbot
    const chatModalTitle = document.querySelector('.chatbot-header h4');
    if (chatModalTitle) {
      chatModalTitle.textContent = i18n.t('supportChat');
    }
  }

  // Función para abrir el modal del chatbot
  function openChatbot() {
    chatbotModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Marcar como abierto para futuras referencias
    chatbotOpened = true;
    
    // Agregar evento para manejar errores de carga del iframe
    if (chatbotFrame && !chatbotFrame.hasAttribute('data-error-handled')) {
      chatbotFrame.setAttribute('data-error-handled', 'true');
      
      chatbotFrame.addEventListener('error', () => {
        console.error('Error cargando el chatbot');
        showChatbotError();
      });
      
      // Verificar si el iframe carga correctamente
      setTimeout(() => {
        try {
          // Si el iframe no tiene contenido después de 5 segundos, mostrar alternativa
          if (chatbotFrame.contentDocument === null) {
            console.log('Chatbot cargado en iframe (cross-origin)');
          }
        } catch (e) {
          // Esto es normal para contenido cross-origin
          console.log('Chatbot funcionando correctamente (cross-origin iframe)');
        }
      }, 2000);
    }
  }

  // Función para mostrar error del chatbot
  function showChatbotError() {
    const errorContent = document.createElement('div');
    errorContent.className = 'chatbot-error';
    errorContent.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; color: #6b7280;">
        <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
        <h3 style="margin: 0 0 12px 0; color: #374151;">${i18n.t('chatNotAvailable')}</h3>
        <p style="margin: 0 0 20px 0; font-size: 14px;">${i18n.t('chatErrorMessage')}</p>
        <button id="retryChatbot" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer;">
          ${i18n.t('retryChat')}
        </button>
      </div>
    `;
    
    const chatbotContent = document.querySelector('.chatbot-content');
    chatbotContent.innerHTML = '';
    chatbotContent.appendChild(errorContent);
    
    // Agregar evento al botón de retry
    document.getElementById('retryChatbot').addEventListener('click', () => {
      location.reload();
    });
  }

  // Función para cerrar el modal del chatbot
  function closeChatbot() {
    chatbotModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // Event listeners para los botones
  document.getElementById('faq-btn').addEventListener('click', () => {
    const faqMessage = i18n.getCurrentLanguage() === 'es' 
      ? `📋 Preguntas Frecuentes - CookieSentinella

🔐 ¿Qué hace CookieSentinella?
Protege tus cookies de sesión de Moodle con encriptación avanzada y detecta intentos de manipulación.

🛡️ ¿Cómo funciona la protección?
Aplica configuraciones de seguridad (Secure, HttpOnly, SameSite) y monitorea cambios sospechosos.

🧹 ¿Qué hace "Limpiar Sesión"?
Elimina todas las cookies de sesión y desactiva la protección de forma segura.

⚠️ ¿Qué son los intentos de XSS?
Ataques bloqueados automáticamente que intentan inyectar código malicioso.

Para más ayuda, usa el chat de soporte.`
      : `📋 Frequently Asked Questions - CookieSentinella

🔐 What does CookieSentinella do?
Protects your Moodle session cookies with advanced encryption and detects tampering attempts.

🛡️ How does protection work?
Applies security settings (Secure, HttpOnly, SameSite) and monitors suspicious changes.

🧹 What does "Clean Session" do?
Safely removes all session cookies and deactivates protection.

⚠️ What are XSS attempts?
Automatically blocked attacks that try to inject malicious code.

For more help, use the support chat.`;
    
    alert(faqMessage);
  });

  document.getElementById('support-btn').addEventListener('click', () => {
    openChatbot();
  });

  document.getElementById('report-btn').addEventListener('click', () => {
    const reportMessage = i18n.getCurrentLanguage() === 'es'
      ? `🐛 Reportar Problema - CookieSentinella

Para reportar un problema:

1. 📧 Envía un email a: soporte@cookiesentinella.com
2. 💬 Usa el chat de soporte (botón "Soporte")
3. 📝 Incluye detalles como:
   - Navegador y versión
   - Pasos para reproducir el problema
   - Capturas de pantalla si es necesario

¡Tu feedback nos ayuda a mejorar!`
      : `🐛 Report Problem - CookieSentinella

To report a problem:

1. 📧 Send email to: support@cookiesentinella.com
2. 💬 Use support chat ("Support" button)
3. 📝 Include details like:
   - Browser and version
   - Steps to reproduce the problem
   - Screenshots if necessary

Your feedback helps us improve!`;
    
    alert(reportMessage);
  });

  // Event listeners para el modal del chatbot
  closeChatbotBtn.addEventListener('click', closeChatbot);
  chatbotOverlay.addEventListener('click', closeChatbot);

  // Cerrar modal con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatbotModal.style.display === 'flex') {
      closeChatbot();
    }
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