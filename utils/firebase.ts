import { initializeApp, getApps, getApp } from 'firebase/app'
// @ts-expect-error - getReactNativePersistence exists in Metro's RN build but not in Node types
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import AsyncStorage from '@react-native-async-storage/async-storage'

const firebaseConfig = {
  apiKey: 'AIzaSyBHCzz6sL4IzIQaPkecP5p3o0IYv--iVQk',
  authDomain: 'classic-garage-c71fe.firebaseapp.com',
  projectId: 'classic-garage-c71fe',
  storageBucket: 'classic-garage-c71fe.firebasestorage.app',
  messagingSenderId: '47244320371',
  appId: '1:47244320371:web:d096cae9792d6227d09406',
  measurementId: 'G-YEXLNGK8ED',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

let auth: ReturnType<typeof getAuth>
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  })
} catch {
  auth = getAuth(app)
}

let db: ReturnType<typeof getFirestore>
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache(),
  })
} catch {
  db = getFirestore(app)
}

const storage = getStorage(app)

export { auth, db, storage }
export default app
