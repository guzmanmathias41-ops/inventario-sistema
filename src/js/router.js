const routes = {}
let currentRoute = null

export function addRoute(path, handler) {
  routes[path] = handler
}

export function navigate(path) {
  window.location.hash = '#' + path
}

export function getCurrentPath() {
  const hash = window.location.hash.slice(1) || '/'
  return hash
}

export function getRouteParams(routePattern, currentPath) {
  const paramNames = []
  const regexPattern = routePattern.replace(/:([^/]+)/g, (_, paramName) => {
    paramNames.push(paramName)
    return '([^/]+)'
  })
  const regex = new RegExp('^' + regexPattern + '$')
  const match = currentPath.match(regex)
  
  if (!match) return null

  const params = {}
  paramNames.forEach((name, i) => {
    params[name] = decodeURIComponent(match[i + 1])
  })
  return params
}

async function handleRoute() {
  const path = getCurrentPath()
  const contentEl = document.getElementById('main-content')
  
  if (!contentEl) return

  let matched = false

  for (const [pattern, handler] of Object.entries(routes)) {
    const params = getRouteParams(pattern, path)
    if (params !== null || pattern === path) {
      currentRoute = pattern
      contentEl.innerHTML = '<div class="flex items-center justify-center min-h-[60vh]"><div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>'
      
      try {
        await handler(params || {}, contentEl)
      } catch (err) {
        console.error('Route handler error:', err)
        contentEl.innerHTML = `
          <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <i class="ph ph-warning-circle text-6xl text-accent-red mb-4"></i>
            <h2 class="text-2xl font-bold text-white mb-2">Error al cargar la página</h2>
            <p class="text-dark-300 mb-6">${err.message}</p>
            <button onclick="window.location.hash='#/'" class="px-6 py-2 bg-primary hover:bg-primary-600 rounded-lg text-white font-medium transition-colors">Volver al inicio</button>
          </div>
        `
      }
      matched = true
      break
    }
  }

  if (!matched) {
    contentEl.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-[60vh] text-center" data-aos="fade-up">
        <i class="ph ph-warning-circle text-6xl text-accent-orange mb-4"></i>
        <h2 class="text-2xl font-bold text-white mb-2">Página no encontrada</h2>
        <p class="text-dark-300 mb-6">La ruta <code class="text-primary">${path}</code> no existe.</p>
        <button onclick="window.location.hash='#/'" class="px-6 py-2 bg-primary hover:bg-primary-600 rounded-lg text-white font-medium transition-colors">Volver al inicio</button>
      </div>
    `
    if (window.AOS) window.AOS.refresh()
  }
}

export function startRouter() {
  window.addEventListener('hashchange', handleRoute)
  window.addEventListener('load', handleRoute)
  handleRoute()
}