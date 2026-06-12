import { productoService, almacenService, categoriaSalidaService } from '../services/base.js'
import { getVariantesByProducto, getStockByVariante } from '../services/base.js'
import { registrarSalida } from '../services/movimiento-service.js'
import { flashMessage } from '../../partials/modals.js'
import { ETIQUETAS_MOVIMIENTO, GRUPOS_CATEGORIA_SALIDA_LABELS } from '../models/schema.js'

export async function renderMovimientoSalida(params, container) {
  let productos = []
  let almacenes = []
  let categoriasSalida = []
  let selectedProducto = null
  let selectedVariante = null
  let variantesFiltradas = []

  async function loadData() {
    try {
      const [prods, alms, cats] = await Promise.all([
        productoService.getAll(),
        almacenService.getAll(),
        categoriaSalidaService.getAll()
      ])
      productos = prods
      almacenes = alms
      categoriasSalida = cats

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
              <h1 class="text-2xl font-bold text-white">Salida de Stock</h1>
              <p class="text-dark-300 text-sm mt-1">Registrar salida de productos del almacén</p>
            </div>
            <a href="#/movimientos" class="btn-secondary">
              <i class="ph ph-arrow-left"></i> Volver
            </a>
          </div>
        </header>

        <form id="form-salida" class="space-y-6" data-aos="fade-up">
          <div class="card">
            <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
              <i class="ph ph-arrow-square-out text-accent-red"></i> Datos de Salida
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-dark-300 mb-1">Producto *</label>
                <select id="salida-producto" class="select w-full" required>
                  <option value="">Seleccionar producto...</option>
                  ${productos.map(p => `
                    <option value="${p.id}" ${selectedProducto === p.id ? 'selected' : ''}>${p.nombre}</option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label class="block text-sm text-dark-300 mb-1">Variante *</label>
                <select id="salida-variante" class="select w-full" required>
                  <option value="">Seleccionar variante...</option>
                  ${variantesFiltradas.map(v => `
                    <option value="${v.id}" ${selectedVariante === v.id ? 'selected' : ''}>
                      ${v.talla || 'GENERAL'}${v.color ? ' - ' + v.color : ''}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label class="block text-sm text-dark-300 mb-1">Almacén *</label>
                <select id="salida-almacen" class="select w-full" required>
                  ${almacenes.map(a => `
                    <option value="${a.id}">${a.nombre}</option>
                  `).join('')}
                </select>
              </div>

              <div>
                <label class="block text-sm text-dark-300 mb-1">Cantidad *</label>
                <input type="number" id="salida-cantidad" class="input" min="1" value="1" required>
                <p id="stock-disponible" class="text-dark-400 text-xs mt-1"></p>
              </div>

              <div>
                <label class="block text-sm text-dark-300 mb-1">Categoría de Salida</label>
                <select id="salida-categoria" class="select w-full">
                  <option value="">Sin categoría</option>
                  ${['persona', 'motivo', 'operativo'].map(grupo => `
                    <optgroup label="${GRUPOS_CATEGORIA_SALIDA_LABELS[grupo]}">
                      ${categoriasSalida.filter(c => c.grupo === grupo).map(c => `
                        <option value="${c.id}">${c.nombre}</option>
                      `).join('')}
                    </optgroup>
                  `).join('')}
                </select>
              </div>

              <div>
                <label class="block text-sm text-dark-300 mb-1">Etiqueta</label>
                <select id="salida-etiqueta" class="select w-full">
                  <option value="">Sin etiqueta</option>
                  ${['persona', 'motivo', 'operativo'].map(grupo => `
                    <optgroup label="${GRUPOS_CATEGORIA_SALIDA_LABELS[grupo]}">
                      ${ETIQUETAS_MOVIMIENTO.filter(e => {
                        if (grupo === 'persona') return ['mersh', 'orion', 'nyastia', 'mathias'].includes(e.value)
                        if (grupo === 'motivo') return ['danada', 'perdida', 'robo', 'devolucion'].includes(e.value)
                        if (grupo === 'operativo') return ['compra', 'devolucion_cliente', 'donacion', 'ajuste', 'traslado', 'exhibicion'].includes(e.value)
                        return false
                      }).map(e => `
                        <option value="${e.value}">${e.label}</option>
                      `).join('')}
                    </optgroup>
                  `).join('')}
                </select>
              </div>

              <div>
                <label class="block text-sm text-dark-300 mb-1">Motivo</label>
                <input type="text" id="salida-motivo" class="input" placeholder="Ej: Venta a cliente">
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <a href="#/movimientos" class="btn-secondary">Cancelar</a>
            <button type="submit" class="btn-danger" id="btn-registrar">
              <i class="ph ph-arrow-square-out"></i> Registrar Salida
            </button>
          </div>
        </form>
      </div>
    `

    bindEvents()
    if (window.AOS) window.AOS.refresh()
  }

  function bindEvents() {
    const productoSelect = document.getElementById('salida-producto')
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

    const varianteSelect = document.getElementById('salida-variante')
    if (varianteSelect) {
      varianteSelect.addEventListener('change', async (e) => {
        selectedVariante = e.target.value
        await updateStockInfo()
      })
    }

    document.getElementById('form-salida')?.addEventListener('submit', handleSubmit)
  }

  async function updateStockInfo() {
    const varianteId = document.getElementById('salida-variante')?.value
    const almacenId = document.getElementById('salida-almacen')?.value
    const stockInfo = document.getElementById('stock-disponible')
    if (!selectedProducto || !varianteId || !almacenId || !stockInfo) return

    try {
      const stockDocs = await getStockByVariante(selectedProducto, varianteId)
      const stockItem = stockDocs.find(s => s.almacenId === almacenId)
      const qty = stockItem ? (stockItem.cantidad || 0) : 0
      stockInfo.textContent = `${qty} unidades disponibles`
      stockInfo.className = qty > 0 ? 'text-accent-green text-xs mt-1' : 'text-accent-red text-xs mt-1'
    } catch (err) {
      stockInfo.textContent = 'Error consultando stock'
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const productoId = document.getElementById('salida-producto').value
    const varianteId = document.getElementById('salida-variante').value
    const almacenId = document.getElementById('salida-almacen').value
    const cantidad = parseInt(document.getElementById('salida-cantidad').value)
    const categoriaSalidaId = document.getElementById('salida-categoria').value
    const etiqueta = document.getElementById('salida-etiqueta').value
    const motivo = document.getElementById('salida-motivo').value.trim()

    if (!productoId || !varianteId || !almacenId || !cantidad || cantidad < 1) {
      flashMessage('Completa todos los campos obligatorios', 'error')
      return
    }

    try {
      const btn = document.getElementById('btn-registrar')
      btn.disabled = true
      btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Registrando...'

      await registrarSalida(productoId, varianteId, almacenId, cantidad, categoriaSalidaId || null, motivo, etiqueta || null)
      flashMessage(`Salida registrada: ${cantidad} unidad${cantidad > 1 ? 'es' : ''}`, 'success')
      window.location.hash = '#/movimientos'
    } catch (err) {
      console.error('Error registrando salida:', err)
      flashMessage('Error al registrar salida: ' + err.message, 'error')
      const btn = document.getElementById('btn-registrar')
      if (btn) {
        btn.disabled = false
        btn.innerHTML = '<i class="ph ph-arrow-square-out"></i> Registrar Salida'
      }
    }
  }

  await render()
}