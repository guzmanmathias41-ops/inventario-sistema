import { productoService, categoriaProductoService } from '../services/base.js'
import { deleteProductoCascade } from '../services/base.js'
import { flashMessage } from '../../partials/modals.js'
import { isFirebaseReady } from '../firebase.js'

export async function renderProductos(params, container) {
  let productos = []
  let categorias = []
  let searchTerm = ''
  let filtroCategoria = ''

  async function loadData() {
    if (!isFirebaseReady) return
    try {
      const [prodsRes, catsRes] = await Promise.all([
        productoService.getAll(),
        categoriaProductoService.getAll(),
      ])
      productos = prodsRes
      categorias = catsRes
    } catch (err) {
      console.error('Error cargando productos:', err)
    }
  }

  async function render() {
    await loadData()

    let filtered = productos
    if (filtroCategoria) {
      filtered = filtered.filter(p => {
        return p.categoriaId === filtroCategoria || (p.categorias && p.categorias.includes(filtroCategoria))
      })
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        (p.nombre || '').toLowerCase().includes(term) ||
        (p.codigo_barras || '').toLowerCase().includes(term)
      )
    }

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
              <h1 class="text-2xl font-bold text-white">Productos</h1>
              <p class="text-dark-300 text-sm mt-1">Gestión de productos y variantes</p>
            </div>
            ${isFirebaseReady ? '<a href="#/productos/nuevo" class="btn-primary"><i class="ph ph-plus"></i> Nuevo Producto</a>' : ''}
          </div>
        </header>

        <div class="filter-bar" data-aos="fade-up">
          <input type="text" id="buscar-producto" placeholder="Buscar producto o código..." class="input w-72" value="${searchTerm}">
          <select id="filtro-categoria" class="select w-52">
            <option value="">Todas las categorías</option>
            ${categorias.map(c => `
              <option value="${c.id}" ${filtroCategoria === c.id ? 'selected' : ''}>${c.nombre}</option>
            `).join('')}
          </select>
          <div class="flex-1"></div>
          <span class="text-dark-400 text-sm">${filtered.length} producto${filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="table-container" data-aos="fade-up">
          ${filtered.length === 0 ? `
            <div class="p-12 text-center text-dark-400">
              <i class="ph ph-tag text-5xl mb-3 block"></i>
              <p class="text-lg">${!isFirebaseReady ? 'Conecta Firebase para ver productos' : (searchTerm || filtroCategoria ? 'No se encontraron productos' : 'No hay productos registrados')}</p>
              <p class="text-sm mt-1">${!isFirebaseReady ? 'Agrega las credenciales en el archivo .env' : (searchTerm || filtroCategoria ? 'Intenta con otro filtro' : 'Agrega productos para comenzar')}</p>
            </div>
          ` : `
            <table class="w-full">
              <thead>
                <tr class="border-b border-dark-600">
                  <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase">Nombre</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase">Código</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase">Tipo</th>
                  <th class="text-right px-5 py-3 text-xs font-semibold text-dark-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(p => {
                  const tipo = p.tipoVariante || p.tipo_variante || 'general'
                  return `
                  <tr class="table-row">
                    <td class="px-5 py-3">
                      <a href="#/productos/editar/${p.id}" class="text-white font-medium hover:text-primary transition-colors">${p.nombre}</a>
                    </td>
                    <td class="px-5 py-3 text-dark-300 text-sm font-mono">${p.codigo_barras || '—'}</td>
                    <td class="px-5 py-3">
                      <span class="${tipo === 'tallas' ? 'badge-primary' : 'badge-green'}">${tipo === 'tallas' ? 'Tallas' : 'General'}</span>
                    </td>
                    <td class="px-5 py-3 text-right">
                      <a href="#/productos/editar/${p.id}" class="text-dark-400 hover:text-primary transition-colors mr-3" title="Editar">
                        <i class="ph ph-pencil text-lg"></i>
                      </a>
                      <button data-delete="${p.id}" data-nombre="${p.nombre}" class="text-dark-400 hover:text-accent-red transition-colors" title="Eliminar">
                        <i class="ph ph-trash text-lg"></i>
                      </button>
                    </td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `

    bindEvents()
    if (window.AOS) window.AOS.refresh()
  }

  function bindEvents() {
    const buscarInput = document.getElementById('buscar-producto')
    if (buscarInput) {
      buscarInput.addEventListener('input', (e) => {
        searchTerm = e.target.value
        const term = searchTerm.toLowerCase()
        container.querySelectorAll('tbody tr').forEach(row => {
          const text = row.textContent.toLowerCase()
          row.style.display = text.includes(term) ? '' : 'none'
        })
      })
    }

    document.getElementById('filtro-categoria')?.addEventListener('change', (e) => {
      filtroCategoria = e.target.value
      render()
    })

    if (isFirebaseReady) {
      container.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.delete
          const nombre = btn.dataset.nombre
          const { confirmModal } = await import('../../partials/modals.js')
          const confirmed = await confirmModal(`¿Eliminar el producto "${nombre}"? Se eliminarán también sus variantes y stock.`)
          if (!confirmed) return
          try {
            await deleteProductoCascade(id)
            flashMessage('Producto eliminado', 'success')
            render()
          } catch (err) {
            flashMessage('Error al eliminar: ' + err.message, 'error')
          }
        })
      })
    }
  }

  await render()
}