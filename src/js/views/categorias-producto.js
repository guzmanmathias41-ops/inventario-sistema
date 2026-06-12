import { categoriaProductoService, isNameUnique, countProductsByCategoria, isCategoriaInUse, removeCategoriaFromProducts } from '../services/base.js'
import { flashMessage } from '../../partials/modals.js'
import { GRUPOS_CATEGORIA_PRODUCTO, GRUPOS_CATEGORIA_PRODUCTO_LABELS, GRUPOS_CATEGORIA_PRODUCTO_ICONS } from '../models/schema.js'

export async function renderCategoriasProducto(params, container) {
  let categorias = []
  let editingId = null
  let filtroGrupo = ''
  let productCounts = {}

  async function loadData() {
    try {
      categorias = await categoriaProductoService.getAll()
      productCounts = {}
      for (const cat of categorias) {
        productCounts[cat.id] = await countProductsByCategoria(cat.id)
      }
    } catch (err) {
      console.error('Error cargando categorías:', err)
      categorias = []
    }
  }

  async function render() {
    await loadData()
    const filtered = filtroGrupo
      ? categorias.filter(c => c.grupo === filtroGrupo)
      : categorias

    container.innerHTML = `
      <div data-aos="fade-up">
        <header class="mb-6" data-aos="fade-down">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Categorías de Producto</h1>
              <p class="text-dark-300 text-sm mt-1">Tipos de prenda y colores</p>
            </div>
            <button id="btn-nueva-cat" class="btn-primary">
              <i class="ph ph-plus"></i> Nueva Categoría
            </button>
          </div>
        </header>

        <div class="filter-bar" data-aos="fade-up">
          <select id="filtro-grupo" class="select w-48">
            <option value="">Todos los grupos</option>
            ${GRUPOS_CATEGORIA_PRODUCTO.map(g => `
              <option value="${g}" ${filtroGrupo === g ? 'selected' : ''}>${GRUPOS_CATEGORIA_PRODUCTO_LABELS[g]}</option>
            `).join('')}
          </select>
          <input type="text" id="buscar-cat" placeholder="Buscar categoría..." class="input w-64">
          <div class="flex-1"></div>
          <span class="text-dark-400 text-sm">${filtered.length} categoría${filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="table-container" data-aos="fade-up">
          ${filtered.length === 0 ? `
            <div class="p-12 text-center text-dark-400">
              <i class="ph ${filtroGrupo ? GRUPOS_CATEGORIA_PRODUCTO_ICONS[filtroGrupo] || 'ph-folder' : 'ph-folder'} text-5xl mb-3 block"></i>
              <p class="text-lg">No hay categorías${filtroGrupo ? ' en este grupo' : ''}</p>
              <p class="text-sm mt-1">Crea una categoría para comenzar</p>
            </div>
          ` : `
            <table class="w-full">
              <thead>
                <tr class="border-b border-dark-600">
                  <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Nombre</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Grupo</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Productos</th>
                  <th class="text-right px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(cat => `
                  <tr class="table-row">
                    <td class="px-5 py-3">
                      <div class="flex items-center gap-2">
                        <i class="ph ${GRUPOS_CATEGORIA_PRODUCTO_ICONS[cat.grupo] || 'ph-folder'} text-dark-400"></i>
                        <span class="text-white font-medium">${cat.nombre}</span>
                      </div>
                    </td>
                    <td class="px-5 py-3">
                      <span class="${cat.grupo === 'color' ? 'badge-green' : 'badge-primary'}">${GRUPOS_CATEGORIA_PRODUCTO_LABELS[cat.grupo] || cat.grupo}</span>
                    </td>
                    <td class="px-5 py-3 text-dark-300 text-sm">${productCounts[cat.id] || 0}</td>
                    <td class="px-5 py-3 text-right">
                      <button data-edit="${cat.id}" class="text-dark-400 hover:text-primary transition-colors mr-3" title="Editar">
                        <i class="ph ph-pencil text-lg"></i>
                      </button>
                      <button data-delete="${cat.id}" data-nombre="${cat.nombre}" class="text-dark-400 hover:text-accent-red transition-colors" title="Eliminar">
                        <i class="ph ph-trash text-lg"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>

      <div id="modal-cat" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 hidden">
        <div class="bg-dark-800 border border-dark-600 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
          <h3 class="text-lg font-semibold text-white mb-4" id="modal-title">Nueva Categoría</h3>
          <form id="form-cat">
            <input type="hidden" id="cat-id" value="">
            <div class="mb-4">
              <label class="block text-sm text-dark-300 mb-1">Nombre</label>
              <input type="text" id="cat-nombre" class="input" placeholder="Ej: Camiseta" required>
            </div>
            <div class="mb-6">
              <label class="block text-sm text-dark-300 mb-1">Grupo</label>
              <select id="cat-grupo" class="select w-full">
                ${GRUPOS_CATEGORIA_PRODUCTO.map(g => `
                  <option value="${g}">${GRUPOS_CATEGORIA_PRODUCTO_LABELS[g]}</option>
                `).join('')}
              </select>
            </div>
            <div class="flex justify-end gap-3">
              <button type="button" id="btn-cancelar" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `

    bindEvents()
    if (window.AOS) window.AOS.refresh()
  }

  function bindEvents() {
    document.getElementById('btn-nueva-cat')?.addEventListener('click', () => openModal())
    document.getElementById('filtro-grupo')?.addEventListener('change', (e) => {
      filtroGrupo = e.target.value
      render()
    })
    document.getElementById('btn-cancelar')?.addEventListener('click', closeModal)
    document.getElementById('form-cat')?.addEventListener('submit', handleSubmit)

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.edit
        const cat = categorias.find(c => c.id === id)
        if (cat) openModal(cat)
      })
    })

    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delete
        const nombre = btn.dataset.nombre
        const cat = categorias.find(c => c.id === id)
        if (cat) handleDelete(cat)
      })
    })

    const buscarInput = document.getElementById('buscar-cat')
    if (buscarInput) {
      buscarInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase()
        container.querySelectorAll('tbody tr').forEach(row => {
          const nombre = row.querySelector('td')?.textContent.toLowerCase() || ''
          row.style.display = nombre.includes(term) ? '' : 'none'
        })
      })
    }
  }

  function openModal(cat = null) {
    const modal = document.getElementById('modal-cat')
    const title = document.getElementById('modal-title')
    const idField = document.getElementById('cat-id')
    const nombreField = document.getElementById('cat-nombre')
    const grupoField = document.getElementById('cat-grupo')

    if (cat) {
      title.textContent = 'Editar Categoría'
      idField.value = cat.id
      nombreField.value = cat.nombre
      grupoField.value = cat.grupo
    } else {
      title.textContent = 'Nueva Categoría'
      idField.value = ''
      nombreField.value = ''
      grupoField.value = GRUPOS_CATEGORIA_PRODUCTO[0]
    }

    modal.classList.remove('hidden')
    nombreField.focus()
  }

  function closeModal() {
    document.getElementById('modal-cat')?.classList.add('hidden')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const id = document.getElementById('cat-id').value
    const nombre = document.getElementById('cat-nombre').value.trim()
    const grupo = document.getElementById('cat-grupo').value

    if (!nombre) {
      flashMessage('El nombre es obligatorio', 'error')
      return
    }

    const isUnique = await isNameUnique('categorias_producto', nombre, id || null)
    if (!isUnique) {
      flashMessage(`Ya existe una categoría con el nombre "${nombre}"`, 'error')
      return
    }

    try {
      if (id) {
        await categoriaProductoService.update(id, { nombre, grupo })
        flashMessage('Categoría actualizada correctamente', 'success')
      } else {
        await categoriaProductoService.create({ nombre, grupo })
        flashMessage('Categoría creada correctamente', 'success')
      }
      closeModal()
      render()
    } catch (err) {
      console.error('Error guardando categoría:', err)
      flashMessage('Error al guardar: ' + err.message, 'error')
    }
  }

  async function handleDelete(cat) {
    const inUse = await isCategoriaInUse(cat.id)
    if (inUse) {
      flashMessage(`No se puede eliminar "${cat.nombre}" porque tiene productos asociados`, 'error')
      return
    }

    const { confirmModal } = await import('../../partials/modals.js')
    const confirmed = await confirmModal(`¿Eliminar la categoría "${cat.nombre}"?`)
    if (!confirmed) return

    try {
      await removeCategoriaFromProducts(cat.id)
      await categoriaProductoService.remove(cat.id)
      flashMessage('Categoría eliminada', 'success')
      render()
    } catch (err) {
      console.error('Error eliminando categoría:', err)
      flashMessage('Error al eliminar: ' + err.message, 'error')
    }
  }

  await render()
}