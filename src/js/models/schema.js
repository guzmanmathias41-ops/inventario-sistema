export const TALLAS_ROPA = ['XXL', 'XL', 'L', 'M', 'S', 'KIDS']
export const VARIANTES_BOLSA = 'general'
export const TIPO_VARIANTE_GENERAL = 'general'
export const TIPO_VARIANTE_TALLAS = 'tallas'

export const COLORES_DEFAULT = [
  'Negro', 'Blanco', 'Rojo', 'Azul', 'Verde', 'Amarillo',
  'Naranja', 'Granate', 'Royal', 'Lima', 'Natural',
  'Gris', 'Rosa', 'Morado', 'Marrón', 'Beige'
]

export const GRUPOS_CATEGORIA_PRODUCTO = [
  'prenda', 'color'
]

export const GRUPOS_CATEGORIA_PRODUCTO_LABELS = {
  prenda: 'Tipo de Prenda',
  color: 'Color',
}

export const GRUPOS_CATEGORIA_PRODUCTO_ICONS = {
  prenda: 'ph-shirt',
  color: 'ph-palette',
}

export const GRUPOS_CATEGORIA_SALIDA_LABELS = {
  persona: 'Personas',
  motivo: 'Motivos',
  operativo: 'Operativas',
}

export const GRUPOS_CATEGORIA_SALIDA_ICONS = {
  persona: 'ph-user',
  motivo: 'ph-warning',
  operativo: 'ph-gear',
}

export const GRUPOS_CATEGORIA_SALIDA = [
  'persona', 'motivo', 'operativo'
]

export const ESTADOS_STOCK = [
  { value: 'disponible', label: 'Disponible', color: 'green' },
  { value: 'no_disponible', label: 'No Disponible', color: 'red' },
  { value: 'exhibicion', label: 'Exhibición', color: 'orange' },
]

export const TIPOS_MOVIMIENTO = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
]

export const ETIQUETAS_MOVIMIENTO = [
  { value: 'mersh', label: 'Mersh' },
  { value: 'orion', label: 'Orion' },
  { value: 'nyastia', label: 'Nyastia' },
  { value: 'mathias', label: 'Mathias' },
  { value: 'danada', label: 'Danada' },
  { value: 'perdida', label: 'Perdida' },
  { value: 'robo', label: 'Robo' },
  { value: 'devolucion', label: 'Devolucion' },
  { value: 'compra', label: 'Compra' },
  { value: 'devolucion_cliente', label: 'Devolucion de cliente' },
  { value: 'donacion', label: 'Donacion' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'traslado', label: 'Traslado' },
  { value: 'exhibicion', label: 'Exhibicion' },
]

export const COLECCIONES = {
  ALMACENES: 'almacenes',
  CATEGORIAS_PRODUCTO: 'categorias_producto',
  CATEGORIAS_SALIDA: 'categorias_salida',
  PRODUCTOS: 'productos',
  ETIQUETAS: 'etiquetas',
  ETIQUETA_FECHAS: 'etiqueta_fechas',
  MOVIMIENTOS: 'movimientos',
  PEDIDOS: 'pedidos',
  PEDIDO_DETALLES: 'pedido_detalles',
}

export const SUBCOLECCIONES = {
  VARIANTES: 'variantes',
  STOCK_ALMACEN: 'stock_almacen',
  PRODUCTO_CATEGORIAS: 'producto_categorias',
  PRODUCTO_ETIQUETAS: 'producto_etiquetas',
  PRODUCTO_ETIQUETA_FECHAS: 'producto_etiqueta_fechas',
}