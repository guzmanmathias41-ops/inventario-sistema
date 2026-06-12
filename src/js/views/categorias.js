export async function renderCategorias(params, container) {
  container.innerHTML = `
    <div data-aos="fade-up">
      <header class="mb-6" data-aos="fade-down">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-white">Categorías</h1>
            <p class="text-dark-300 text-sm mt-1">Gestión de categorías, etiquetas y fechas</p>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" data-aos="fade-up">
        <a href="#/categorias/producto" class="card-hover flex flex-col items-center p-8 cursor-pointer group">
          <div class="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i class="ph ph-folder text-primary text-2xl"></i>
          </div>
          <h3 class="text-base font-semibold text-white mb-1">Categorías de Producto</h3>
          <p class="text-dark-400 text-sm text-center">Prendas, colores y más</p>
        </a>

        <a href="#/categorias/salida" class="card-hover flex flex-col items-center p-8 cursor-pointer group">
          <div class="w-14 h-14 rounded-2xl bg-accent-orange/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i class="ph ph-sign-out text-accent-orange text-2xl"></i>
          </div>
          <h3 class="text-base font-semibold text-white mb-1">Categorías de Salida</h3>
          <p class="text-dark-400 text-sm text-center">Persona, motivo, operativo</p>
        </a>

        <a href="#/etiquetas-producto" class="card-hover flex flex-col items-center p-8 cursor-pointer group">
          <div class="w-14 h-14 rounded-2xl bg-accent-green/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i class="ph ph-tag-simple text-accent-green text-2xl"></i>
          </div>
          <h3 class="text-base font-semibold text-white mb-1">Etiquetas</h3>
          <p class="text-dark-400 text-sm text-center">Etiquetas flexibles</p>
        </a>

        <a href="#/fechas-registro" class="card-hover flex flex-col items-center p-8 cursor-pointer group">
          <div class="w-14 h-14 rounded-2xl bg-accent-yellow/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i class="ph ph-calendar-dots text-accent-yellow text-2xl"></i>
          </div>
          <h3 class="text-base font-semibold text-white mb-1">Fechas de Registro</h3>
          <p class="text-dark-400 text-sm text-center">Etiquetas con fecha</p>
        </a>
      </div>
    </div>
  `

  if (window.AOS) window.AOS.refresh()
}