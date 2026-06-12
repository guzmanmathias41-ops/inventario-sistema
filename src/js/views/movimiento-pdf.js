import { flashMessage } from '../../partials/modals.js'
import { parseRolyPdfFromClient, procesarProductosPdf } from '../services/movimiento-service.js'

let parsedData = null
let productosDestino = []

export async function renderMovimientoPdf(params, container) {
  parsedData = null
  productosDestino = []

  async function render() {
    container.innerHTML = `
      <div data-aos="fade-up">
        <header class="mb-6" data-aos="fade-down">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Escanear PDF ROLY</h1>
              <p class="text-dark-300 text-sm mt-1">Cargar PDF del proveedor para registrar productos</p>
            </div>
            <a href="#/movimientos" class="btn-secondary">
              <i class="ph ph-arrow-left"></i> Volver
            </a>
          </div>
        </header>

        <input type="hidden" id="destino-mixta" value="mixta">

        <div class="card mb-5" data-aos="fade-up">
          <h3 class="text-white font-semibold mb-4 flex items-center gap-2">
            <i class="ph ph-file-pdf text-primary"></i> Cargar PDF
          </h3>
          <div id="upload-zone" class="border-2 border-dashed border-dark-500 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
            <i class="ph ph-cloud-arrow-up text-4xl text-dark-400 mb-3 block"></i>
            <p class="text-dark-300 mb-1">Arrastra un archivo PDF aquí o haz clic para seleccionar</p>
            <p class="text-dark-500 text-sm">Solo archivos PDF del proveedor ROLY</p>
            <input type="file" id="pdf-input" accept=".pdf" class="hidden">
          </div>
          <div id="pdf-status" class="mt-3 hidden">
            <div class="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <i class="ph ph-file text-primary text-lg"></i>
              <span id="pdf-filename" class="text-primary text-sm font-medium"></span>
              <button id="btn-remove-pdf" class="ml-auto text-dark-400 hover:text-accent-red transition-colors">
                <i class="ph ph-x text-lg"></i>
              </button>
            </div>
          </div>
        </div>

        <div id="verificacion-section" class="hidden" data-aos="fade-up"></div>
        <div id="preview-section" class="hidden" data-aos="fade-up"></div>
        <div id="confirm-section" class="hidden" data-aos="fade-up"></div>
      </div>
    `

    bindEvents()
    if (window.AOS) window.AOS.refresh()
  }

  function bindEvents() {
    const uploadZone = document.getElementById('upload-zone')
    const pdfInput = document.getElementById('pdf-input')

    uploadZone?.addEventListener('click', () => pdfInput?.click())
    uploadZone?.addEventListener('dragover', (e) => {
      e.preventDefault()
      uploadZone.classList.add('border-primary')
    })
    uploadZone?.addEventListener('dragleave', () => {
      uploadZone.classList.remove('border-primary')
    })
    uploadZone?.addEventListener('drop', (e) => {
      e.preventDefault()
      uploadZone.classList.remove('border-primary')
      const file = e.dataTransfer.files[0]
      if (file && file.type === 'application/pdf') handleFile(file)
      else flashMessage('Solo se aceptan archivos PDF', 'error')
    })

    pdfInput?.addEventListener('change', (e) => {
      const file = e.target.files[0]
      if (file) handleFile(file)
    })

    document.getElementById('btn-remove-pdf')?.addEventListener('click', () => {
      parsedData = null
      productosDestino = []
      document.getElementById('pdf-status')?.classList.add('hidden')
      document.getElementById('verificacion-section')?.classList.add('hidden')
      document.getElementById('preview-section')?.classList.add('hidden')
      document.getElementById('confirm-section')?.classList.add('hidden')
      if (pdfInput) pdfInput.value = ''
    })
  }

  async function handleFile(file) {
    const pdfStatus = document.getElementById('pdf-status')
    const pdfFilename = document.getElementById('pdf-filename')
    const verifSection = document.getElementById('verificacion-section')

    pdfFilename.textContent = file.name + ' — Procesando...'
    pdfStatus?.classList.remove('hidden')

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1]

        try {
          parsedData = await parseRolyPdfFromClient(base64)

          productosDestino = parsedData.productos.map(p => ({
            ...p,
            destino: 'stock'
          }))

          pdfFilename.textContent = file.name + ' — Procesado correctamente'

          verifSection.innerHTML = `
            <div class="verificacion-summary card mb-5">
              <h3 class="text-white font-semibold mb-3 flex items-center gap-2">
                <i class="ph ph-check-circle text-accent-green"></i> Verificación del PDF
              </h3>
              <div class="grid grid-cols-3 gap-4">
                <div class="text-center p-3 rounded-lg bg-dark-700">
                  <p class="text-2xl font-bold text-white">${parsedData.lineasLeidas}</p>
                  <p class="text-dark-400 text-xs">Líneas leídas</p>
                </div>
                <div class="text-center p-3 rounded-lg bg-dark-700">
                  <p class="text-2xl font-bold text-primary">${parsedData.productosVerificados}</p>
                  <p class="text-dark-400 text-xs">Productos verificados</p>
                </div>
                <div class="text-center p-3 rounded-lg bg-dark-700">
                  <p class="text-2xl font-bold ${parsedData.correcciones > 0 ? 'text-accent-orange' : 'text-accent-green'}">${parsedData.correcciones}</p>
                  <p class="text-dark-400 text-xs">Correcciones</p>
                </div>
              </div>
            </div>
          `
          verifSection.classList.remove('hidden')

          renderPreview()
        } catch (err) {
          console.error('Error parseando PDF:', err)
          pdfFilename.textContent = file.name + ' — Error al procesar'
          flashMessage('Error al procesar el PDF: ' + err.message, 'error')
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      flashMessage('Error al leer el archivo', 'error')
    }
  }

  function renderPreview() {
    if (!parsedData) return
    const previewSection = document.getElementById('preview-section')
    const confirmSection = document.getElementById('confirm-section')

    previewSection.innerHTML = `
      <div class="card mb-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-white font-semibold flex items-center gap-2">
            <i class="ph ph-table text-primary"></i> Vista Previa — Modo Mixta
          </h3>
          <span class="badge-mixta"><i class="ph ph-shuffle mr-1"></i>Modo Mixta</span>
        </div>

        <div class="mixta-controls flex gap-3 mb-4">
          <button id="btn-todos-stock" class="destino-btn-stock px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-accent-green/15 text-accent-green border border-accent-green/30 hover:bg-accent-green/25">
            <i class="ph ph-arrow-square-in mr-1"></i> Todos Stock
          </button>
          <button id="btn-todos-exhibicion" class="destino-btn-exhibicion px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-accent-orange/15 text-accent-orange border border-accent-orange/30 hover:bg-accent-orange/25">
            <i class="ph ph-storefront mr-1"></i> Todos Exhibición
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-dark-600">
                <th class="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase">Producto</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase">Color</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase">Tallas</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-dark-400 uppercase">Total</th>
                <th class="text-center px-4 py-3 text-xs font-semibold text-dark-400 uppercase">Destino</th>
              </tr>
            </thead>
            <tbody>
              ${productosDestino.map((p, idx) => {
                const isExhibicion = p.destino === 'exhibicion'
                return `
                <tr class="table-row">
                  <td class="px-4 py-3 text-white font-medium">${p.nombre}</td>
                  <td class="px-4 py-3 text-dark-200 text-sm">${p.color || '—'}</td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap gap-1">
                      ${p.variantes.map(v => `<span class="badge-primary text-[10px]">${v.talla}: ${v.cantidad}</span>`).join('')}
                    </div>
                  </td>
                  <td class="px-4 py-3 text-white font-medium">${p.variantes.reduce((s, v) => s + v.cantidad, 0)}</td>
                  <td class="px-4 py-3 text-center">
                    <div class="destino-toggle flex items-center justify-center gap-1">
                      <button data-idx="${idx}" data-destino="stock" class="px-3 py-1 rounded text-xs font-medium transition-colors ${!isExhibicion ? 'bg-accent-green/20 text-accent-green' : 'bg-dark-600 text-dark-400 hover:text-dark-200'}">
                        Stock
                      </button>
                      <button data-idx="${idx}" data-destino="exhibicion" class="px-3 py-1 rounded text-xs font-medium transition-colors ${isExhibicion ? 'bg-accent-orange/20 text-accent-orange' : 'bg-dark-600 text-dark-400 hover:text-dark-200'}">
                        Exhibición
                      </button>
                    </div>
                  </td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `

    previewSection.classList.remove('hidden')

    confirmSection.innerHTML = `
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-white font-semibold flex items-center gap-2">
              <i class="ph ph-check-circle text-accent-green"></i> Confirmar Registro
            </h3>
            <p class="text-dark-400 text-sm mt-1">${productosDestino.length} productos serán procesados</p>
          </div>
          <button id="btn-confirmar-pdf" class="btn-primary">
            <i class="ph ph-check"></i> Confirmar Registro
          </button>
        </div>
      </div>
    `
    confirmSection.classList.remove('hidden')

    bindPreviewEvents()
    if (window.AOS) window.AOS.refresh()
  }

  function bindPreviewEvents() {
    document.querySelectorAll('[data-destino]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx)
        const destino = btn.dataset.destino
        productosDestino[idx].destino = destino
        renderPreview()
      })
    })

    document.getElementById('btn-todos-stock')?.addEventListener('click', () => {
      productosDestino.forEach(p => p.destino = 'stock')
      renderPreview()
    })

    document.getElementById('btn-todos-exhibicion')?.addEventListener('click', () => {
      productosDestino.forEach(p => p.destino = 'exhibicion')
      renderPreview()
    })

    document.getElementById('btn-confirmar-pdf')?.addEventListener('click', handleConfirm)
  }

  async function handleConfirm() {
    const btn = document.getElementById('btn-confirmar-pdf')
    btn.disabled = true
    btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Procesando...'

    try {
      const resultado = await procesarProductosPdf(productosDestino)

      let msg = `Procesamiento completado: ${resultado.nuevos} nuevos, ${resultado.existentes} existentes`
      if (resultado.ignorados > 0) {
        msg += `, ${resultado.ignorados} ignorados (exhibición sin stock)`
      }
      flashMessage(msg, resultado.ignorados > 0 ? 'warning' : 'success')

      if (resultado.detalles && resultado.detalles.length > 0) {
        const detalles = resultado.detalles
          .filter(d => d.motivo && d.motivo !== 'Procesado')
          .map(d => `• ${d.nombre}${d.color ? ' (' + d.color + ')' : ''}: ${d.motivo}`)
          .join('\n')

        if (detalles) {
          const { confirmModal } = await import('../../partials/modals.js')
          await confirmModal('Detalles del procesamiento:\n\n' + detalles)
        }
      }

      window.location.hash = '#/stock'
    } catch (err) {
      console.error('Error procesando productos:', err)
      flashMessage('Error al procesar: ' + err.message, 'error')
      btn.disabled = false
      btn.innerHTML = '<i class="ph ph-check"></i> Confirmar Registro'
    }
  }

  await render()
}