// ui/notification/notification.js
import { loadLayout } from '../components/layout/layout.js';
loadLayout('Ayuda');


document.getElementById('faq-btn').addEventListener('click', () => {
  alert('Aquí irán las preguntas frecuentes (FAQ).');
});

document.getElementById('support-btn').addEventListener('click', () => {
  window.open('mailto:soporte@cookiesentinella.com', '_blank');
});

document.getElementById('report-btn').addEventListener('click', () => {
  alert('Formulario de reporte en construcción.');
});
