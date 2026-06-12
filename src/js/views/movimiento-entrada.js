import { productoService, almacenService } from '../services/base.js'
import { getVariantesByProducto } from '../services/base.js'
import { registrarEntrada } from '../services/movimiento-service.js'
import { flashMessage } from '../../partials/modals.js'

export async function renderMovimientoEntrada(params, container) {
  let productos = []
  let almacenes = []
  let selectedProducto = null
  let selectedVariante = null
  let variantesFiltradas = []

  async function loadData() {
    try {
      const [prods, alms] = await Promise.all([
        productoService.getAll(),
        almacenService.getAll()
      ])
      productos = prods
      almacenes = alms

      if (almacenes.length === 0) {
        await almacenService.create({ nombre: 'Venta' })
        await almacenService.create({ nombre: 'Exhibición' })
        almacenes = await almacenService.getAll()
      }

      if (selectedProducto) {
        variantesFiltradas = await getVariantesByProducto(selectedProducto)
      }
    } catch (err) {
      console.error('Error cargando datos:', err)
    }
  }

  async function render() {
    await loadData()

    container.innerHTML = `
      <div data-aos="fade-up">
        <header class="mb-6" data-aos="fade-down">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Entrada de Stock</h1>
              <p class="text-dark-300 text-sm mt-1">Registrar ingreso de productos al almacén</p>
            </div>
            <a href="#/movimientos" class="btn-secondary">
              <i class="ph ph-arrow-left"></i> Volver
            </a>
          </div>
        </header>

        <form id="form-entrada" class="space-y-6" data-aos="fade-up">
          <div class="card">
            <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
              <i class="ph ph-arrow-square-in text-accent-green"></i> Datos de Entrada
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-dark-300 mb-1">Producto *</label>
                <select id="entrada-producto" class="select w-full" required>
                  <option value="">Seleccionar producto...</option>
                  ${productos.map(p => `
                    <option value="${p.id}" ${selectedProducto === p.id ? 'selected' : ''}>${p.nombre}</option>
                  `).join('')}
                </select>
                ${productos.length === 0 ? '<p class="text-dark-500 text-xs mt-1">No hay productos. <a href="#/productos/nuevo" class="text-primary hover:underline">Crear producto</a></p>' : ''}
              </div>

              <div>
                <label class="block text-sm text-dark-300 mb-1">Variante *</label>
                <select id="entrada-variante" class="select w-full" required>
                  <option value="">Seleccionar variante...</option>
                  ${variantesFiltradas.map(v => `
                    <option value="${v.id}" ${selectedVariante === v.id ? 'selected' : ''}>
                      ${v.talla || 'GENERAL'}${v.color ? ' - ' + v.color : ''}${v.codigo_variante || v.codigoVariante ? ' (' + (v.codigo_variante || v.codigoVariante) + ')' : ''}
                    </option>
                  `).join('')}
                </select>
                ${selectedProducto && variantesFiltradas.length === 0 ? '<p class="text-accent-orange text-xs mt-1">Este producto no tiene variantes. Se creará una automáticamente.</p>' : ''}
              </div>

              <div>
                <label class="block text-sm text-dark-300 mb-1">Almacén *</label>
                <select id="entrada-almacen" class="select w-full" required>
                  ${almacenes.map(a => `
                    <option value="${a.id}" ${a.nombre === 'Venta' ? 'selected' : ''}>${a.nombre}</option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label class="block text-sm text-dark-300 mb-1">Cantidad *</label>
                <input type="number" id="entrada-cantidad" class="input" min="1" value="1" required>
              </div>
            </div>

            <div class="mt-4">
              <label class="block text-sm text-dark-300 mb-1">Estado</label>
              <select id="entrada-estado" class="select w-full">
                <option value="disponible">Disponible</option>
                <option value="no_disponible">No Disponible</option>
                <option value="exhibicion">Exhibición</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <a href="#/movimientos" class="btn-secondary">Cancelar</a>
            <button type="submit" class="btn-success" id="btn-registrar">
              <i class="ph ph-check"></i> Registrar Entrada
            </button>
          </div>
        </form>
      </div>
    `

    bindEvents()
    if (window.AOS) window.AOS.refresh()
  }

  function bindEvents() {
    const productoSelect = document.getElementById('entrada-producto')
    if (productoSelect) {
      productoSelect.addEventListener('change', async (e) => {
        selectedProducto = e.target.value
        selectedVariante = null
        if (selectedProducto) {
          variantesFiltradas = await getVariantesByProducto(selectedProducto)
        } else {
          variantesFiltradas = []
        }
        render()
      })
    }

    document.getElementById('form-entrada')?.addEventListener('submit', handleSubmit)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const productoId = document.getElementById('entrada-producto').value
    const varianteId = document.getElementById('entrada-variante').value
    const almacenId = document.getElementById('entrada-almacen').value
    const cantidad = parseInt(document.getElementById('entrada-cantidad').value)
    const estado = document.getElementById('entrada-estado').value

    if (!productoId || !almacenId || !cantidad || cantidad < 1) {
      flashMessage('Completa todos los campos obligatorios', 'error')
      return
    }

    try {
      let finalVarianteId = varianteId

      if (!varianteId && selectedProducto) {
        const { db } = await import('../firebase.js')
        const { collection, doc, setDoc, serverTimestamp } = await import('firebase/firestore')
        const { getVariantesPath } = await import('../services/base.js')
        const varRef = doc(collection(db, getVariantesPath(selectedProducto)))
        await setDoc(varRef, {
          talla: 'GENERAL',
          color: '',
          codigo_variante: `VAR-${Date.now()}`,
          createdAt: serverTimestamp(),
        })
        finalVarianteId = varRef.id
      }

      const btn = document.getElementById('btn-registrar')
      btn.disabled = true
      btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Registrando...'

      await registrarEntrada(productoId, finalVarianteId, almacenId, cantidad, estado)

      flashMessage(`Entrada registrada: ${cantidad} unidad${cantidad > 1 ? 'es' : ''}`, 'success')
      window.location.hash = '#/movimientos'
    } catch (err) {
      console.error('Error registrando entrada:', err)
      flashMessage('Error al registrar entrada: ' + err.message, 'error')
      const btn = document.getElementById('btn-registrar')
      btn.disabled = false
      btn.innerHTML = '<i class="ph ph-check"></i> Registrar Entrada'
    }
  }

  await render()
}