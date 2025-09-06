// layout.js
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

    // Activar navegación una vez cargado
    import('../shared/navigation.js').then(({ default: Navigation }) => {
      new Navigation(activePage);
    });
  } catch (err) {
    console.error('Error cargando layout:', err);
  }
}
