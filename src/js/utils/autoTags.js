import { db, isFirebaseReady } from '../firebase.js'
import { COLECCIONES, SUBCOLECCIONES } from '../models/schema.js'
import { productoService } from '../services/base.js'
import { collection, getDocs, query, where, writeBatch, serverTimestamp, doc } from 'firebase/firestore'

const NUEVO_TAG = 'Nuevo'
const UMBRAL_DIAS = 5

export async function autoUpdateNuevoTags() {
  if (!isFirebaseReady) return
  try {
    const etiquetasRef = collection(db, COLECCIONES.ETIQUETAS)
    const q = query(etiquetasRef, where('nombre', '==', NUEVO_TAG))
    const snapshot = await getDocs(q)

    if (snapshot.empty) return

    const nuevaEtiquetaId = snapshot.docs[0].id

    const productos = await productoService.getAll()
    const ahora = new Date()
    let cambios = 0

    const ultimaEtiquetaRef = collection(db, COLECCIONES.ETIQUETAS)
    const ultimaQ = query(ultimaEtiquetaRef, where('nombre', '==', 'Última Entrada'))
    const ultimaSnap = await getDocs(ultimaEtiquetaRef)

    if (ultimaSnap.empty) return
    const ultimaEtiquetaId = ultimaSnap.docs[0].id

    const batch = writeBatch(db)

    for (const producto of productos) {
      const pePath = `${COLECCIONES.PRODUCTOS}/${producto.id}/${SUBCOLECCIONES.PRODUCTO_ETIQUETAS}`
      const peQuery = query(collection(db, pePath), where('etiquetaId', '==', nuevaEtiquetaId))
      const peSnapshot = await getDocs(peQuery)

      for (const peDoc of peSnapshot.docs) {
        const data = peDoc.data()
        const creadoEn = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
        const dias = Math.floor((ahora - creadoEn) / (1000 * 60 * 60 * 24))

        if (dias > UMBRAL_DIAS) {
          batch.update(peDoc.ref, { etiquetaId: ultimaEtiquetaId, updatedAt: serverTimestamp() })
          cambios++
        }
      }
    }

    if (cambios > 0) {
      await batch.commit()
      console.log(`Auto-tags: ${cambios} productos cambiaron de "Nuevo" a "Última Entrada"`)
    }
  } catch (error) {
    console.error('Error en autoUpdateNuevoTags:', error)
  }
}