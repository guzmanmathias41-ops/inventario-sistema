import './style.css'
import AOS from 'aos'
import 'aos/dist/aos.css'

import { startRouter, addRoute, getCurrentPath } from './src/js/router.js'
import { renderSidebar, initSidebarToggle } from './src/partials/sidebar.js'
import { renderDashboard } from './src/js/views/dashboard.js'
import { isFirebaseReady } from './src/js/firebase.js'

function updateSidebarActive() {
  const path = getCurrentPath()
  const sidebarEl = document.getElementById('sidebar-container')
  if (sidebarEl) {
    sidebarEl.innerHTML = renderSidebar(path)
    initSidebarToggle()
  }
}

function initApp() {
  AOS.init({
    duration: 600,
    once: true,
    easing: 'ease-out-cubic',
  })

  const sidebarContainer = document.getElementById('sidebar-container')
  if (sidebarContainer) {
    sidebarContainer.innerHTML = renderSidebar('/')
    initSidebarToggle()
  }

  if (isFirebaseReady) {
    import('./src/js/utils/autoTags.js').then(m => m.autoUpdateNuevoTags()).catch(err => console.log('Auto-tags skipped:', err.message))
  }

  addRoute('/', renderDashboard)

  addRoute('/stock', async (params, container) => {
    const { renderStock } = await import('./src/js/views/stock.js')
    await renderStock(params, container)
  })

  addRoute('/productos', async (params, container) => {
    const { renderProductos } = await import('./src/js/views/productos.js')
    await renderProductos(params, container)
  })

  addRoute('/productos/nuevo', async (params, container) => {
    const { renderProductoForm } = await import('./src/js/views/producto-form.js')
    await renderProductoForm(params, container)
  })

  addRoute('/productos/editar/:id', async (params, container) => {
    const { renderProductoForm } = await import('./src/js/views/producto-form.js')
    await renderProductoForm(params, container)
  })

  addRoute('/movimientos', async (params, container) => {
    const { renderMovimientos } = await import('./src/js/views/movimientos.js')
    await renderMovimientos(params, container)
  })

  addRoute('/movimientos/entrada/nuevo', async (params, container) => {
    const { renderMovimientoPdf } = await import('./src/js/views/movimiento-pdf.js')
    await renderMovimientoPdf(params, container)
  })

  addRoute('/movimientos/salida/nuevo', async (params, container) => {
    const { renderMovimientoSalida } = await import('./src/js/views/movimiento-salida.js')
    await renderMovimientoSalida(params, container)
  })

  addRoute('/movimientos/pdf', async (params, container) => {
    const { renderMovimientoPdf } = await import('./src/js/views/movimiento-pdf.js')
    await renderMovimientoPdf(params, container)
  })

  addRoute('/movimientos/historial', async (params, container) => {
    const { renderMovimientoHistorial } = await import('./src/js/views/movimiento-historial.js')
    await renderMovimientoHistorial(params, container)
  })

  addRoute('/categorias', async (params, container) => {
    const { renderCategorias } = await import('./src/js/views/categorias.js')
    await renderCategorias(params, container)
  })

  addRoute('/categorias/producto', async (params, container) => {
    const { renderCategoriasProducto } = await import('./src/js/views/categorias-producto.js')
    await renderCategoriasProducto(params, container)
  })

  addRoute('/categorias/salida', async (params, container) => {
    const { renderCategoriasSalida } = await import('./src/js/views/categorias-salida.js')
    await renderCategoriasSalida(params, container)
  })

  addRoute('/etiquetas-producto', async (params, container) => {
    const { renderEtiquetasProducto } = await import('./src/js/views/etiquetas-producto.js')
    await renderEtiquetasProducto(params, container)
  })

  addRoute('/fechas-registro', async (params, container) => {
    const { renderFechasRegistro } = await import('./src/js/views/fechas-registro.js')
    await renderFechasRegistro(params, container)
  })

  addRoute('/reportes', async (params, container) => {
    const { renderReportes } = await import('./src/js/views/reportes.js')
    await renderReportes(params, container)
  })

  window.addEventListener('hashchange', updateSidebarActive)
  startRouter()
  updateSidebarActive()
}

document.addEventListener('DOMContentLoaded', initApp)