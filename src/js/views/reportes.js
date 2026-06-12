import { productoService, movimientoService } from '../services/base.js'
import { getVariantesByProducto, getStockByVariante } from '../services/base.js'
import { createBackup, restoreFromBackup } from '../services/backup-service.js'
import { flashMessage } from '../../partials/modals.js'

export async function renderReportes(params, container) {
  let stats = { productos: 0, stock: 0, movimientosHoy: 0 }

  try {
    const [prods, movs] = await Promise.all([
      productoService.getAll(),
      movimientoService.getAll()
    ])
    stats.productos = prods.length

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

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    stats.movimientosHoy = movs.filter(m => {
      const fecha = m.createdAt?.toDate?.()
      return fecha && fecha >= hoy
    }).length
  } catch (err) {
    console.error('Error cargando reportes:', err)
  }

  container.innerHTML = `
    <div data-aos="fade-up">
      <header class="mb-6" data-aos="fade-down">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-white">Reportes</h1>
            <p class="text-dark-300 text-sm mt-1">Estadísticas y backups</p>
          </div>
          <button id="btn-seed" class="btn-secondary">
            <i class="ph ph-database mr-1"></i> Cargar Datos Iniciales
          </button>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6" data-aos="fade-up">
        <div class="card">
          <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
            <i class="ph ph-cloud-arrow-up text-primary"></i>
            Autoguardado
          </h3>
          <div class="text-dark-300 text-sm mb-4" id="backup-status">
            <i class="ph ph-clock mr-1"></i> Último backup: <span class="text-dark-400">Sin datos</span>
          </div>
          <div class="flex gap-3 flex-wrap">
            <button id="btn-backup" class="btn-primary">
              <i class="ph ph-floppy-disk mr-1"></i> Guardar Ahora
            </button>
            <div class="flex-1"></div>
            <label class="btn-secondary cursor-pointer">
              <i class="ph ph-upload mr-1"></i> Restaurar desde Archivo
              <input type="file" id="restore-file" accept=".json" class="hidden">
            </label>
          </div>
        </div>

        <div class="card">
          <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
            <i class="ph ph-chart-pie-slice text-accent-orange"></i>
            Resumen
          </h3>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between text-dark-300">
              <span>Total productos</span>
              <span class="text-white font-medium">${stats.productos}</span>
            </div>
            <div class="flex justify-between text-dark-300">
              <span>Unidades en stock</span>
              <span class="text-white font-medium">${stats.stock}</span>
            </div>
            <div class="flex justify-between text-dark-300">
              <span>Movimientos hoy</span>
              <span class="text-white font-medium">${stats.movimientosHoy}</span>
            </div>
            <div class="border-t border-dark-600 pt-3 mt-3">
              <div class="flex justify-between text-dark-300">
                <span>Estado del sistema</span>
                <span class="badge-green"><i class="ph ph-check-circle mr-1"></i>Operativo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card" data-aos="fade-up">
        <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
          <i class="ph ph-info text-primary"></i>
          Información del Sistema
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-dark-700 rounded-lg p-4 text-center">
            <p class="text-2xl font-bold text-primary">${stats.productos}</p>
            <p class="text-dark-400 text-xs mt-1">Productos</p>
          </div>
          <div class="bg-dark-700 rounded-lg p-4 text-center">
            <p class="text-2xl font-bold text-accent-green">${stats.stock}</p>
            <p class="text-dark-400 text-xs mt-1">Unidades Stock</p>
          </div>
          <div class="bg-dark-700 rounded-lg p-4 text-center">
            <p class="text-2xl font-bold text-accent-orange">${stats.movimientosHoy}</p>
            <p class="text-dark-400 text-xs mt-1">Mov. hoy</p>
          </div>
          <div class="bg-dark-700 rounded-lg p-4 text-center">
            <p class="text-2xl font-bold text-accent-yellow">0</p>
            <p class="text-dark-400 text-xs mt-1">Alertas</p>
          </div>
        </div>
      </div>
    </div>
  `

  bindEvents()
  if (window.AOS) window.AOS.refresh()
}

function bindEvents() {
  document.getElementById('btn-backup')?.addEventListener('click', async () => {
    try {
      const result = await createBackup()
      flashMessage('Backup creado y descargado correctamente', 'success')
    } catch (err) {
      flashMessage('Error al crear backup: ' + err.message, 'error')
    }
  })

  document.getElementById('restore-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const { confirmModal } = await import('../../partials/modals.js')
    const confirmed = await confirmModal('¿Restaurar desde este archivo? Esto sobreescribirá los datos existentes.')
    if (!confirmed) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await restoreFromBackup(data)
      flashMessage('Datos restaurados correctamente', 'success')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      flashMessage('Error al restaurar: ' + err.message, 'error')
    }
  })

  document.getElementById('btn-seed')?.addEventListener('click', async () => {
    const { confirmModal } = await import('../../partials/modals.js')
    const { runSeed } = await import('../services/seed-service.js')
    const confirmed = await confirmModal('¿Cargar datos iniciales? Esto creará almacenes, etiquetas y categorías de ejemplo.')
    if (!confirmed) return

    try {
      const result = await runSeed()
      flashMessage(`Datos iniciales cargados: ${result.almacenes} almacenes, ${result.etiquetas} etiquetas, ${result.etiquetaFechas} fechas, ${result.categoriasProducto} categorías`, 'success')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      flashMessage('Error al cargar datos: ' + err.message, 'error')
    }
  })
}