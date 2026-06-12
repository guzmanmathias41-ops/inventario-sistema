import {
  productoService, categoriaProductoService, etiquetaService,
  etiquetaFechaService, almacenService
} from '../services/base.js'
import {
  getVariantesByProducto, getProductoCategorias, getProductoEtiquetas,
  getProductoEtiquetaFechas, getStockByVariante, updateStockContador,
  deleteSubcollection, getVariantesPath, getStockPath,
  getProductoCategoriasPath, getProductoEtiquetasPath, getProductoEtiquetaFechasPath
} from '../services/base.js'
import { COLECCIONES, SUBCOLECCIONES, TIPO_VARIANTE_GENERAL, TIPO_VARIANTE_TALLAS, TALLAS_ROPA, COLORES_DEFAULT } from '../models/schema.js'
import { flashMessage } from '../../partials/modals.js'
import { db } from '../firebase.js'
import { collection, addDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp, writeBatch, setDoc } from 'firebase/firestore'

let selectedCategorias = []
let selectedEtiquetas = []
let selectedFechas = []
let variantes = []

export async function renderProductoForm(params, container) {
  const productoId = params.id || null
  let producto = null
  let categorias = []
  let etiquetas = []
  let fechas = []
  let almacenes = []

  async function loadData() {
    try {
      const [catsRes, etRes, fecRes, almRes] = await Promise.all([
        categoriaProductoService.getAll(),
        etiquetaService.getAll(),
        etiquetaFechaService.getAll(),
        almacenService.getAll()
      ])
      categorias = catsRes
      etiquetas = etRes
      fechas = fecRes
      almacenes = almRes

      if (productoId) {
        producto = await productoService.getById(productoId)
        if (producto) {
          const [prodCats, prodEts, prodFecs, vars] = await Promise.all([
            getProductoCategorias(productoId),
            getProductoEtiquetas(productoId),
            getProductoEtiquetaFechas(productoId),
            getVariantesByProducto(productoId)
          ])
          selectedCategorias = prodCats.map(d => d.categoriaId)
          selectedEtiquetas = prodEts.map(d => ({ id: d.id, etiquetaId: d.etiquetaId, nombre: d.etiquetaId }))
          selectedFechas = prodFecs.map(d => d.etiquetaFechaId)
          variantes = await Promise.all(vars.map(async v => {
            const stock = await getStockByVariante(productoId, v.id)
            const totalStock = stock.reduce((acc, s) => acc + (s.cantidad || 0), 0)
            return { ...v, stockInicial: totalStock }
          }))
        }
      }
    } catch (err) {
      console.error('Error cargando datos:', err)
    }

    if (almacenes.length === 0) {
      try {
        await almacenService.create({ nombre: 'Venta' })
        await almacenService.create({ nombre: 'Exhibición' })
        almacenes = await almacenService.getAll()
      } catch (e) { console.error('Error creando almacenes:', e) }
    }
  }

  async function render() {
    await loadData()

    const isEditing = !!producto
    const tipoVariante = isEditing ? (producto.tipoVariante || producto.tipo_variante || TIPO_VARIANTE_GENERAL) : TIPO_VARIANTE_GENERAL

    container.innerHTML = `
      <div data-aos="fade-up">
        <header class="mb-6" data-aos="fade-down">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">${isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h1>
              <p class="text-dark-300 text-sm mt-1">${isEditing ? producto.nombre : 'Completa los datos del producto'}</p>
            </div>
            <a href="#/productos" class="btn-secondary">
              <i class="ph ph-arrow-left"></i> Volver
            </a>
          </div>
        </header>

        <form id="producto-form" class="space-y-6" data-aos="fade-up">
          <input type="hidden" id="producto-id" value="${isEditing ? productoId : ''}">

          <div class="card">
            <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
              <i class="ph ph-info text-primary"></i> Información Básica
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-dark-300 mb-1">Nombre del producto *</label>
                <input type="text" id="prod-nombre" class="input" placeholder="Ej: Camiseta ROLY" required
                  value="${isEditing ? (producto.nombre || '') : ''}">
              </div>
              <div>
                <label class="block text-sm text-dark-300 mb-1">Código de barras</label>
                <input type="text" id="prod-codigo" class="input" placeholder="Ej: SKU-12345"
                  value="${isEditing ? (producto.codigo_barras || '') : ''}">
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-sm text-dark-300 mb-1">Tipo de variante</label>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tipo-variante" value="${TIPO_VARIANTE_TALLAS}" 
                    ${tipoVariante === TIPO_VARIANTE_TALLAS ? 'checked' : ''}
                    class="w-4 h-4 accent-primary">
                  <span class="text-dark-200 text-sm">Con tallas</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tipo-variante" value="${TIPO_VARIANTE_GENERAL}" 
                    ${tipoVariante === TIPO_VARIANTE_GENERAL ? 'checked' : ''}
                    class="w-4 h-4 accent-primary">
                  <span class="text-dark-200 text-sm">General (única talla)</span>
                </label>
              </div>
            </div>
          </div>

          <div class="card">
            <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
              <i class="ph ph-folder text-primary"></i> Categorías
            </h3>
            <div class="flex flex-wrap gap-2" id="categorias-container">
              ${categorias.map(cat => `
                <button type="button" data-cat-id="${cat.id}" data-cat-nombre="${cat.nombre}"
                  class="cat-tag px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${selectedCategorias.includes(cat.id) 
                      ? 'bg-primary/20 text-primary border border-primary/40' 
                      : 'bg-dark-600 text-dark-300 border border-dark-500 hover:border-dark-400'}">
                  ${cat.nombre}
                </button>
              `).join('')}
            </div>
            ${categorias.length === 0 ? '<p class="text-dark-500 text-sm">No hay categorías. <a href="#/categorias/producto" class="text-primary hover:underline">Crear categorías</a></p>' : ''}
          </div>

          <div class="card">
            <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
              <i class="ph ph-tag-simple text-accent-green"></i> Etiquetas
            </h3>
            <div class="flex flex-wrap gap-2" id="etiquetas-container">
              ${etiquetas.map(et => `
                <button type="button" data-et-id="${et.id}" data-et-nombre="${et.nombre}"
                  class="et-tag px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${selectedEtiquetas.some(se => se.etiquetaId === et.id || se.id === et.id)
                      ? 'bg-accent-green/20 text-accent-green border border-accent-green/40'
                      : 'bg-dark-600 text-dark-300 border border-dark-500 hover:border-dark-400'}">
                  ${et.nombre}
                </button>
              `).join('')}
            </div>
            ${etiquetas.length === 0 ? '<p class="text-dark-500 text-sm">No hay etiquetas. <a href="#/etiquetas-producto" class="text-primary hover:underline">Crear etiquetas</a></p>' : ''}
          </div>

          <div class="card">
            <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
              <i class="ph ph-calendar-dots text-accent-yellow"></i> Fechas de Registro
            </h3>
            <div class="flex flex-wrap gap-2" id="fechas-container">
              ${fechas.map(f => `
                <button type="button" data-fecha-id="${f.id}" data-fecha-nombre="${f.nombre} ${f.fecha || ''}"
                  class="fecha-tag px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${selectedFechas.includes(f.id)
                      ? 'bg-accent-yellow/20 text-accent-yellow border border-accent-yellow/40'
                      : 'bg-dark-600 text-dark-300 border border-dark-500 hover:border-dark-400'}">
                  <i class="ph ph-calendar-dots mr-1"></i>${f.nombre} ${f.fecha ? `(${f.fecha})` : ''}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="card" id="variantes-section">
            <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
              <i class="ph ph-swap text-primary"></i> Variantes
            </h3>
            <div id="variantes-list">
              ${variantes.length === 0 ? `
                <p class="text-dark-500 text-sm mb-4">No hay variantes. Se creará una variante por defecto al guardar.</p>
              ` : variantes.map((v, i) => renderVarianteRow(v, i)).join('')}
            </div>
            <button type="button" id="btn-add-variante" class="btn-secondary mt-3">
              <i class="ph ph-plus"></i> Agregar Variante
            </button>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <a href="#/productos" class="btn-secondary">Cancelar</a>
            <button type="submit" class="btn-primary" id="btn-guardar">
              <i class="ph ph-floppy-disk"></i> ${isEditing ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    `

    bindEvents()
    if (window.AOS) window.AOS.refresh()
  }

  function renderVarianteRow(v, index) {
    const tipoVariante = document.querySelector('input[name="tipo-variante"]:checked')?.value || TIPO_VARIANTE_GENERAL
    const isTallas = tipoVariante === TIPO_VARIANTE_TALLAS

    return `
      <div class="flex items-center gap-3 p-3 rounded-lg bg-dark-700 border border-dark-500 mb-2" data-variante-row="${index}">
        <input type="text" class="input flex-1 variante-codigo" placeholder="Código variante" value="${v.codigo_variante || v.codigoVariante || ''}">
        ${isTallas ? `
          <select class="select variante-talla w-32">
            <option value="GENERAL">GENERAL</option>
            ${TALLAS_ROPA.map(t => `
              <option value="${t}" ${(v.talla || 'GENERAL') === t ? 'selected' : ''}>${t}</option>
            `).join('')}
          </select>
        ` : `
          <input type="hidden" class="variante-talla" value="GENERAL">
        `}
        <input type="text" class="input w-32 variante-color" placeholder="Color" value="${v.color || ''}" list="colores-list">
        <input type="number" class="input w-24 variante-stock" placeholder="Stock" min="0" value="${v.stockInicial || 0}">
        <button type="button" data-remove-variante="${index}" class="text-dark-400 hover:text-accent-red transition-colors">
          <i class="ph ph-x text-lg"></i>
        </button>
      </div>
    `
  }

  function bindEvents() {
    document.querySelectorAll('.cat-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.dataset.catId
        const idx = selectedCategorias.indexOf(catId)
        if (idx > -1) {
          selectedCategorias.splice(idx, 1)
          btn.classList.remove('bg-primary/20', 'text-primary', 'border-primary/40')
          btn.classList.add('bg-dark-600', 'text-dark-300', 'border-dark-500')
        } else {
          selectedCategorias.push(catId)
          btn.classList.add('bg-primary/20', 'text-primary', 'border-primary/40')
          btn.classList.remove('bg-dark-600', 'text-dark-300', 'border-dark-500')
        }
      })
    })

    document.querySelectorAll('.et-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const etId = btn.dataset.etId
        const idx = selectedEtiquetas.findIndex(e => e.etiquetaId === etId || e.id === etId)
        if (idx > -1) {
          selectedEtiquetas.splice(idx, 1)
          btn.classList.remove('bg-accent-green/20', 'text-accent-green', 'border-accent-green/40')
          btn.classList.add('bg-dark-600', 'text-dark-300', 'border-dark-500')
        } else {
          selectedEtiquetas.push({ etiquetaId: etId, nombre: btn.dataset.etNombre })
          btn.classList.add('bg-accent-green/20', 'text-accent-green', 'border-accent-green/40')
          btn.classList.remove('bg-dark-600', 'text-dark-300', 'border-dark-500')
        }
      })
    })

    document.querySelectorAll('.fecha-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const fechaId = btn.dataset.fechaId
        const idx = selectedFechas.indexOf(fechaId)
        if (idx > -1) {
          selectedFechas.splice(idx, 1)
          btn.classList.remove('bg-accent-yellow/20', 'text-accent-yellow', 'border-accent-yellow/40')
          btn.classList.add('bg-dark-600', 'text-dark-300', 'border-dark-500')
        } else {
          selectedFechas.push(fechaId)
          btn.classList.add('bg-accent-yellow/20', 'text-accent-yellow', 'border-accent-yellow/40')
          btn.classList.remove('bg-dark-600', 'text-dark-300', 'border-dark-500')
        }
      })
    })

    document.querySelectorAll('input[name="tipo-variante"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const tipo = radio.value
        const section = document.getElementById('variantes-section')
        if (tipo === TIPO_VARIANTE_GENERAL) {
          variantes = [{ talla: 'GENERAL', color: '', codigo_variante: '', stockInicial: 0 }]
        }
        refreshVariantes()
      })
    })

    document.getElementById('btn-add-variante')?.addEventListener('click', () => {
      variantes.push({ talla: 'S', color: '', codigo_variante: '', stockInicial: 0 })
      refreshVariantes()
    })

    document.getElementById('producto-form')?.addEventListener('submit', handleSubmit)
  }

  function refreshVariantes() {
    const listEl = document.getElementById('variantes-list')
    if (!listEl) return
    const tipoVariante = document.querySelector('input[name="tipo-variante"]:checked')?.value || TIPO_VARIANTE_GENERAL

    if (tipoVariante === TIPO_VARIANTE_GENERAL && variantes.length === 0) {
      variantes = [{ talla: 'GENERAL', color: '', codigo_variante: '', stockInicial: 0 }]
    }

    listEl.innerHTML = variantes.length === 0
      ? '<p class="text-dark-500 text-sm mb-4">No hay variantes. Se creará una variante por defecto al guardar.</p>'
      : variantes.map((v, i) => renderVarianteRow(v, i)).join('')

    listEl.querySelectorAll('[data-remove-variante]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.removeVariante)
        variantes.splice(idx, 1)
        refreshVariantes()
      })
    })

    listEl.querySelectorAll('.variante-codigo, .variante-talla, .variante-color, .variante-stock').forEach(input => {
      input.addEventListener('change', (e) => {
        const row = e.target.closest('[data-variante-row]')
        const idx = parseInt(row?.dataset.varianteRow || 0)
        if (variantes[idx]) {
          if (e.target.classList.contains('variante-codigo')) variantes[idx].codigo_variante = e.target.value
          if (e.target.classList.contains('variante-talla')) variantes[idx].talla = e.target.value
          if (e.target.classList.contains('variante-color')) variantes[idx].color = e.target.value
          if (e.target.classList.contains('variante-stock')) variantes[idx].stockInicial = parseInt(e.target.value) || 0
        }
      })
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const id = document.getElementById('producto-id').value
    const nombre = document.getElementById('prod-nombre').value.trim()
    const codigo_barras = document.getElementById('prod-codigo').value.trim()
    const tipoVariante = document.querySelector('input[name="tipo-variante"]:checked')?.value || TIPO_VARIANTE_GENERAL

    if (!nombre) {
      flashMessage('El nombre es obligatorio', 'error')
      return
    }

    try {
      document.getElementById('btn-guardar').disabled = true
      document.getElementById('btn-guardar').innerHTML = '<i class="ph ph-spinner animate-spin"></i> Guardando...'

      let productoIdSave = id

      if (id) {
        await productoService.update(id, { nombre, codigo_barras, tipoVariante })
        flashMessage('Producto actualizado', 'success')
      } else {
        productoIdSave = await productoService.create({ nombre, codigo_barras, tipoVariante })
        flashMessage('Producto creado', 'success')
      }

      await deleteSubcollection(`${COLECCIONES.PRODUCTOS}/${productoIdSave}`, SUBCOLECCIONES.PRODUCTO_CATEGORIAS)
      for (const catId of selectedCategorias) {
        await addDoc(collection(db, getProductoCategoriasPath(productoIdSave)), {
          categoriaId: catId,
          createdAt: serverTimestamp(),
        })
      }

      await deleteSubcollection(`${COLECCIONES.PRODUCTOS}/${productoIdSave}`, SUBCOLECCIONES.PRODUCTO_ETIQUETAS)
      for (const et of selectedEtiquetas) {
        await addDoc(collection(db, getProductoEtiquetasPath(productoIdSave)), {
          etiquetaId: et.etiquetaId || et.id,
          createdAt: serverTimestamp(),
        })
      }

      await deleteSubcollection(`${COLECCIONES.PRODUCTOS}/${productoIdSave}`, SUBCOLECCIONES.PRODUCTO_ETIQUETA_FECHAS)
      for (const fechaId of selectedFechas) {
        await addDoc(collection(db, getProductoEtiquetaFechasPath(productoIdSave)), {
          etiquetaFechaId: fechaId,
          createdAt: serverTimestamp(),
        })
      }

      if (!id) {
        const almacenesData = await almacenService.getAll()
        const almacenVenta = almacenesData.find(a => a.nombre === 'Venta')

        const variantesToCreate = tipoVariante === TIPO_VARIANTE_GENERAL
          ? [{ talla: 'GENERAL', color: '', codigo_variante: codigo_barras || `VAR-${Date.now()}`, stockInicial: 0 }]
          : (variantes.length > 0 ? variantes : [])

        for (const v of variantesToCreate) {
          const varRef = doc(collection(db, getVariantesPath(productoIdSave)))
          await setDoc(varRef, {
            talla: v.talla || 'GENERAL',
            color: v.color || '',
            codigo_variante: v.codigo_variante || `VAR-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            createdAt: serverTimestamp(),
          })

          const stockQty = v.stockInicial || 0
          if (almacenVenta && stockQty > 0) {
            await updateStockContador(productoIdSave, varRef.id, almacenVenta.id, stockQty, 'disponible')
          }
        }
      }

      window.location.hash = '#/productos'
    } catch (err) {
      console.error('Error guardando producto:', err)
      flashMessage('Error al guardar: ' + err.message, 'error')
      document.getElementById('btn-guardar').disabled = false
      document.getElementById('btn-guardar').innerHTML = '<i class="ph ph-floppy-disk"></i> Guardar'
    }
  }

  await render()
}