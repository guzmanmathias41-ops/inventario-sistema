import { db } from '../firebase.js'
import { COLECCIONES, SUBCOLECCIONES } from '../models/schema.js'
import { isFirebaseReady } from '../firebase.js'
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp,
  writeBatch, increment
} from 'firebase/firestore'

export class BaseService {
  constructor(collectionName) {
    this.collectionName = collectionName
    this._checkReady()
  }

  _checkReady() {
    if (!isFirebaseReady) {
      console.warn(`Servicio "${this.collectionName}" sin Firebase. Las operaciones fallarán hasta configurar .env`)
    }
  }

  async getAll() {
    if (!isFirebaseReady) return []
    try {
      const snapshot = await getDocs(collection(db, this.collectionName))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (err) {
      console.error(`Error en getAll(${this.collectionName}):`, err)
      return []
    }
  }

  async getById(id) {
    if (!isFirebaseReady) return null
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) return null
      return { id: docSnap.id, ...docSnap.data() }
    } catch (err) {
      console.error(`Error en getById(${this.collectionName}):`, err)
      return null
    }
  }

  async create(data) {
    if (!isFirebaseReady) {
      console.error('Firebase no configurado. No se puede crear.')
      return null
    }
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return docRef.id
    } catch (err) {
      console.error(`Error en create(${this.collectionName}):`, err)
      throw err
    }
  }

  async update(id, data) {
    if (!isFirebaseReady) {
      console.error('Firebase no configurado. No se puede actualizar.')
      return
    }
    try {
      const docRef = doc(db, this.collectionName, id)
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error(`Error en update(${this.collectionName}):`, err)
      throw err
    }
  }

  async remove(id) {
    if (!isFirebaseReady) {
      console.error('Firebase no configurado. No se puede eliminar.')
      return
    }
    try {
      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)
    } catch (err) {
      console.error(`Error en remove(${this.collectionName}):`, err)
      throw err
    }
  }

  async getWhere(field, operator, value) {
    if (!isFirebaseReady) return []
    try {
      const colRef = collection(db, this.collectionName)
      const q = query(colRef, where(field, operator, value))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (err) {
      console.error(`Error en getWhere(${this.collectionName}):`, err)
      return []
    }
  }

  async findOrCreate(field, value, createData = {}) {
    if (!isFirebaseReady) return null
    try {
      const results = await this.getWhere(field, '==', value)
      if (results.length > 0) return results[0]
      const id = await this.create({ [field]: value, ...createData })
      return { id, [field]: value, ...createData }
    } catch (err) {
      console.error(`Error en findOrCreate(${this.collectionName}):`, err)
      return null
    }
  }
}

export const productoService = new BaseService(COLECCIONES.PRODUCTOS)
export const categoriaProductoService = new BaseService(COLECCIONES.CATEGORIAS_PRODUCTO)
export const categoriaSalidaService = new BaseService(COLECCIONES.CATEGORIAS_SALIDA)
export const etiquetaService = new BaseService(COLECCIONES.ETIQUETAS)
export const etiquetaFechaService = new BaseService(COLECCIONES.ETIQUETA_FECHAS)
export const movimientoService = new BaseService(COLECCIONES.MOVIMIENTOS)
export const almacenService = new BaseService(COLECCIONES.ALMACENES)

export function getVariantesPath(productoId) {
  return `${COLECCIONES.PRODUCTOS}/${productoId}/${SUBCOLECCIONES.VARIANTES}`
}

export function getStockPath(productoId, varianteId) {
  return `${COLECCIONES.PRODUCTOS}/${productoId}/${SUBCOLECCIONES.VARIANTES}/${varianteId}/${SUBCOLECCIONES.STOCK_ALMACEN}`
}

export function getProductoCategoriasPath(productoId) {
  return `${COLECCIONES.PRODUCTOS}/${productoId}/${SUBCOLECCIONES.PRODUCTO_CATEGORIAS}`
}

export function getProductoEtiquetasPath(productoId) {
  return `${COLECCIONES.PRODUCTOS}/${productoId}/${SUBCOLECCIONES.PRODUCTO_ETIQUETAS}`
}

export function getProductoEtiquetaFechasPath(productoId) {
  return `${COLECCIONES.PRODUCTOS}/${productoId}/${SUBCOLECCIONES.PRODUCTO_ETIQUETA_FECHAS}`
}

