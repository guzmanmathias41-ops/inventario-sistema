export function confirmModal(message, formElement) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.id = 'modal-overlay'
    overlay.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50'
    overlay.innerHTML = `
      <div class="bg-dark-800 border border-dark-600 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" data-aos="fade-up" data-aos-duration="200">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-accent-orange/15 flex items-center justify-center flex-shrink-0">
            <i class="ph ph-warning text-accent-orange text-xl"></i>
          </div>
          <h3 class="text-lg font-semibold text-white">Confirmar acción</h3>
        </div>
        <p class="text-dark-200 text-sm mb-6 leading-relaxed">${message}</p>
        <div class="flex gap-3 justify-end">
          <button id="modal-cancel" class="px-5 py-2 rounded-lg bg-dark-600 hover:bg-dark-500 text-dark-200 text-sm font-medium transition-colors">Cancelar</button>
          <button id="modal-confirm" class="px-5 py-2 rounded-lg bg-accent-red hover:bg-red-600 text-white text-sm font-medium transition-colors">Confirmar</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
    if (window.AOS) window.AOS.refresh()

    overlay.querySelector('#modal-cancel').addEventListener('click', () => {
      overlay.remove()
      resolve(false)
    })

    overlay.querySelector('#modal-confirm').addEventListener('click', () => {
      overlay.remove()
      if (formElement) {
        formElement.submit()
      }
      resolve(true)
    })

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove()
        resolve(false)
      }
    })
  })
}

export function flashMessage(message, type = 'success') {
  const colors = {
    success: 'bg-accent-green/15 border-accent-green text-accent-green',
    error: 'bg-accent-red/15 border-accent-red text-accent-red',
    warning: 'bg-accent-orange/15 border-accent-orange text-accent-orange',
    info: 'bg-primary/15 border-primary text-primary',
  }
  
  const icons = {
    success: 'ph-check-circle',
    error: 'ph-x-circle',
    warning: 'ph-warning',
    info: 'ph-info',
  }

  const container = document.getElementById('flash-container') || createFlashContainer()
  
  const flash = document.createElement('div')
  flash.className = `flex items-center gap-3 px-5 py-3 rounded-lg border ${colors[type]} text-sm font-medium shadow-lg transition-all duration-300 transform translate-x-full`
  flash.innerHTML = `
    <i class="ph ${icons[type]} text-lg"></i>
    <span>${message}</span>
  `
  
  container.appendChild(flash)
  
  requestAnimationFrame(() => {
    flash.classList.remove('translate-x-full')
  })

  setTimeout(() => {
    flash.classList.add('translate-x-full', 'opacity-0')
    setTimeout(() => flash.remove(), 300)
  }, 4000)
}

function createFlashContainer() {
  const container = document.createElement('div')
  container.id = 'flash-container'
  container.className = 'fixed top-4 right-4 z-[100] flex flex-col gap-2'
  document.body.appendChild(container)
  return container
}

export function showToast(message, type = 'info') {
  flashMessage(message, type)
}