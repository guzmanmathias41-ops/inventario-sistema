import { etiquetaService, isNameUnique, countProductsByEtiqueta, isEtiquetaInUse, removeEtiquetaFromProducts } from '../services/base.js'
import { flashMessage } from '../../partials/modals.js'

export async function renderEtiquetasProducto(params, container) {
  let etiquetas = []
  let productCounts = {}
  let searchTerm = ''

  async function loadData() {
    try {
      etiquetas = await etiquetaService.getAll()
      productCounts = {}
      for (const et of etiquetas) {
        productCounts[et.id] = await countProductsByEtiqueta(et.id)
      }
    } catch (err) {
      console.error('Error cargando etiquetas:', err)
      etiquetas = []
    }
  }

  async function render() {
    await loadData()
    const filtered = searchTerm
      ? etiquetas.filter(e => e.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
      : etiquetas

    container.innerHTML = `
      <div data-aos="fade-up">
        <header class="mb-6" data-aos="fade-down">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Etiquetas de Producto</h1>
              <p class="text-dark-300 text-sm mt-1">Etiquetas flexibles sin grupo</p>
            </div>
            <button id="btn-nueva-etiqueta" class="btn-primary">
              <i class="ph ph-plus"></i> Nueva Etiqueta
            </button>
          </div>
        </header>

        <div class="filter-bar" data-aos="fade-up">
          <input type="text" id="buscar-etiqueta" placeholder="Buscar etiqueta..." class="input w-64" value="${searchTerm}">
          <div class="flex-1"></div>
          <span class="text-dark-400 text-sm">${filtered.length} etiqueta${filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="table-container" data-aos="fade-up">
          ${filtered.length === 0 ? `
            <div class="p-12 text-center text-dark-400">
              <i class="ph ph-tag-simple text-5xl mb-3 block"></i>
              <p class="text-lg">${searchTerm ? 'No se encontraron etiquetas' : 'No hay etiquetas registradas'}</p>
              <p class="text-sm mt-1">${searchTerm ? 'Intenta con otro término' : 'Crea etiquetas para organizar productos'}</p>
            </div>
          ` : `
            <table class="w-full">
              <thead>
                <tr class="border-b border-dark-600">
                  <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Nombre</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Productos</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Creada</th>
                  <th class="text-right px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(et => {
                  const fecha = et.createdAt?.toDate ? et.createdAt.toDate().toLocaleDateString('es-ES') : ''
                  return `
                  <tr class="table-row">
                    <td class="px-5 py-3">
                      <span class="badge-green"><i class="ph ph-tag-simple mr-1"></i>${et.nombre}</span>
                    </td>
                    <td class="px-5 py-3 text-dark-300 text-sm">${productCounts[et.id] || 0}</td>
                    <td class="px-5 py-3 text-dark-400 text-sm">${fecha}</td>
                    <td class="px-5 py-3 text-right">
                      <button data-edit="${et.id}" class="text-dark-400 hover:text-primary transition-colors mr-3" title="Editar">
                        <i class="ph ph-pencil text-lg"></i>
                      </button>
                      <button data-delete="${et.id}" class="text-dark-400 hover:text-accent-red transition-colors" title="Eliminar">
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

      <div id="modal-etiqueta" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 hidden">
        <div class="bg-dark-800 border border-dark-600 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
          <h3 class="text-lg font-semibold text-white mb-4" id="modal-title">Nueva Etiqueta</h3>
          <form id="form-etiqueta">
            <input type="hidden" id="et-id" value="">
            <div class="mb-6">
              <label class="block text-sm text-dark-300 mb-1">Nombre de la etiqueta</label>
              <input type="text" id="et-nombre" class="input" placeholder="Ej: Nuevo, Oferta, Temporada" required>
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
    document.getElementById('btn-nueva-etiqueta')?.addEventListener('click', () => openModal())
    document.getElementById('btn-cancelar')?.addEventListener('click', closeModal)
    document.getElementById('form-etiqueta')?.addEventListener('submit', handleSubmit)

    const buscarInput = document.getElementById('buscar-etiqueta')
    if (buscarInput) {
      buscarInput.addEventListener('input', (e) => {
        searchTerm = e.target.value
        const term = searchTerm.toLowerCase()
        container.querySelectorAll('tbody tr').forEach(row => {
          const nombre = row.querySelector('td')?.textContent.toLowerCase() || ''
          row.style.display = nombre.includes(term) ? '' : 'none'
        })
      })
    }

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.edit
        const et = etiquetas.find(e => e.id === id)
        if (et) openModal(et)
      })
    })

    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delete
        const et = etiquetas.find(e => e.id === id)
        if (et) handleDelete(et)
      })
    })
  }

  function openModal(et = null) {
    const modal = document.getElementById('modal-etiqueta')
    const title = document.getElementById('modal-title')
    const idField = document.getElementById('et-id')
    const nombreField = document.getElementById('et-nombre')

    if (et) {
      title.textContent = 'Editar Etiqueta'
      idField.value = et.id
      nombreField.value = et.nombre
    } else {
      title.textContent = 'Nueva Etiqueta'
      idField.value = ''
      nombreField.value = ''
    }

    modal.classList.remove('hidden')
    nombreField.focus()
  }

  function closeModal() {
    document.getElementById('modal-etiqueta')?.classList.add('hidden')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const id = document.getElementById('et-id').value
    const nombre = document.getElementById('et-nombre').value.trim()
    if (!nombre) {
      flashMessage('El nombre es obligatorio', 'error')
      return
    }

    const isUnique = await isNameUnique('etiquetas', nombre, id || null)
    if (!isUnique) {
      flashMessage(`Ya existe una etiqueta con el nombre "${nombre}"`, 'error')
      return
    }

    try {
      if (id) {
        await etiquetaService.update(id, { nombre })
        flashMessage('Etiqueta actualizada', 'success')
      } else {
        await etiquetaService.create({ nombre })
        flashMessage('Etiqueta creada', 'success')
      }
      closeModal()
      render()
    } catch (err) {
      console.error('Error guardando etiqueta:', err)
      flashMessage('Error al guardar: ' + err.message, 'error')
    }
  }

  async function handleDelete(et) {
    const inUse = await isEtiquetaInUse(et.id)
    if (inUse) {
      flashMessage(`No se puede eliminar "${et.nombre}" porque tiene productos asociados`, 'error')
      return
    }

    const { confirmModal } = await import('../../partials/modals.js')
    const confirmed = await confirmModal(`¿Eliminar la etiqueta "${et.nombre}"?`)
    if (!confirmed) return

    try {
      await removeEtiquetaFromProducts(et.id)
      await etiquetaService.remove(et.id)
      flashMessage('Etiqueta eliminada', 'success')
      render()
    } catch (err) {
      console.error('Error eliminando etiqueta:', err)
      flashMessage('Error al eliminar: ' + err.message, 'error')
    }
  }

  await render()
}