export async function getVariantesByProducto(productoId) {
  if (!isFirebaseReady) return []
  try {
    const path = getVariantesPath(productoId)
    const snapshot = await getDocs(collection(db, path))
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error en getVariantesByProducto:', err)
    return []
  }
}

export async function getStockByVariante(productoId, varianteId) {
  if (!isFirebaseReady) return []
  try {
    const path = getStockPath(productoId, varianteId)
    const snapshot = await getDocs(collection(db, path))
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error en getStockByVariante:', err)
    return []
  }
}

export async function getProductoCategorias(productoId) {
  if (!isFirebaseReady) return []
  try {
    const path = getProductoCategoriasPath(productoId)
    const snapshot = await getDocs(collection(db, path))
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error en getProductoCategorias:', err)
    return []
  }
}

export async function getProductoEtiquetas(productoId) {
  if (!isFirebaseReady) return []
  try {
    const path = getProductoEtiquetasPath(productoId)
    const snapshot = await getDocs(collection(db, path))
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error en getProductoEtiquetas:', err)
    return []
  }
}

export async function getProductoEtiquetaFechas(productoId) {
  if (!isFirebaseReady) return []
  try {
    const path = getProductoEtiquetaFechasPath(productoId)
    const snapshot = await getDocs(collection(db, path))
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error en getProductoEtiquetaFechas:', err)
    return []
  }
}

export async function getAllVariantesWithStock() {
  if (!isFirebaseReady) return []
  try {
    const productos = await productoService.getAll()
    const result = []
    for (const producto of productos) {
      const variantes = await getVariantesByProducto(producto.id)
      for (const variante of variantes) {
        const stock = await getStockByVariante(producto.id, variante.id)
        result.push({
          ...variante,
          productoId: producto.id,
          productoNombre: producto.nombre,
          stock: stock.reduce((acc, s) => acc + (s.cantidad || 0), 0),
          stockPorAlmacen: stock,
        })
      }
    }
    return result
  } catch (err) {
    console.error('Error en getAllVariantesWithStock:', err)
    return []
  }
}

export async function getAllStockFlat() {
  if (!isFirebaseReady) return []
  try {
    const productos = await productoService.getAll()
    const result = []
    for (const producto of productos) {
      const variantes = await getVariantesByProducto(producto.id)
      const prodCats = await getProductoCategorias(producto.id)
      const prodFechas = await getProductoEtiquetaFechas(producto.id)
      for (const variante of variantes) {
        const stockItems = await getStockByVariante(producto.id, variante.id)
        for (const s of stockItems) {
          result.push({
            ...s,
            productoId: producto.id,
            productoNombre: producto.nombre,
            varianteId: variante.id,
            talla: variante.talla,
            color: variante.color || '',
            categorias: prodCats,
            fechas: prodFechas,
          })
        }
      }
    }
    return result
  } catch (err) {
    console.error('Error en getAllStockFlat:', err)
    return []
  }
}

