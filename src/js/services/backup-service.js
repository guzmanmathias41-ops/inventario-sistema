import { httpsCallable } from 'firebase/functions'
import { functions, db, isFirebaseReady } from '../firebase.js'
import { COLECCIONES, SUBCOLECCIONES } from '../models/schema.js'
import { collection, doc, getDocs, writeBatch, serverTimestamp, query, where, orderBy, limit, setDoc } from 'firebase/firestore'
import { getVariantesByProducto, getStockByVariante, getProductoCategorias, getProductoEtiquetas, getProductoEtiquetaFechas } from './base.js'
import { productoService } from './base.js'

const exportBackupFn = httpsCallable(functions, 'exportBackup')

export async function createBackup() {
  if (!isFirebaseReady) throw new Error('Firebase no configurado')
  try {
    const result = await exportBackupFn()
    return result.data
  } catch (err) {
    console.error('Error creating backup via Cloud Function, falling back to local:', err)
    return await createLocalBackup()
  }
}

async function createLocalBackup() {
  const backup = {}
  const rootCollections = Object.values(COLECCIONES)

  for (const colName of rootCollections) {
    const snapshot = await getDocs(collection(db, colName))
    backup[colName] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  const productos = backup[COLECCIONES.PRODUCTOS] || []
  const subcollections = {}

  for (const producto of productos) {
    const productoId = producto.id
    const productoSubs = {}

    const variantes = await getVariantesByProducto(productoId)
    productoSubs[SUBCOLECCIONES.VARIANTES] = variantes

    const varianteSubs = {}
    for (const variante of variantes) {
      const stock = await getStockByVariante(productoId, variante.id)
      varianteSubs[variante.id] = { [SUBCOLECCIONES.STOCK_ALMACEN]: stock }
    }
    productoSubs._varianteSubs = varianteSubs

    productoSubs[SUBCOLECCIONES.PRODUCTO_CATEGORIAS] = await getProductoCategorias(productoId)
    productoSubs[SUBCOLECCIONES.PRODUCTO_ETIQUETAS] = await getProductoEtiquetas(productoId)
    productoSubs[SUBCOLECCIONES.PRODUCTO_ETIQUETA_FECHAS] = await getProductoEtiquetaFechas(productoId)

    subcollections[productoId] = productoSubs
  }

  backup._subcollections = subcollections

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `inventario_${timestamp}.json`

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  return { success: true, filename, timestamp, local: true }
}

export async function restoreFromBackup(jsonData) {
  if (!isFirebaseReady) throw new Error('Firebase no configurado')

  const rootCollections = Object.values(COLECCIONES)

  for (const colName of rootCollections) {
    if (!jsonData[colName]) continue
    const docs = jsonData[colName]
    const batchSize = 500
    let batch = writeBatch(db)
    let count = 0

    for (const docData of docs) {
      const { id, ...data } = docData
      const docRef = doc(db, colName, id)
      batch.set(docRef, { ...data, restoredAt: serverTimestamp() }, { merge: true })
      count++
      if (count >= batchSize) {
        await batch.commit()
        batch = writeBatch(db)
        count = 0
      }
    }
    if (count > 0) await batch.commit()
  }

  const subcollections = jsonData._subcollections || {}
  for (const [productoId, productoSubs] of Object.entries(subcollections)) {
    if (productoId === '_varianteSubs') continue

    for (const [subName, subDocs] of Object.entries(productoSubs)) {
      if (subName === '_varianteSubs') continue

      const subPath = `${COLECCIONES.PRODUCTOS}/${productoId}/${subName}`
      let batch = writeBatch(db)
      let count = 0

      for (const docData of (subDocs || [])) {
        const { id, ...data } = docData
        const docRef = doc(db, subPath, id)
        batch.set(docRef, { ...data, restoredAt: serverTimestamp() }, { merge: true })
        count++
        if (count >= 500) {
          await batch.commit()
          batch = writeBatch(db)
          count = 0
        }
      }
      if (count > 0) await batch.commit()
    }

    const varianteSubs = productoSubs._varianteSubs || {}
    for (const [varianteId, varSubs] of Object.entries(varianteSubs)) {
      for (const [subName, subDocs] of Object.entries(varSubs)) {
        const subPath = `${COLECCIONES.PRODUCTOS}/${productoId}/${SUBCOLECCIONES.VARIANTES}/${varianteId}/${subName}`
        let batch = writeBatch(db)
        let count = 0

        for (const docData of (subDocs || [])) {
          const { id, ...data } = docData
          const docRef = doc(db, subPath, id)
          batch.set(docRef, { ...data, restoredAt: serverTimestamp() }, { merge: true })
          count++
          if (count >= 500) {
            await batch.commit()
            batch = writeBatch(db)
            count = 0
          }
        }
        if (count > 0) await batch.commit()
      }
    }
  }

  return true
}

export async function getLastBackupTime() {
  try {
    const q = query(collection(db, '_metadata'), where('type', '==', 'backup'), orderBy('createdAt', 'desc'), limit(1))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const data = snap.docs[0].data()
      return data.createdAt?.toDate() || null
    }
  } catch (err) {
    console.error('Error getting last backup time:', err)
  }
  return null
}