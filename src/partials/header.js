export function renderHeader(title = 'Dashboard', subtitle = '') {
  return `
    <header class="mb-6" data-aos="fade-down">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">${title}</h1>
          ${subtitle ? `<p class="text-dark-300 text-sm mt-1">${subtitle}</p>` : ''}
        </div>
        <div class="flex items-center gap-3">
          <div class="relative">
            <input type="text" placeholder="Buscar..." class="bg-dark-700 border border-dark-500 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-56 transition-all">
            <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"></i>
          </div>
        </div>
      </div>
    </header>
  `
}