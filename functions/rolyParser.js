const pdfParse = require('pdf-parse')

const TALLAS_ROPA = ['XXL', 'XL', 'L', 'M', 'S', 'KIDS']
const TIPO_VARIANTE_GENERAL = 'general'
const TIPO_VARIANTE_TALLAS = 'tallas'

const COLORES_CONOCIDOS = [
  'Negro', 'Blanco', 'Rojo', 'Azul', 'Verde', 'Amarillo',
  'Naranja', 'Granate', 'Royal', 'Lima', 'Natural',
  'Gris', 'Rosa', 'Morado', 'Marrón', 'Beige', 'Azul Marino'
]

const CATEGORIAS_PRENDA = [
  'Camiseta', 'Polo', 'Camisa', 'Sudadera', 'Chaqueta',
  'Pantalón', 'Short', 'Falda', 'Vestido', 'Buzo'
]

const BOLSA_KEYWORDS = ['BOLSA', 'MOCHILA', 'TAZA']

function splitAtTallaMarker(line) {
  const lastTIndex = line.lastIndexOf('T/')
  if (lastTIndex === -1) return { base: line, tallaPart: '' }
  return {
    base: line.substring(0, lastTIndex).trim(),
    tallaPart: line.substring(lastTIndex).trim()
  }
}

function parseNumericSuffix(tallaPart) {
  const match = tallaPart.match(/^T\/(\d+)(?:\s*\/\s*(\d+))?/)
  if (!match) return null
  const num = parseInt(match[1])
  if (num === 1) return 'GENERAL'
  if (num <= 10) return 'KIDS'
  return num.toString()
}

function extractTalla(tallaPart) {
  if (!tallaPart) return 'GENERAL'
  const upper = tallaPart.toUpperCase()
  for (const talla of TALLAS_ROPA) {
    if (upper.includes(talla)) return talla
  }
  const numeric = parseNumericSuffix(tallaPart)
  if (numeric) return numeric
  return 'GENERAL'
}

function extractBaseName(description) {
  const { base } = splitAtTallaMarker(description)
  let nombre = base.replace(/\s+/g, ' ').trim()
  for (const color of COLORES_CONOCIDOS) {
    const regex = new RegExp(`\\b${color}\\b`, 'gi')
    nombre = nombre.replace(regex, '').trim()
  }
  nombre = nombre.replace(/\s+/g, ' ').trim()
  return nombre
}

function detectColorNombre(description) {
  for (const color of COLORES_CONOCIDOS) {
    const regex = new RegExp(`\\b${color}\\b`, 'gi')
    if (regex.test(description)) return color
  }
  return null
}

function detectTipoVariante(nombre) {
  const upper = nombre.toUpperCase()
  for (const kw of BOLSA_KEYWORDS) {
    if (upper.includes(kw)) return TIPO_VARIANTE_GENERAL
  }
  return TIPO_VARIANTE_TALLAS
}

function detectCategoriaNombre(nombre) {
  const upper = nombre.toUpperCase()
  for (const kw of BOLSA_KEYWORDS) {
    if (upper.includes(kw)) {
      if (kw === 'BOLSA') return 'Bolsa'
      if (kw === 'MOCHILA') return 'Mochila'
      if (kw === 'TAZA') return 'Taza'
    }
  }
  for (const cat of CATEGORIAS_PRENDA) {
    if (upper.includes(cat.toUpperCase())) return cat
  }
  return 'Prenda'
}

function extractQtyFromLine(line) {
  const matches = line.match(/\b(\d+)\b/g)
  if (!matches || matches.length === 0) return 0
  return parseInt(matches[matches.length - 1]) || 0
}

function verifyParsedProducts(products, rawLines) {
  return products.map(product => {
    if (!product.nombre || product.nombre.trim() === '') {
      product.nombre = 'Producto sin nombre'
      product.corregido = true
    }
    if (!product.cantidad || product.cantidad <= 0) {
      const qty = extractQtyFromLine(product.rawLine || '')
      product.cantidad = qty
      product.corregido = true
    }
    return product
  })
}

async function parseRolyPdf(pdfBuffer) {
  const pdfData = await pdfParse(pdfBuffer)
  const text = pdfData.text
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  const productos = []
  let lineasLeidas = 0
  let productosVerificados = 0
  let correcciones = 0

  for (const line of lines) {
    lineasLeidas++
    if (line.length < 5) continue

    const { base, tallaPart } = splitAtTallaMarker(line)
    const nombre = extractBaseName(line)
    const color = detectColorNombre(line)
    const talla = extractTalla(tallaPart)
    const tipoVariante = detectTipoVariante(nombre)
    const categoria = detectCategoriaNombre(nombre)
    const cantidad = extractQtyFromLine(line)

    productos.push({
      nombre,
      color,
      talla: tipoVariante === TIPO_VARIANTE_GENERAL ? 'GENERAL' : talla,
      tipoVariante,
      categoria,
      cantidad,
      rawLine: line,
      destino: 'stock',
    })
  }

  const verified = verifyParsedProducts(productos, lines)
  productosVerificados = verified.length
  correcciones = verified.filter(p => p.corregido).length

  const agrupados = agruparPorNombreColor(verified)

  return {
    lineasLeidas,
    productosVerificados,
    correcciones,
    productos: agrupados,
  }
}

function agruparPorNombreColor(productos) {
  const grupos = {}

  for (const p of productos) {
    const key = `${p.nombre}|||${p.color || 'sin-color'}`
    if (!grupos[key]) {
      grupos[key] = {
        nombre: p.nombre,
        color: p.color,
        categoria: p.categoria,
        tipoVariante: p.tipoVariante,
        destino: 'stock',
        variantes: [],
      }
    }

    const varianteExistente = grupos[key].variantes.find(v => v.talla === p.talla)
    if (varianteExistente) {
      varianteExistente.cantidad += p.cantidad
    } else {
      grupos[key].variantes.push({
        talla: p.talla,
        cantidad: p.cantidad,
      })
    }
  }

  return Object.values(grupos)
}

module.exports = { parseRolyPdf }