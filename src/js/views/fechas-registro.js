import { etiquetaFechaService, productoService, isNameUnique, countProductsByEtiquetaFecha, isEtiquetaFechaInUse, removeEtiquetaFechaFromProducts, getProductoEtiquetaFechasPath } from '../services/base.js'
import { flashMessage } from '../../partials/modals.js'
import { COLECCIONES, SUBCOLECCIONES } from '../models/schema.js'
import { db } from '../firebase.js'
import { collection, getDocs, query, where, serverTimestamp, addDoc, deleteDoc, doc } from 'firebase/firestore'

let selectedProductos = []

export async function renderFechasRegistro(params, container) {
  let fechas = []
  let productos = []
  let productCounts = {}
  let searchTerm = ''

  async function loadData() {
    try {
      fechas = await etiquetaFechaService.getAll()
      productos = await productoService.getAll()
      productCounts = {}
      for (const f of fechas) {
        productCounts[f.id] = await countProductsByEtiquetaFecha(f.id)
      }
    } catch (err) {
      console.error('Error cargando fechas:', err)
      fechas = []
    }
  }

  async function render() {
    await loadData()
    const filtered = searchTerm
      ? fechas.filter(f => f.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (f.fecha && f.fecha.includes(searchTerm)))
      : fechas

    container.innerHTML = `
      <div data-aos="fade-up">
        <header class="mb-6" data-aos="fade-down">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Fechas de Registro</h1>
              <p class="text-dark-300 text-sm mt-1">Etiquetas con fecha asociada</p>
            </div>
            <button id="btn-nueva-fecha" class="btn-primary">
              <i class="ph ph-plus"></i> Nueva Fecha
            </button>
          </div>
        </header>

        <div class="filter-bar" data-aos="fade-up">
          <input type="text" id="buscar-fecha" placeholder="Buscar por nombre o fecha..." class="input w-64" value="${searchTerm}">
          <div class="flex-1"></div>
          <span class="text-dark-400 text-sm">${filtered.length} fecha${filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="table-container" data-aos="fade-up">
          ${filtered.length === 0 ? `
            <div class="p-12 text-center text-dark-400">
              <i class="ph ph-calendar-dots text-5xl mb-3 block"></i>
              <p class="text-lg">${searchTerm ? 'No se encontraron fechas' : 'No hay fechas de registro'}</p>
              <p class="text-sm mt-1">${searchTerm ? 'Intenta con otro término' : 'Crea fechas para asociarlas a productos'}</p>
            </div>
          ` : `
            <table class="w-full">
              <thead>
                <tr class="border-b border-dark-600">
                  <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Nombre</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Fecha</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Productos</th>
                  <th class="text-right px-5 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(f => {
                  const fechaDisplay = f.fecha || ''
                  return `
                  <tr class="table-row">
                    <td class="px-5 py-3">
                      <span class="badge-yellow"><i class="ph ph-calendar-dots mr-1"></i>${f.nombre}</span>
                    </td>
                    <td class="px-5 py-3 text-dark-200 text-sm">
                      ${fechaDisplay ? `<i class="ph ph-calendar mr-1 text-dark-400"></i>${fechaDisplay}` : '<span class="text-dark-500">—</span>'}
                    </td>
                    <td class="px-5 py-3 text-dark-300 text-sm">${productCounts[f.id] || 0}</td>
                    <td class="px-5 py-3 text-right">
                      <button data-edit="${f.id}" class="text-dark-400 hover:text-primary transition-colors mr-3" title="Editar">
                        <i class="ph ph-pencil text-lg"></i>
                      </button>
                      <button data-delete="${f.id}" class="text-dark-400 hover:text-accent-red transition-colors" title="Eliminar">
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

      <div id="modal-fecha" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 hidden">
        <div class="bg-dark-800 border border-dark-600 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-white mb-4" id="modal-title">Nueva Fecha de Registro</h3>
          <form id="form-fecha">
            <input type="hidden" id="fecha-id" value="">
            <div class="mb-4">
              <label class="block text-sm text-dark-300 mb-1">Nombre</label>
              <input type="text" id="fecha-nombre" class="input" placeholder="Ej: Ingreso Enero, Temporada Verano" required>
            </div>
            <div class="mb-4">
              <label class="block text-sm text-dark-300 mb-1">Fecha</label>
              <input type="date" id="fecha-valor" class="input" required>
            </div>
            <div class="mb-6">
              <label class="block text-sm text-dark-300 mb-2">Productos asociados</label>
              <p class="text-dark-500 text-xs mb-2">Selecciona los productos que deseas asociar a esta fecha.</p>
              <div class="max-h-48 overflow-y-auto border border-dark-500 rounded-lg p-3 space-y-1">
                ${productos.map(p => `
                  <label class="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-dark-600 transition-colors">
                    <input type="checkbox" class="fecha-producto w-4 h-4 accent-primary" value="${p.id}" ${selectedProductos.includes(p.id) ? 'checked' : ''}>
                    <span class="text-dark-200 text-sm">${p.nombre}</span>
                  </label>
                `).join('')}
                ${productos.length === 0 ? '<p class="text-dark-500 text-sm">No hay productos registrados</p>' : ''}
              </div>
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
    document.getElementById('btn-nueva-fecha')?.addEventListener('click', () => {
      selectedProductos = []
      openModal()
    })
    document.getElementById('btn-cancelar')?.addEventListener('click', closeModal)
    document.getElementById('form-fecha')?.addEventListener('submit', handleSubmit)

    const buscarInput = document.getElementById('buscar-fecha')
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

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.edit
        const f = fechas.find(x => x.id === id)
        if (f) openModal(f)
      })
    })

    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delete
        const f = fechas.find(x => x.id === id)
        if (f) handleDelete(f)
      })
    })
  }

  async function openModal(f = null) {
    selectedProductos = []

    if (f) {
      for (const producto of productos) {
        const path = `${COLECCIONES.PRODUCTOS}/${producto.id}/${SUBCOLECCIONES.PRODUCTO_ETIQUETA_FECHAS}`
        const snap = await getDocs(query(collection(db, path), where('etiquetaFechaId', '==', f.id)))
        if (!snap.empty) {
          selectedProductos.push(producto.id)
        }
      }
    }

    const modal = document.getElementById('modal-fecha')
    const title = document.getElementById('modal-title')
    const idField = document.getElementById('fecha-id')
    const nombreField = document.getElementById('fecha-nombre')
    const fechaField = document.getElementById('fecha-valor')

    if (f) {
      title.textContent = 'Editar Fecha de Registro'
      idField.value = f.id
      nombreField.value = f.nombre
      fechaField.value = f.fecha || ''
    } else {
      title.textContent = 'Nueva Fecha de Registro'
      idField.value = ''
      nombreField.value = ''
      fechaField.value = new Date().toISOString().split('T')[0]
    }

    container.querySelectorAll('.fecha-producto').forEach(cb => {
      cb.checked = selectedProductos.includes(cb.value)
      cb.addEventListener('change', (e) => {
        if (e.target.checked) {
          if (!selectedProductos.includes(e.target.value)) selectedProductos.push(e.target.value)
        } else {
          selectedProductos = selectedProductos.filter(id => id !== e.target.value)
        }
      })
    })

    modal.classList.remove('hidden')
    nombreField.focus()
  }

  function closeModal() {
    document.getElementById('modal-fecha')?.classList.add('hidden')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const id = document.getElementById('fecha-id').value
    const nombre = document.getElementById('fecha-nombre').value.trim()
    const fecha = document.getElementById('fecha-valor').value
    if (!nombre) {
      flashMessage('El nombre es obligatorio', 'error')
      return
    }

    try {
      let fechaId = id

      if (id) {
        await etiquetaFechaService.update(id, { nombre, fecha })
        flashMessage('Fecha actualizada', 'success')
      } else {
        fechaId = await etiquetaFechaService.create({ nombre, fecha })
        flashMessage('Fecha creada', 'success')
      }

      for (const productoId of selectedProductos) {
        const path = getProductoEtiquetaFechasPath(productoId)
        const existing = await getDocs(query(collection(db, path), where('etiquetaFechaId', '==', fechaId)))
        if (existing.empty) {
          await addDoc(collection(db, path), {
            etiquetaFechaId: fechaId,
            createdAt: serverTimestamp(),
          })
        }
      }

      for (const producto of productos) {
        if (!selectedProductos.includes(producto.id)) {
          const path = getProductoEtiquetaFechasPath(producto.id)
          const existing = await getDocs(query(collection(db, path), where('etiquetaFechaId', '==', fechaId)))
          for (const d of existing.docs) {
            await deleteDoc(d.ref)
          }
        }
      }

      closeModal()
      render()
    } catch (err) {
      console.error('Error guardando fecha:', err)
      flashMessage('Error al guardar: ' + err.message, 'error')
    }
  }

  async function handleDelete(f) {
    const inUse = await isEtiquetaFechaInUse(f.id)
    if (inUse) {
      const { confirmModal } = await import('../../partials/modals.js')
      const confirmed = await confirmModal(`La fecha "${f.nombre}" tiene ${productCounts[f.id] || 0} productos asociados. ¿Eliminar de todos modos? Se desasociará de los productos.`)
      if (!confirmed) return
      await removeEtiquetaFechaFromProducts(f.id)
    } else {
      const { confirmModal } = await import('../../partials/modals.js')
      const confirmed = await confirmModal(`¿Eliminar la fecha "${f.nombre}"?`)
      if (!confirmed) return
    }

    try {
      await removeEtiquetaFechaFromProducts(f.id)
      await etiquetaFechaService.remove(f.id)
      flashMessage('Fecha eliminada', 'success')
      render()
    } catch (err) {
      console.error('Error eliminando fecha:', err)
      flashMessage('Error al eliminar: ' + err.message, 'error')
    }
  }

  await render()
}