import { productoService, almacenService, categoriaProductoService, etiquetaFechaService } from '../services/base.js'
import { getVariantesByProducto, getStockByVariante, getProductoCategorias, getProductoEtiquetaFechas } from '../services/base.js'
import { flashMessage } from '../../partials/modals.js'
import { isFirebaseReady } from '../firebase.js'
import { ESTADOS_STOCK } from '../models/schema.js'
import { getEstadoBadge } from '../utils/helpers.js'

export async function renderStock(params, container) {
  let stockItems = []
  let productos = []
  let almacenes = []
  let categorias = []
  let etiquetaFechas = []
  let filtroCategoria = ''
  let filtroEstado = ''
  let filtroMes = ''
  let searchTerm = ''

  async function loadData() {
    if (!isFirebaseReady) return
    try {
      const [prodRes, almRes, catsRes, fecRes] = await Promise.all([
        productoService.getAll(),
        almacenService.getAll(),
        categoriaProductoService.getAll(),
        etiquetaFechaService.getAll(),
      ])
      productos = prodRes
      almacenes = almRes
      categorias = catsRes
      etiquetaFechas = fecRes

      stockItems = []
      for (const producto of productos) {
        const variantes = await getVariantesByProducto(producto.id)
        const prodCats = await getProductoCategorias(producto.id)
        const prodFechas = await getProductoEtiquetaFechas(producto.id)
        for (const variante of variantes) {
          const stockDocs = await getStockByVariante(producto.id, variante.id)
          for (const s of stockDocs) {
            stockItems.push({
              ...s,
              productoId: producto.id,
              productoNombre: producto.nombre,
              varianteId: variante.id,
              talla: variante.talla,
              color: variante.color || '',
              categorias: prodCats,
              fechas: prodFechas,
            })
          }
        }
      }
    } catch (err) {
      console.error('Error cargando stock:', err)
    }
  }

  function getProductoCats(productoId) {
    const item = stockItems.find(s => s.productoId === productoId)
    if (!item || !item.categorias) return []
    return item.categorias
      .map(pc => {
        const cat = categorias.find(c => c.id === pc.categoriaId)
        return cat ? cat.nombre : ''
      })
      .filter(Boolean)
  }

  function getFechasBadge(productoId) {
    const item = stockItems.find(s => s.productoId === productoId)
    if (!item || !item.fechas) return ''
    return item.fechas.map(pf => {
      const ef = etiquetaFechas.find(e => e.id === pf.etiquetaFechaId)
      if (!ef) return ''
      return `<span class="badge-yellow text-[10px]"><i class="ph ph-calendar mr-0.5"></i>${ef.nombre}${ef.fecha ? ' ' + ef.fecha : ''}</span>`
    }).join(' ')
  }

  async function render() {
    await loadData()

    let filtered = stockItems
    if (filtroEstado) {
      filtered = filtered.filter(s => s.estado === filtroEstado)
    }
    if (filtroCategoria) {
      filtered = filtered.filter(s => {
        const cats = s.categorias || []
        return cats.some(c => c.categoriaId === filtroCategoria)
      })
    }
    if (filtroMes) {
      filtered = filtered.filter(s => {
        const fechas = s.fechas || []
        return fechas.some(pf => {
          const ef = etiquetaFechas.find(e => e.id === pf.etiquetaFechaId)
          return ef && ef.fecha && ef.fecha.startsWith(filtroMes)
        })
      })
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(s => {
        return s.productoNombre.toLowerCase().includes(term) || (s.color || '').toLowerCase().includes(term)
      })
    }

    const estadoCounts = {}
    stockItems.forEach(s => {
      const estado = s.estado || 'disponible'
      estadoCounts[estado] = (estadoCounts[estado] || 0) + (s.cantidad || 0)
    })

    const firebaseWarning = !isFirebaseReady ? `
      <div class="mb-4 p-4 rounded-lg border border-accent-orange/30 bg-accent-orange/10 text-accent-orange text-sm flex items-center gap-2">
        <i class="ph ph-warning text-lg"></i>
        <span>Firebase no configurado. Agrega las credenciales en <code>.env</code> para ver datos reales.</span>
      </div>
    ` : ''

    container.innerHTML = `
      ${firebaseWarning}
      <div data-aos="fade-up">
        <header class="mb-6" data-aos="fade-down">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Stock</h1>
              <p class="text-dark-300 text-sm mt-1">Inventario por almacén</p>
            </div>
          </div>
        </header>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5" data-aos="fade-up">
          ${ESTADOS_STOCK.map(e => `
            <button data-filtro-estado="${e.value}" class="text-left p-3 rounded-lg border transition-all cursor-pointer
              ${filtroEstado === e.value 
                ? `bg-accent-${e.color === 'green' ? 'green' : e.color === 'red' ? 'red' : 'orange'}/15 border-accent-${e.color === 'green' ? 'green' : e.color === 'red' ? 'red' : 'orange'}/40 text-accent-${e.color === 'green' ? 'green' : e.color === 'red' ? 'red' : 'orange'}`
                : 'bg-dark-800 border-dark-600 text-dark-300 hover:border-dark-500'}">
              <p class="text-xs opacity-70">${e.label}</p>
              <p class="text-xl font-bold">${estadoCounts[e.value] || 0}</p>
            </button>
          `).join('')}
        </div>

        <div class="filter-bar" data-aos="fade-up">
          <input type="text" id="buscar-stock" placeholder="Buscar producto o color..." class="input w-64" value="${searchTerm}">
          <select id="filtro-categoria" class="select w-48">
            <option value="">Todas las categorías</option>
            ${categorias.map(c => `
              <option value="${c.id}" ${filtroCategoria === c.id ? 'selected' : ''}>${c.nombre}</option>
            `).join('')}
          </select>
          <div class="relative inline-block">
            <button id="btn-calendario" class="btn-secondary">
              <i class="ph ph-calendar-dots mr-1"></i> Fechas
            </button>
            <div id="calendario-popup" class="absolute top-full left-0 mt-2 bg-dark-800 border border-dark-600 rounded-xl p-4 shadow-2xl z-50 hidden" style="min-width: 220px;">
              <label class="block text-sm text-dark-300 mb-2">Filtrar por mes</label>
              <input type="month" id="filtro-mes-input" class="input w-full" value="${filtroMes}">
              <div class="flex gap-2 mt-3">
                <button id="btn-aplicar-mes" class="btn-primary text-sm flex-1">Aplicar</button>
                <button id="btn-limpiar-mes" class="btn-secondary text-sm flex-1">Limpiar</button>
              </div>
            </div>
          </div>
          <div class="flex-1"></div>
          <button id="btn-limpiar-filtros" class="btn-secondary text-sm">
            <i class="ph ph-x mr-1"></i> Limpiar
          </button>
        </div>

        <div class="table-container" data-aos="fade-up">
          ${filtered.length === 0 ? `
            <div class="p-12 text-center text-dark-400">
              <i class="ph ph-package text-5xl mb-3 block"></i>
              <p class="text-lg">${!isFirebaseReady ? 'Conecta Firebase para ver datos' : 'No hay unidades en stock'}</p>
              <p class="text-sm mt-1">${!isFirebaseReady ? 'Agrega las credenciales en el archivo .env' : 'Los productos aparecerán aquí al registrar entradas'}</p>
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-dark-600">
                    <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase">Producto</th>
                    <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase">Talla</th>
                    <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase">Color</th>
                    <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase">Categorías</th>
                    <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase">Almacén</th>
                    <th class="text-right px-5 py-3 text-xs font-semibold text-dark-400 uppercase">Cantidad</th>
                    <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase">Estado</th>
                    <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase">Fechas</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map(s => {
                    const cats = (s.categorias || []).map(c => {
                      const cat = categorias.find(ct => ct.id === c.categoriaId)
                      return cat ? cat.nombre : ''
                    }).filter(Boolean)
                    const almacen = almacenes.find(a => a.id === s.almacenId)
                    const estadoKey = s.estado || 'disponible'
                    const fechasBadge = (s.fechas || []).map(pf => {
                      const ef = etiquetaFechas.find(e => e.id === pf.etiquetaFechaId)
                      if (!ef) return ''
                      return `<span class="badge-yellow text-[10px]"><i class="ph ph-calendar mr-0.5"></i>${ef.nombre}${ef.fecha ? ' ' + ef.fecha : ''}</span>`
                    }).join(' ')
                    return `
                    <tr class="table-row">
                      <td class="px-5 py-3 text-white font-medium">${s.productoNombre}</td>
                      <td class="px-5 py-3"><span class="badge-primary">${s.talla}</span></td>
                      <td class="px-5 py-3 text-dark-200 text-sm">${s.color || '—'}</td>
                      <td class="px-5 py-3">
                        <div class="flex flex-wrap gap-1">${cats.length > 0 ? cats.map(c => `<span class="badge-primary text-[10px]">${c}</span>`).join('') : '<span class="text-dark-500 text-sm">—</span>'}</div>
                      </td>
                      <td class="px-5 py-3 text-dark-200 text-sm">${almacen ? almacen.nombre : '—'}</td>
                      <td class="px-5 py-3 text-right text-white font-medium">${s.cantidad || 0}</td>
                      <td class="px-5 py-3">${getEstadoBadge(estadoKey)}</td>
                      <td class="px-5 py-3">${fechasBadge || '<span class="text-dark-500 text-sm">—</span>'}</td>
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
    const buscarInput = document.getElementById('buscar-stock')
    if (buscarInput) {
      buscarInput.addEventListener('input', (e) => {
        searchTerm = e.target.value
        render()
      })
    }

    document.getElementById('filtro-categoria')?.addEventListener('change', (e) => {
      filtroCategoria = e.target.value
      render()
    })

    document.getElementById('btn-calendario')?.addEventListener('click', () => {
      document.getElementById('calendario-popup')?.classList.toggle('hidden')
    })

    document.getElementById('btn-aplicar-mes')?.addEventListener('click', () => {
      filtroMes = document.getElementById('filtro-mes-input')?.value || ''
      document.getElementById('calendario-popup')?.classList.add('hidden')
      render()
    })

    document.getElementById('btn-limpiar-mes')?.addEventListener('click', () => {
      filtroMes = ''
      if (document.getElementById('filtro-mes-input')) document.getElementById('filtro-mes-input').value = ''
      document.getElementById('calendario-popup')?.classList.add('hidden')
      render()
    })

    document.getElementById('btn-limpiar-filtros')?.addEventListener('click', () => {
      filtroCategoria = ''
      filtroEstado = ''
      filtroMes = ''
      searchTerm = ''
      render()
    })

    container.querySelectorAll('[data-filtro-estado]').forEach(btn => {
      btn.addEventListener('click', () => {
        const estado = btn.dataset.filtroEstado
        filtroEstado = filtroEstado === estado ? '' : estado
        render()
      })
    })

    document.addEventListener('click', (e) => {
      const popup = document.getElementById('calendario-popup')
      const btn = document.getElementById('btn-calendario')
      if (popup && !popup.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
        popup.classList.add('hidden')
      }
    })
  }

  await render()
}