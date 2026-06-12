import { db } from '../firebase.js'
import { COLECCIONES } from '../models/schema.js'
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore'

export async function runSeed() {
  const results = {
    almacenes: 0,
    etiquetas: 0,
    etiquetaFechas: 0,
    categoriasProducto: 0,
    categoriasSalida: 0,
  }

  const almVentaSnap = await getDocs(query(collection(db, COLECCIONES.ALMACENES), where('nombre', '==', 'Venta')))
  if (almVentaSnap.empty) {
    await addDoc(collection(db, COLECCIONES.ALMACENES), { nombre: 'Venta', createdAt: serverTimestamp() })
    results.almacenes++
  }

  const almExhibSnap = await getDocs(query(collection(db, COLECCIONES.ALMACENES), where('nombre', '==', 'Exhibición')))
  if (almExhibSnap.empty) {
    await addDoc(collection(db, COLECCIONES.ALMACENES), { nombre: 'Exhibición', createdAt: serverTimestamp() })
    results.almacenes++
  }

  const seedEtiquetas = ['Nuevo', 'Última Entrada', 'Oferta']
  for (const nombre of seedEtiquetas) {
    const snap = await getDocs(query(collection(db, COLECCIONES.ETIQUETAS), where('nombre', '==', nombre)))
    if (snap.empty) {
      await addDoc(collection(db, COLECCIONES.ETIQUETAS), { nombre, createdAt: serverTimestamp() })
      results.etiquetas++
    }
  }

  const seedFechas = [
    { nombre: 'Lanzamiento camisas deportivas', fecha: '2025-01-15' },
    { nombre: 'Promo verano', fecha: '2025-06-01' },
    { nombre: 'Inventario anual', fecha: '2025-12-31' },
  ]
  for (const f of seedFechas) {
    const snap = await getDocs(query(collection(db, COLECCIONES.ETIQUETA_FECHAS), where('nombre', '==', f.nombre)))
    if (snap.empty) {
      await addDoc(collection(db, COLECCIONES.ETIQUETA_FECHAS), { nombre: f.nombre, fecha: f.fecha, createdAt: serverTimestamp() })
      results.etiquetaFechas++
    }
  }

  const seedCats = [
    { nombre: 'Normal', grupo: 'prenda' },
    { nombre: 'Polo', grupo: 'prenda' },
    { nombre: 'Deportiva', grupo: 'prenda' },
    { nombre: 'Camisa', grupo: 'prenda' },
    { nombre: 'Accesorios', grupo: 'prenda' },
    { nombre: 'Sudadera', grupo: 'prenda' },
    { nombre: 'Blanco', grupo: 'color' },
    { nombre: 'Negro', grupo: 'color' },
    { nombre: 'Gris', grupo: 'color' },
    { nombre: 'Rojo', grupo: 'color' },
    { nombre: 'Azul', grupo: 'color' },
    { nombre: 'Verde', grupo: 'color' },
    { nombre: 'Amarillo', grupo: 'color' },
    { nombre: 'Rosado', grupo: 'color' },
  ]
  for (const c of seedCats) {
    const snap = await getDocs(query(collection(db, COLECCIONES.CATEGORIAS_PRODUCTO), where('nombre', '==', c.nombre)))
    if (snap.empty) {
      await addDoc(collection(db, COLECCIONES.CATEGORIAS_PRODUCTO), { nombre: c.nombre, grupo: c.grupo, createdAt: serverTimestamp() })
      results.categoriasProducto++
    }
  }

  const seedCatsSalida = [
    { nombre: 'Mersh', grupo: 'persona' },
    { nombre: 'Orion', grupo: 'persona' },
    { nombre: 'Nyastia', grupo: 'persona' },
    { nombre: 'Mathias', grupo: 'persona' },
    { nombre: 'Danada', grupo: 'motivo' },
    { nombre: 'Perdida', grupo: 'motivo' },
    { nombre: 'Robo', grupo: 'motivo' },
    { nombre: 'Devolucion', grupo: 'motivo' },
    { nombre: 'Ajuste', grupo: 'operativo' },
    { nombre: 'Traslado', grupo: 'operativo' },
    { nombre: 'Exhibicion', grupo: 'operativo' },
  ]
  for (const c of seedCatsSalida) {
    const snap = await getDocs(query(collection(db, COLECCIONES.CATEGORIAS_SALIDA), where('nombre', '==', c.nombre)))
    if (snap.empty) {
      await addDoc(collection(db, COLECCIONES.CATEGORIAS_SALIDA), { nombre: c.nombre, grupo: c.grupo, createdAt: serverTimestamp() })
      results.categoriasSalida++
    }
  }

  return results
}