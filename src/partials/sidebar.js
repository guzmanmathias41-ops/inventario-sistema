export function renderSidebar(activeRoute = '/') {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'ph-house' },
    { path: '/stock', label: 'Stock', icon: 'ph-package' },
    { path: '/productos', label: 'Productos', icon: 'ph-tag' },
    { path: '/movimientos', label: 'Movimientos', icon: 'ph-arrows-left-right' },
    { path: '/categorias', label: 'Categorías', icon: 'ph-folder' },
    { path: '/reportes', label: 'Reportes', icon: 'ph-chart-bar' },
  ]

  const isActive = (path) => {
    if (path === '/') return activeRoute === '/'
    return activeRoute.startsWith(path)
  }

  return `
    <aside id="sidebar" class="fixed left-0 top-0 h-full w-sidebar bg-dark-900 border-r border-dark-600 z-40 flex flex-col transition-all duration-300">
      <div class="flex items-center gap-3 px-5 py-6 border-b border-dark-600">
        <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <i class="ph ph-boxes text-white text-xl"></i>
        </div>
        <div class="sidebar-text">
          <h1 class="text-lg font-bold text-white leading-tight">Inventario</h1>
          <p class="text-xs text-dark-300">Sistema de gestión</p>
        </div>
      </div>

      <nav class="flex-1 py-4 overflow-y-auto">
        <ul class="space-y-1 px-3">
          ${navItems.map(item => `
            <li>
              <a href="#${item.path}" 
                 class="nav-link flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                   ${isActive(item.path) 
                     ? 'bg-primary/15 text-primary border-l-3 border-primary' 
                     : 'text-dark-300 hover:text-white hover:bg-dark-700'}">
                <i class="${item.icon} text-lg"></i>
                <span class="sidebar-text">${item.label}</span>
              </a>
            </li>
          `).join('')}
        </ul>

        <div class="mt-6 px-3">
          <p class="text-[10px] uppercase tracking-wider text-dark-400 px-4 mb-2 sidebar-text">Gestión</p>
          <ul class="space-y-1">
            <li>
              <a href="#/etiquetas-producto" 
                 class="nav-link flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                   ${activeRoute.startsWith('/etiquetas-producto') 
                     ? 'bg-primary/15 text-primary border-l-3 border-primary' 
                     : 'text-dark-300 hover:text-white hover:bg-dark-700'}">
                <i class="ph ph-tag-simple text-lg"></i>
                <span class="sidebar-text">Etiquetas</span>
              </a>
            </li>
            <li>
              <a href="#/fechas-registro" 
                 class="nav-link flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                   ${activeRoute.startsWith('/fechas-registro') 
                     ? 'bg-primary/15 text-primary border-l-3 border-primary' 
                     : 'text-dark-300 hover:text-white hover:bg-dark-700'}">
                <i class="ph ph-calendar-dots text-lg"></i>
                <span class="sidebar-text">Fechas</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div class="p-4 border-t border-dark-600">
        <button id="sidebar-toggle" class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-dark-300 hover:text-white hover:bg-dark-700 transition-colors text-sm">
          <i class="ph ph-sidebar-simple text-lg"></i>
          <span class="sidebar-text">Colapsar</span>
        </button>
      </div>
    </aside>
  `
}

export function initSidebarToggle() {
  const toggleBtn = document.getElementById('sidebar-toggle')
  const sidebar = document.getElementById('sidebar')
  
  if (!toggleBtn || !sidebar) return

  let collapsed = false
  
  toggleBtn.addEventListener('click', () => {
    collapsed = !collapsed
    if (collapsed) {
      sidebar.classList.remove('w-sidebar')
      sidebar.classList.add('w-sidebar-collapsed')
    } else {
      sidebar.classList.remove('w-sidebar-collapsed')
      sidebar.classList.add('w-sidebar')
    }
    
    document.querySelectorAll('.sidebar-text').forEach(el => {
      el.style.display = collapsed ? 'none' : ''
    })
    
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      mainContent.style.marginLeft = collapsed ? '72px' : '260px'
    }
  })
}