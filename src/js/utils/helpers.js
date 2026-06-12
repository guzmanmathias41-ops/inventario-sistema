export function formatNumber(num) {
  if (num === null || num === undefined) return '0'
  return num.toLocaleString('es-ES')
}

export function formatDate(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function debounce(fn, delay = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function getEstadoBadge(estado) {
  const estados = {
    disponible: { class: 'badge-green', icon: 'ph-check-circle', text: 'Disponible' },
    no_disponible: { class: 'badge-red', icon: 'ph-x-circle', text: 'No Disponible' },
    exhibicion: { class: 'badge-orange', icon: 'ph-storefront', text: 'Exhibición' },
  }
  const e = estados[estado] || estados.disponible
  return `<span class="${e.class}"><i class="ph ${e.icon} mr-1"></i>${e.text}</span>`
}

export function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}