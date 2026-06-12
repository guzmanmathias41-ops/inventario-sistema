export async function renderMovimientos(params, container) {
  container.innerHTML = `
    <div data-aos="fade-up">
      <header class="mb-6" data-aos="fade-down">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-white">Movimientos</h1>
            <p class="text-dark-300 text-sm mt-1">Entradas, salidas y escaneo PDF</p>
          </div>
          <a href="#/movimientos/historial" class="btn-secondary"><i class="ph ph-clock-counter-clockwise mr-1"></i> Ver Historial</a>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8" data-aos="fade-up">
        <a href="#/movimientos/entrada/nuevo" class="card-hover flex flex-col items-center p-8 cursor-pointer group">
          <div class="w-16 h-16 rounded-2xl bg-accent-green/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i class="ph ph-file-pdf text-accent-green text-3xl"></i>
          </div>
          <h3 class="text-lg font-semibold text-white mb-1">Entrada PDF</h3>
          <p class="text-dark-400 text-sm text-center">Escanear PDF ROLY para registrar ingreso</p>
        </a>

        <a href="#/movimientos/salida/nuevo" class="card-hover flex flex-col items-center p-8 cursor-pointer group">
          <div class="w-16 h-16 rounded-2xl bg-accent-red/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i class="ph ph-arrow-square-out text-accent-red text-3xl"></i>
          </div>
          <h3 class="text-lg font-semibold text-white mb-1">Salida</h3>
          <p class="text-dark-400 text-sm text-center">Registrar salida de productos</p>
        </a>

        <a href="#/movimientos/historial" class="card-hover flex flex-col items-center p-8 cursor-pointer group">
          <div class="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i class="ph ph-clock-counter-clockwise text-primary text-3xl"></i>
          </div>
          <h3 class="text-lg font-semibold text-white mb-1">Historial</h3>
          <p class="text-dark-400 text-sm text-center">Ver registro de movimientos</p>
        </a>
      </div>
    </div>
  `

  if (window.AOS) window.AOS.refresh()
}