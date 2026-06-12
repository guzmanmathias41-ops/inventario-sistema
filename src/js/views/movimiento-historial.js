import { movimientoService, productoService, almacenService } from '../services/base.js'
import { getVariantesByProducto } from '../services/base.js'
import { getHistorialMovimientos, vaciarHistorial } from '../services/movimiento-service.js'
import { flashMessage, confirmModal } from '../../partials/modals.js'
import { formatDateTime } from '../utils/helpers.js'

export async function renderMovimientoHistorial(params, container) {
  let movimientos = []
  let productos = []
  let almacenes = []
  let varianteCache = {}
  let filtroTipo = ''

  async function loadData() {
    try {
      const [movs, prods, alms] = await Promise.all([
        getHistorialMovimientos(100),
        productoService.getAll(),
        almacenService.getAll()
      ])
      movimientos = movs
      productos = prods
      almacenes = alms

      for (const m of movimientos) {
        if (m.productoId && !varianteCache[m.varianteId]) {
          try {
            const vars = await getVariantesByProducto(m.productoId)
            for (const v of vars) {
              varianteCache[v.id] = v
            }
          } catch (e) { /* ignore */ }
        }
      }
    } catch (err) {
      console.error('Error cargando historial:', err)
      movimientos = []
    }
  }

  function getProductoNombre(movimiento) {
    if (movimiento.productoId) {
      const p = productos.find(p => p.id === movimiento.productoId)
      if (p) return p.nombre
    }
    const v = varianteCache[movimiento.varianteId]
    if (v) {
      const p = productos.find(p => p.id === v.productoId)
      return p ? p.nombre : '—'
    }
    return '—'
  }

  function getVarianteInfo(varianteId) {
    const v = varianteCache[varianteId]
    if (!v) return { talla: '—', color: '' }
    return { talla: v.talla || 'GENERAL', color: v.color || '' }
  }

  function getAlmacenNombre(almacenId) {
    const a = almacenes.find(a => a.id === almacenId)
    return a ? a.nombre : '—'
  }

  async function render() {
    await loadData()

    let filtered = movimientos
    if (filtroTipo) {
      filtered = filtered.filter(m => m.tipo === filtroTipo)
    }

    container.innerHTML = `
      <div data-aos="fade-up">
        <header class="mb-6" data-aos="fade-down">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Historial de Movimientos</h1>
              <p class="text-dark-300 text-sm mt-1">Registro de entradas y salidas</p>
            </div>
            <div class="flex gap-3">
              <a href="#/movimientos" class="btn-secondary">
                <i class="ph ph-arrow-left"></i> Volver
              </a>
              <button id="btn-vaciar" class="btn-danger">
                <i class="ph ph-trash"></i> Vaciar Historial
              </button>
            </div>
          </div>
        </header>

        <div class="filter-bar" data-aos="fade-up">
          <select id="filtro-tipo" class="select w-48">
            <option value="">Todos los tipos</option>
            <option value="entrada" ${filtroTipo === 'entrada' ? 'selected' : ''}>Entrada</option>
            <option value="salida" ${filtroTipo === 'salida' ? 'selected' : ''}>Salida</option>
          </select>
          <div class="flex-1"></div>
          <span class="text-dark-400 text-sm">${filtered.length} movimiento${filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="table-container" data-aos="fade-up">
          ${filtered.length === 0 ? `
            <div class="p-12 text-center text-dark-400">
              <i class="ph ph-clock-counter-clockwise text-5xl mb-3 block"></i>
              <p class="text-lg">No hay movimientos registrados</p>
              <p class="text-sm mt-1">Los movimientos aparecerán aquí al registrar entradas o salidas</p>
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-dark-600">
                    <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Fecha</th>
                    <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Tipo</th>
                    <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Producto</th>
                    <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Variante</th>
                    <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Almacén</th>
                    <th class="text-right px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map(m => {
                    const nombre = getProductoNombre(m)
                    const info = getVarianteInfo(m.varianteId)
                    const almacen = getAlmacenNombre(m.almacenId)
                    const fecha = m.createdAt?.toDate ? formatDateTime(m.createdAt.toDate()) : '—'
                    const isEntrada = m.tipo === 'entrada'
                    return `
                    <tr class="table-row">
                      <td class="px-5 py-3 text-dark-300 text-sm">${fecha}</td>
                      <td class="px-5 py-3">
                        <span class="${isEntrada ? 'badge-green' : 'badge-red'}">
                          <i class="ph ${isEntrada ? 'ph-arrow-square-in' : 'ph-arrow-square-out'} mr-1"></i>
                          ${isEntrada ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td class="px-5 py-3 text-white font-medium">${nombre}</td>
                      <td class="px-5 py-3 text-dark-200 text-sm">${info.talla}${info.color ? ' / ' + info.color : ''}</td>
                      <td class="px-5 py-3 text-dark-300 text-sm">${almacen}</td>
                      <td class="px-5 py-3 text-right font-medium ${isEntrada ? 'text-accent-green' : 'text-accent-red'}">${m.cantidad}</td>
                    </tr>
                  `}).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `

    bindEvents()
    if (window.AOS) window.AOS.refresh()
  }

  function bindEvents() {
    document.getElementById('filtro-tipo')?.addEventListener('change', (e) => {
      filtroTipo = e.target.value
      render()
    })

    document.getElementById('btn-vaciar')?.addEventListener('click', async () => {
      const confirmed = await confirmModal('¿Estás seguro de vaciar todo el historial de movimientos? Esta acción no se puede deshacer.')
      if (!confirmed) return
      try {
        const count = await vaciarHistorial()
        flashMessage(`Historial vaciado (${count} movimientos eliminados)`, 'success')
        render()
      } catch (err) {
        flashMessage('Error al vaciar historial: ' + err.message, 'error')
      }
    })
  }

  await render()
}