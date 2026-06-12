import { productoService, movimientoService, categoriaProductoService, almacenService } from '../services/base.js'
import { getVariantesByProducto, getStockByVariante } from '../services/base.js'
import { isFirebaseReady } from '../firebase.js'

export async function renderDashboard(params, container) {
  let stats = { productos: 0, stock: 0, movimientos: 0, categorias: 0 }
  let movimientosRecientes = []

  if (isFirebaseReady) {
    try {
      const [prods, movs, cats] = await Promise.all([
        productoService.getAll(),
        movimientoService.getAll(),
        categoriaProductoService.getAll()
      ])
      stats.productos = prods.length
      stats.movimientos = movs.length
      stats.categorias = cats.length

      let totalStock = 0
      for (const producto of prods) {
        const variantes = await getVariantesByProducto(producto.id)
        for (const variante of variantes) {
          const stockDocs = await getStockByVariante(producto.id, variante.id)
          for (const s of stockDocs) {
            totalStock += (s.cantidad || 0)
          }
        }
      }
      stats.stock = totalStock

      movimientosRecientes = movs
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0)
          const dateB = b.createdAt?.toDate?.() || new Date(0)
          return dateB - dateA
        })
        .slice(0, 8)
    } catch (err) {
      console.error('Error cargando dashboard:', err)
    }
  }

  const firebaseWarning = !isFirebaseReady ? `
    <div class="mb-6 p-4 rounded-lg border border-accent-orange/30 bg-accent-orange/10 text-accent-orange text-sm flex items-center gap-3" data-aos="fade-down">
      <i class="ph ph-warning-circle text-2xl"></i>
      <div>
        <p class="font-semibold">Firebase no configurado</p>
        <p class="text-accent-orange/80 mt-1">Agrega las credenciales de tu proyecto Firebase en el archivo <code>.env</code> para ver datos reales. Ver <code>.env.example</code> para más información.</p>
      </div>
    </div>
  ` : ''

  container.innerHTML = `
    ${firebaseWarning}
    <div data-aos="fade-up">
      <header class="mb-6" data-aos="fade-down">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-white">Dashboard</h1>
            <p class="text-dark-300 text-sm mt-1">Resumen general del inventario</p>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        ${renderStatCard('ph-package', 'Productos', stats.productos, 'Total productos registrados', 'primary')}
        ${renderStatCard('ph-warehouse', 'Stock Total', stats.stock, 'Unidades en almacén', 'accent-green')}
        ${renderStatCard('ph-arrows-left-right', 'Movimientos', stats.movimientos, 'Entradas y salidas', 'accent-orange')}
        ${renderStatCard('ph-folder', 'Categorías', stats.categorias, 'Categorías activas', 'accent-yellow')}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div class="lg:col-span-2 bg-dark-800 border border-dark-600 rounded-xl p-5">
          <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
            <i class="ph ph-trend-up text-primary"></i>
            Actividad Reciente
          </h3>
          ${movimientosRecientes.length === 0 ? `
            <div class="text-dark-400 text-sm text-center py-8">
              <i class="ph ph-chart-line-up text-4xl mb-2 block"></i>
              Los movimientos aparecerán aquí
            </div>
          ` : `
            <div class="space-y-2">
              ${movimientosRecientes.map(m => {
                const isEntrada = m.tipo === 'entrada'
                const fecha = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
                return `
                <div class="flex items-center gap-3 p-3 rounded-lg bg-dark-700/50">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isEntrada ? 'bg-accent-green/15' : 'bg-accent-red/15'}">
                    <i class="ph ${isEntrada ? 'ph-arrow-square-in text-accent-green' : 'ph-arrow-square-out text-accent-red'} text-sm"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-white text-sm font-medium truncate">${isEntrada ? 'Entrada' : 'Salida'} de ${m.cantidad || 0} u.</p>
                    <p class="text-dark-400 text-xs">${fecha}</p>
                  </div>
                  <span class="${isEntrada ? 'badge-green' : 'badge-red'} text-xs">${isEntrada ? '+' : '-'}${m.cantidad || 0}</span>
                </div>
              `}).join('')}
            </div>
          `}
        </div>
        
        <div class="bg-dark-800 border border-dark-600 rounded-xl p-5">
          <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
            <i class="ph ph-lightning text-accent-yellow"></i>
            Acciones Rápidas
          </h3>
          <div class="space-y-3">
            <a href="#/movimientos/entrada/nuevo" class="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent-green/10 border border-accent-green/20 hover:bg-accent-green/20 transition-colors group">
              <i class="ph ph-file-pdf text-accent-green text-lg"></i>
              <span class="text-dark-200 group-hover:text-white text-sm font-medium">Entrada PDF</span>
            </a>
            <a href="#/movimientos/salida/nuevo" class="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent-red/10 border border-accent-red/20 hover:bg-accent-red/20 transition-colors group">
              <i class="ph ph-arrow-square-out text-accent-red text-lg"></i>
              <span class="text-dark-200 group-hover:text-white text-sm font-medium">Nueva Salida</span>
            </a>

            <a href="#/productos/nuevo" class="flex items-center gap-3 px-4 py-3 rounded-lg bg-dark-600/50 border border-dark-500/30 hover:bg-dark-600 transition-colors group">
              <i class="ph ph-plus-circle text-dark-300 text-lg"></i>
              <span class="text-dark-200 group-hover:text-white text-sm font-medium">Nuevo Producto</span>
            </a>
          </div>
        </div>
      </div>

      <div class="bg-dark-800 border border-dark-600 rounded-xl p-5">
        <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
          <i class="ph ph-cloud-arrow-up text-primary"></i>
          Autoguardado
        </h3>
        <div class="flex items-center justify-between">
          <div class="text-dark-300 text-sm">
            <i class="ph ph-clock mr-1"></i>
            Último backup: <span class="text-dark-400">Sin datos</span>
          </div>
          <div class="flex gap-3">
            <button id="btn-backup-now" class="px-4 py-2 bg-primary/15 text-primary rounded-lg text-sm font-medium hover:bg-primary/25 transition-colors">
              <i class="ph ph-floppy-disk mr-1"></i> Guardar Ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  `

  document.getElementById('btn-backup-now')?.addEventListener('click', async () => {
    const { createBackup } = await import('../services/backup-service.js')
    try {
      const result = await createBackup()
      const { flashMessage } = await import('../../partials/modals.js')
      flashMessage('Backup creado correctamente', 'success')
    } catch (err) {
      const { flashMessage } = await import('../../partials/modals.js')
      flashMessage('Error al crear backup: ' + err.message, 'error')
    }
  })

  if (window.AOS) window.AOS.refresh()
}

function renderStatCard(icon, title, value, subtitle, color) {
  const colorMap = {
    primary: { bg: 'bg-primary/15', border: 'border-primary/30', text: 'text-primary' },
    'accent-green': { bg: 'bg-accent-green/15', border: 'border-accent-green/30', text: 'text-accent-green' },
    'accent-orange': { bg: 'bg-accent-orange/15', border: 'border-accent-orange/30', text: 'text-accent-orange' },
    'accent-yellow': { bg: 'bg-accent-yellow/15', border: 'border-accent-yellow/30', text: 'text-accent-yellow' },
  }
  const c = colorMap[color] || colorMap.primary

  return `
    <div class="${c.bg} border ${c.border} rounded-xl p-5 hover:scale-[1.02] transition-transform duration-200">
      <div class="flex items-center justify-between mb-3">
        <i class="ph ${icon} ${c.text} text-2xl"></i>
      </div>
      <p class="text-2xl font-bold text-white">${value}</p>
      <p class="text-sm text-dark-300 mt-1">${title}</p>
      <p class="text-xs text-dark-400 mt-1">${subtitle}</p>
    </div>
  `
}