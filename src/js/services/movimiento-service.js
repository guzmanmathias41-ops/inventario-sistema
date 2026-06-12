import { db, functions, isFirebaseReady } from '../firebase.js'
import { COLECCIONES, SUBCOLECCIONES } from '../models/schema.js'
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
  query, where, orderBy, serverTimestamp, writeBatch, increment, getDoc
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import {
  getVariantesPath, getStockPath, getProductoCategoriasPath,
  getVariantesByProducto, getStockByVariante, updateStockContador,
  productoService
} from './base.js'

export async function registrarEntrada(productoId, varianteId, almacenId, cantidad, estado = 'disponible') {
  if (!isFirebaseReady) throw new Error('Firebase no configurado. Agrega las credenciales en .env')

  const stockDocRef = doc(db, getStockPath(productoId, varianteId), almacenId)
  const stockSnap = await getDoc(stockDocRef)

  const batch = writeBatch(db)

  if (stockSnap.exists()) {
    batch.update(stockDocRef, {
      cantidad: increment(cantidad),
      updatedAt: serverTimestamp(),
    })
  } else {
    batch.set(stockDocRef, {
      almacenId,
      cantidad,
      estado,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const movRef = doc(collection(db, COLECCIONES.MOVIMIENTOS))
  batch.set(movRef, {
    tipo: 'entrada',
    productoId,
    varianteId,
    almacenId,
    cantidad,
    estado,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
  return movRef.id
}

export async function registrarSalida(productoId, varianteId, almacenId, cantidad, categoriaSalidaId, motivo = '', etiqueta = '') {
  if (!isFirebaseReady) throw new Error('Firebase no configurado. Agrega las credenciales en .env')

  const stockDocRef = doc(db, getStockPath(productoId, varianteId), almacenId)
  const stockSnap = await getDoc(stockDocRef)

  if (!stockSnap.exists()) {
    throw new Error(`No hay stock para esta variante en el almacén seleccionado.`)
  }

  const currentQty = stockSnap.data().cantidad || 0
  if (currentQty < cantidad) {
    throw new Error(`Solo hay ${currentQty} unidades disponibles. Se solicitan ${cantidad}.`)
  }

  const batch = writeBatch(db)

  batch.update(stockDocRef, {
    cantidad: increment(-cantidad),
    updatedAt: serverTimestamp(),
  })

  const movRef = doc(collection(db, COLECCIONES.MOVIMIENTOS))
  batch.set(movRef, {
    tipo: 'salida',
    productoId,
    varianteId,
    almacenId,
    cantidad,
    categoriaSalidaId: categoriaSalidaId || null,
    etiqueta: etiqueta || null,
    motivo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
  return movRef.id
}

export async function parseRolyPdfFromClient(pdfBase64) {
  if (!isFirebaseReady) throw new Error('Firebase no configurado. Agrega las credenciales en .env para usar el parseo de PDF.')
  const parsePdf = httpsCallable(functions, 'parseRolyPdf')
  const result = await parsePdf({ pdfBase64 })
  return result.data
}

export async function procesarProductosPdf(productosPdf) {
  if (!isFirebaseReady) throw new Error('Firebase no configurado')
  const resultados = {
    nuevos: 0,
    existentes: 0,
    ignorados: 0,
    detalles: [],
  }

  const almacenVentaSnap = await getDocs(query(collection(db, COLECCIONES.ALMACENES), where('nombre', '==', 'Venta')))
  const almacenVenta = almacenVentaSnap.docs[0]
  const almacenVentaId = almacenVenta ? almacenVenta.id : null

  const almacenExhibSnap = await getDocs(query(collection(db, COLECCIONES.ALMACENES), where('nombre', '==', 'Exhibición')))
  const almacenExhibId = almacenExhibSnap.docs[0]?.id || null

  for (const producto of productosPdf) {
    const { nombre, color, categoria, tipoVariante, destino, variantes } = producto

    if (destino === 'exhibicion') {
      const nombreSnap = await getDocs(query(collection(db, COLECCIONES.PRODUCTOS), where('nombre', '==', nombre)))
      if (nombreSnap.empty) {
        resultados.ignorados++
        resultados.detalles.push({ nombre, color, motivo: 'No existe en stock para exhibición' })
        continue
      }

      const productoExistente = { id: nombreSnap.docs[0].id, ...nombreSnap.docs[0].data() }
      const varsSnap = await getDocs(collection(db, getVariantesPath(productoExistente.id)))
      const varianteMatch = varsSnap.docs.find(d => d.data().color === (color || ''))

      if (!varianteMatch) {
        resultados.ignorados++
        resultados.detalles.push({ nombre, color, motivo: 'Variante no encontrada para exhibición' })
        continue
      }

      const variante = { id: varianteMatch.id, ...varianteMatch.data() }

      if (almacenExhibId) {
        for (const v of variantes) {
          await updateStockContador(productoExistente.id, variante.id, almacenExhibId, v.cantidad, 'exhibicion')
        }
      }

      resultados.existentes++
      resultados.detalles.push({ nombre, color, motivo: 'Stock agregado a exhibición' })
      continue
    }

    const categoriaObj = await findOrCreateCategoria(categoria, tipoVariante)
    let productoId

    const nombreSnap = await getDocs(query(collection(db, COLECCIONES.PRODUCTOS), where('nombre', '==', nombre)))
    if (!nombreSnap.empty) {
      productoId = nombreSnap.docs[0].id
      resultados.existentes++
    } else {
      const productoRef = doc(collection(db, COLECCIONES.PRODUCTOS))
      const batch = writeBatch(db)
      batch.set(productoRef, {
        nombre,
        codigo_barras: '',
        tipoVariante: tipoVariante,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      await batch.commit()
      productoId = productoRef.id
      resultados.nuevos++

      if (categoriaObj) {
        const prodCatRef = doc(collection(db, getProductoCategoriasPath(productoId)))
        const batch2 = writeBatch(db)
        batch2.set(prodCatRef, {
          categoriaId: categoriaObj.id,
          createdAt: serverTimestamp(),
        })
        await batch2.commit()
      }

      if (color) {
        const colorCatSnap = await getDocs(query(collection(db, COLECCIONES.CATEGORIAS_PRODUCTO), where('nombre', '==', color)))
        if (!colorCatSnap.empty) {
          const prodCatColorRef = doc(collection(db, getProductoCategoriasPath(productoId)))
          const batch3 = writeBatch(db)
          batch3.set(prodCatColorRef, {
            categoriaId: colorCatSnap.docs[0].id,
            createdAt: serverTimestamp(),
          })
          await batch3.commit()
        }
      }
    }

    for (const v of variantes) {
      const varsSnap = await getDocs(collection(db, getVariantesPath(productoId)))
      const existingVar = varsSnap.docs.find(d => d.data().talla === v.talla && d.data().color === (color || ''))

      let varianteId
      if (existingVar) {
        varianteId = existingVar.id
      } else {
        const varRef = doc(collection(db, getVariantesPath(productoId)))
        const batch4 = writeBatch(db)
        batch4.set(varRef, {
          talla: v.talla,
          color: color || '',
          codigo_variante: `VAR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          createdAt: serverTimestamp(),
        })
        await batch4.commit()
        varianteId = varRef.id
      }

      if (almacenVentaId && v.cantidad > 0) {
        await updateStockContador(productoId, varianteId, almacenVentaId, v.cantidad, 'disponible')
      }

      const movRef = doc(collection(db, COLECCIONES.MOVIMIENTOS))
      const batch5 = writeBatch(db)
      batch5.set(movRef, {
        tipo: 'entrada',
        productoId,
        varianteId,
        almacenId: almacenVentaId || '',
        cantidad: v.cantidad,
        destino: destino || 'stock',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      await batch5.commit()
    }

    resultados.detalles.push({ nombre, color, motivo: 'Procesado' })
  }

  return resultados
}

async function findOrCreateCategoria(categoriaNombre, tipoVariante) {
  const snap = await getDocs(query(collection(db, COLECCIONES.CATEGORIAS_PRODUCTO), where('nombre', '==', categoriaNombre)))
  if (!snap.empty) {
    return { id: snap.docs[0].id, ...snap.docs[0].data() }
  }

  const grupo = ['Bolsa', 'Mochila', 'Taza'].includes(categoriaNombre) ? 'otro' : 'prenda'
  const ref = doc(collection(db, COLECCIONES.CATEGORIAS_PRODUCTO))
  const batch = writeBatch(db)
  batch.set(ref, {
    nombre: categoriaNombre,
    grupo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
  return { id: ref.id, nombre: categoriaNombre, grupo }
}

export async function getHistorialMovimientos(limitCount = 50) {
  const q = query(collection(db, COLECCIONES.MOVIMIENTOS), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.slice(0, limitCount).map(d => ({ id: d.id, ...d.data() }))
}

export async function vaciarHistorial() {
  const snap = await getDocs(collection(db, COLECCIONES.MOVIMIENTOS))
  const batchSize = 500
  let batch = writeBatch(db)
  let count = 0
  for (const d of snap.docs) {
    batch.delete(d.ref)
    count++
    if (count >= batchSize) {
      await batch.commit()
      batch = writeBatch(db)
      count = 0
    }
  }
  if (count > 0) await batch.commit()
  return snap.size
}