export async function updateStockContador(productoId, varianteId, almacenId, delta, estado = 'disponible') {
  if (!isFirebaseReady) throw new Error('Firebase no configurado')
  const stockDocRef = doc(db, getStockPath(productoId, varianteId), almacenId)
  const stockSnap = await getDoc(stockDocRef)

  if (stockSnap.exists()) {
    await updateDoc(stockDocRef, {
      cantidad: increment(delta),
      updatedAt: serverTimestamp(),
    })
  } else {
    await setDoc(stockDocRef, {
      almacenId,
      cantidad: Math.max(delta, 0),
      estado,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
}

export async function deleteSubcollection(parentPath, subcolName) {
  if (!isFirebaseReady) return
  const snapshot = await getDocs(collection(db, `${parentPath}/${subcolName}`))
  const batchSize = 500
  let batch = writeBatch(db)
  let count = 0
  for (const d of snapshot.docs) {
    batch.delete(d.ref)
    count++
    if (count >= batchSize) {
      await batch.commit()
      batch = writeBatch(db)
      count = 0
    }
  }
  if (count > 0) await batch.commit()
}

export async function deleteProductoCascade(productoId) {
  if (!isFirebaseReady) throw new Error('Firebase no configurado')

  const variantes = await getVariantesByProducto(productoId)
  for (const variante of variantes) {
    await deleteSubcollection(
      `${COLECCIONES.PRODUCTOS}/${productoId}/${SUBCOLECCIONES.VARIANTES}/${variante.id}`,
      SUBCOLECCIONES.STOCK_ALMACEN
    )
  }

  await deleteSubcollection(`${COLECCIONES.PRODUCTOS}/${productoId}`, SUBCOLECCIONES.VARIANTES)
  await deleteSubcollection(`${COLECCIONES.PRODUCTOS}/${productoId}`, SUBCOLECCIONES.PRODUCTO_CATEGORIAS)
  await deleteSubcollection(`${COLECCIONES.PRODUCTOS}/${productoId}`, SUBCOLECCIONES.PRODUCTO_ETIQUETAS)
  await deleteSubcollection(`${COLECCIONES.PRODUCTOS}/${productoId}`, SUBCOLECCIONES.PRODUCTO_ETIQUETA_FECHAS)

  await productoService.remove(productoId)
}

export async function isNameUnique(collectionName, nombre, excludeId = null) {
  if (!isFirebaseReady) return true
  try {
    const q = query(collection(db, collectionName), where('nombre', '==', nombre))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return true
    if (excludeId) {
      return snapshot.docs.every(d => d.id !== excludeId)
    }
    return false
  } catch (err) {
    console.error('Error en isNameUnique:', err)
    return true
  }
}

export async function countProductsByCategoria(categoriaId) {
  if (!isFirebaseReady) return 0
  try {
    const productos = await productoService.getAll()
    let count = 0
    for (const producto of productos) {
      const cats = await getProductoCategorias(producto.id)
      if (cats.some(c => c.categoriaId === categoriaId)) count++
    }
    return count
  } catch (err) {
    console.error('Error en countProductsByCategoria:', err)
    return 0
  }
}

export async function isCategoriaInUse(categoriaId) {
  const count = await countProductsByCategoria(categoriaId)
  return count > 0
}

export async function countProductsByEtiqueta(etiquetaId) {
  if (!isFirebaseReady) return 0
  try {
    const productos = await productoService.getAll()
    let count = 0
    for (const producto of productos) {
      const ets = await getProductoEtiquetas(producto.id)
      if (ets.some(e => e.etiquetaId === etiquetaId)) count++
    }
    return count
  } catch (err) {
    console.error('Error en countProductsByEtiqueta:', err)
    return 0
  }
}

export async function isEtiquetaInUse(etiquetaId) {
  const count = await countProductsByEtiqueta(etiquetaId)
  return count > 0
}

export async function countProductsByEtiquetaFecha(etiquetaFechaId) {
  if (!isFirebaseReady) return 0
  try {
    const productos = await productoService.getAll()
    let count = 0
    for (const producto of productos) {
      const fecs = await getProductoEtiquetaFechas(producto.id)
      if (fecs.some(f => f.etiquetaFechaId === etiquetaFechaId)) count++
    }
    return count
  } catch (err) {
    console.error('Error en countProductsByEtiquetaFecha:', err)
    return 0
  }
}

export async function isEtiquetaFechaInUse(etiquetaFechaId) {
  const count = await countProductsByEtiquetaFecha(etiquetaFechaId)
  return count > 0
}

export async function removeEtiquetaFechaFromProducts(etiquetaFechaId) {
  if (!isFirebaseReady) return
  const productos = await productoService.getAll()
  for (const producto of productos) {
    const fecs = await getProductoEtiquetaFechas(producto.id)
    for (const f of fecs) {
      if (f.etiquetaFechaId === etiquetaFechaId) {
        await deleteDoc(doc(db, getProductoEtiquetaFechasPath(producto.id), f.id))
      }
    }
  }
}

export async function removeEtiquetaFromProducts(etiquetaId) {
  if (!isFirebaseReady) return
  const productos = await productoService.getAll()
  for (const producto of productos) {
    const ets = await getProductoEtiquetas(producto.id)
    for (const e of ets) {
      if (e.etiquetaId === etiquetaId) {
        await deleteDoc(doc(db, getProductoEtiquetasPath(producto.id), e.id))
      }
    }
  }
}

export async function removeCategoriaFromProducts(categoriaId) {
  if (!isFirebaseReady) return
  const productos = await productoService.getAll()
  for (const producto of productos) {
    const cats = await getProductoCategorias(producto.id)
    for (const c of cats) {
      if (c.categoriaId === categoriaId) {
        await deleteDoc(doc(db, getProductoCategoriasPath(producto.id), c.id))
      }
    }
  }
}