import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

const PLACEHOLDER_CONFIG = {
  apiKey: 'TU_API_KEY_AQUI',
  projectId: 'tu-proyecto-id',
}

const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const hasFirebaseConfig = envConfig.apiKey && envConfig.apiKey !== '' && !envConfig.apiKey.startsWith('TU_')

export const isFirebaseReady = hasFirebaseConfig

const firebaseConfig = hasFirebaseConfig ? envConfig : PLACEHOLDER_CONFIG

let app, db, functions

try {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  functions = getFunctions(app, 'us-central1')

  if (!hasFirebaseConfig) {
    console.warn(
      '%c⚠️ Firebase sin configurar. Las credenciales no están en .env.\n' +
      'La app funciona en modo offline. Agrega tus credenciales de Firebase al archivo .env\n' +
      'Ver .env.example para más información.',
      'color: #ff8c00; font-weight: bold; font-size: 14px;'
    )
  } else {
    console.log('✅ Firebase conectado al proyecto:', envConfig.projectId)
  }
} catch (err) {
  console.error('Error inicializando Firebase:', err)
  app = null
  db = null
  functions = null
}

export { app, db, functions }
export default app