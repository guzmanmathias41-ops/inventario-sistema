const functions = require('firebase-functions')
const { parseRolyPdf } = require('./rolyParser')

exports.parseRolyPdf = functions.https.onCall(async (data, context) => {
  const { pdfBase64 } = data

  if (!pdfBase64) {
    throw new functions.https.HttpsError('invalid-argument', 'No se proporcionó el PDF')
  }

  try {
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    const result = await parseRolyPdf(pdfBuffer)
    return result
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw new functions.https.HttpsError('internal', `Error al procesar PDF: ${error.message}`)
  }
})

exports.exportBackup = functions.https.onCall(async (data, context) => {
  try {
    const admin = require('firebase-admin')
    const bucket = admin.storage().bucket()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `backups/inventario_${timestamp}.json`

    const db = admin.firestore()
    const collections = [
      'almacenes', 'categorias_producto', 'categorias_salida',
      'productos', 'producto_categorias', 'etiquetas',
      'producto_etiquetas', 'etiqueta_fechas', 'producto_etiqueta_fechas',
      'variantes_producto', 'stock_almacen', 'movimientos',
      'pedidos', 'pedido_detalles'
    ]

    const backup = {}
    for (const colName of collections) {
      const snapshot = await db.collection(colName).get()
      backup[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    }

    await bucket.file(filename).save(JSON.stringify(backup, null, 2), {
      contentType: 'application/json',
    })

    return { success: true, filename, timestamp }
  } catch (error) {
    console.error('Error creating backup:', error)
    throw new functions.https.HttpsError('internal', `Error al crear backup: ${error.message}`)
  }
})