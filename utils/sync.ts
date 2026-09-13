import { doc, setDoc, deleteDoc, serverTimestamp, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage'
import { auth, db, storage } from './firebase'
import { getDatabase } from '../db/schema'
import { getAllCars, getCar, upsertCar, type Car } from '../db/cars'
import { getServicesForCar, getService, upsertService, type ServiceEntry } from '../db/services'

let syncInProgress = false

function getCarRef(userId: string, carId: number) {
  return doc(db, 'users', userId, 'cars', carId.toString())
}

function getServiceRef(userId: string, serviceId: number) {
  return doc(db, 'users', userId, 'services', serviceId.toString())
}

function getPhotoRef(userId: string, filename: string) {
  return ref(storage, `users/${userId}/photos/${filename}`)
}

function isLocalPhoto(uri: string | null | undefined): uri is string {
  if (!uri) return false
  return uri.startsWith('file:') || uri.startsWith('content:') || uri.startsWith('/')
}

function keepLocalPhoto(remote: unknown, local: string | null | undefined): string | null {
  const url = typeof remote === 'string' && remote ? remote : null
  if (url && !isLocalPhoto(url)) return url
  return local || url
}

function getUserId(): string | null {
  return auth.currentUser?.uid || null
}

function millis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
  }
  if (typeof value === 'string') {
    const t = Date.parse(value)
    return Number.isFinite(t) ? t : 0
  }
  return 0
}

async function uploadPhoto(userId: string, localUri: string): Promise<{ url: string | null; code: string | null }> {
  try {
    const { readAsStringAsync } = await import('expo-file-system/legacy')
    const base64 = await readAsStringAsync(localUri, { encoding: 'base64' })
    const filename = localUri.split('/').pop() || `${Date.now()}.jpg`
    const storageRef = getPhotoRef(userId, filename)
    const bytes = decodeBase64(base64)
    await uploadBytes(storageRef, bytes, { contentType: 'image/jpeg' })
    return { url: await getDownloadURL(storageRef), code: null }
  } catch (err) {
    const code = typeof (err as { code?: string })?.code === 'string' ? (err as { code: string }).code : 'unknown'
    return { url: null, code }
  }
}

function decodeBase64(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  const bytes: number[] = []
  let i = 0
  while (i < base64.length) {
    const enc1 = chars.indexOf(base64[i++])
    const enc2 = chars.indexOf(base64[i++])
    const enc3 = chars.indexOf(base64[i++])
    const enc4 = chars.indexOf(base64[i++])
    const chr1 = (enc1 << 2) | (enc2 >> 4)
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
    const chr3 = ((enc3 & 3) << 6) | enc4
    bytes.push(chr1)
    if (enc3 !== 64) bytes.push(chr2)
    if (enc4 !== 64) bytes.push(chr3)
  }
  return new Uint8Array(bytes)
}

export async function pushCar(userId: string, car: Car, failedCodes?: Set<string>): Promise<number> {
  const carRef = getCarRef(userId, car.id)
  const docSnap = await getDoc(carRef)

  const serverUpdatedAt = docSnap.exists() ? millis(docSnap.data()?.updated_at) : 0
  const localUpdatedAt = new Date(car.updated_at || car.created_at).getTime()

  // A failed upload used to stick forever: the doc was written with
  // photo_url: null and a fresh server timestamp, so every later sync saw
  // "server newer" and skipped the photo. If the server copy lacks a photo
  // that exists locally, always retry — the timestamp gate is for content.
  const serverPhotoUrl = docSnap.exists() ? docSnap.data()?.photo_url : null
  const serverMissingOurPhoto = !serverPhotoUrl && isLocalPhoto(car.photo_uri)
  if (localUpdatedAt < serverUpdatedAt && !serverMissingOurPhoto) return 0

  let photoUrl: string | null = null
  let photosSkipped = 0
  if (isLocalPhoto(car.photo_uri)) {
    const upload = await uploadPhoto(userId, car.photo_uri)
    photoUrl = upload.url
    if (!photoUrl) {
      photosSkipped = 1
      failedCodes?.add(upload.code || 'unknown')
    }
  }

  if (localUpdatedAt < serverUpdatedAt) {
    // Server text is newer; retry the photo only and keep the server's text.
    if (photoUrl) {
      await setDoc(carRef, { photo_url: photoUrl, updated_at: serverTimestamp() }, { merge: true })
    }
    return photosSkipped
  }

  await setDoc(carRef, {
    year: car.year,
    make: car.make,
    model: car.model,
    engine: car.engine,
    vin: car.vin,
    mileage: car.mileage,
    photo_url: photoUrl || (isLocalPhoto(car.photo_uri) ? null : car.photo_uri),
    created_at: docSnap.exists() ? docSnap.data()?.created_at : serverTimestamp(),
    updated_at: serverTimestamp(),
  })
  return photosSkipped
}

export async function pushService(userId: string, service: ServiceEntry, failedCodes?: Set<string>): Promise<number> {
  const svcRef = getServiceRef(userId, service.id)
  const docSnap = await getDoc(svcRef)

  const serverUpdatedAt = docSnap.exists() ? millis(docSnap.data()?.updated_at) : 0
  const localUpdatedAt = new Date(service.updated_at || service.created_at).getTime()

  // Same retry rule as cars: a receipt whose upload failed must not be
  // abandoned just because the text doc landed with a newer timestamp.
  const serverReceiptUrl = docSnap.exists() ? docSnap.data()?.receipt_url : null
  const serverMissingOurReceipt = !serverReceiptUrl && isLocalPhoto(service.receipt_photo_uri)
  if (localUpdatedAt < serverUpdatedAt && !serverMissingOurReceipt) return 0

  let receiptUrl: string | null = null
  let photosSkipped = 0
  if (isLocalPhoto(service.receipt_photo_uri)) {
    const upload = await uploadPhoto(userId, service.receipt_photo_uri)
    receiptUrl = upload.url
    if (!receiptUrl) {
      photosSkipped = 1
      failedCodes?.add(upload.code || 'unknown')
    }
  }

  if (localUpdatedAt < serverUpdatedAt) {
    // Server text is newer; retry the receipt only and keep the server's text.
    if (receiptUrl) {
      await setDoc(svcRef, { receipt_url: receiptUrl, updated_at: serverTimestamp() }, { merge: true })
    }
    return photosSkipped
  }

  await setDoc(svcRef, {
    car_id: service.car_id,
    date: service.date,
    mileage: service.mileage,
    description: service.description,
    cost: service.cost,
    part_number: service.part_number,
    receipt_url: receiptUrl || (isLocalPhoto(service.receipt_photo_uri) ? null : service.receipt_photo_uri),
    notes: service.notes,
    created_at: docSnap.exists() ? docSnap.data()?.created_at : serverTimestamp(),
    updated_at: serverTimestamp(),
  })
  return photosSkipped
}

async function pruneRemote(userId: string, carIds: Set<number>, serviceIds: Set<number>): Promise<void> {
  const carSnap = await getDocs(collection(db, 'users', userId, 'cars'))
  for (const d of carSnap.docs) {
    const id = parseInt(d.id, 10)
    if (!Number.isFinite(id) || carIds.has(id)) continue
    await deleteDoc(d.ref)
  }
  const svcSnap = await getDocs(collection(db, 'users', userId, 'services'))
  for (const d of svcSnap.docs) {
    const id = parseInt(d.id, 10)
    if (!Number.isFinite(id) || serviceIds.has(id)) continue
    await deleteDoc(d.ref)
  }
}

async function pullRemote(userId: string): Promise<{ cars: number; services: number }> {
  let cars = 0
  let services = 0

  const carSnap = await getDocs(collection(db, 'users', userId, 'cars'))
  for (const d of carSnap.docs) {
    const id = parseInt(d.id, 10)
    if (!Number.isFinite(id)) continue
    const data = d.data()
    const serverUpdated = millis(data.updated_at)
    const local = await getCar(id)
    if (local && new Date(local.updated_at).getTime() >= serverUpdated) continue
    await upsertCar({
      id,
      year: data.year || '',
      make: data.make || 'Unknown',
      model: data.model || 'Unknown',
      engine: data.engine ?? null,
      vin: data.vin ?? null,
      photo_uri: keepLocalPhoto(data.photo_url, local?.photo_uri),
      mileage: data.mileage ?? null,
      updated_at: new Date(serverUpdated || Date.now()).toISOString(),
    })
    cars++
  }

  const svcSnap = await getDocs(collection(db, 'users', userId, 'services'))
  for (const d of svcSnap.docs) {
    const id = parseInt(d.id, 10)
    if (!Number.isFinite(id)) continue
    const data = d.data()
    const serverUpdated = millis(data.updated_at)
    const local = await getService(id)
    if (local && new Date(local.updated_at).getTime() >= serverUpdated) continue
    const carId = Number(data.car_id)
    if (!Number.isFinite(carId) || !data.description) continue
    await upsertService({
      id,
      car_id: carId,
      date: data.date || '1970-01-01',
      mileage: data.mileage ?? null,
      description: data.description,
      cost: data.cost ?? null,
      part_number: data.part_number ?? null,
      receipt_photo_uri: keepLocalPhoto(data.receipt_url, local?.receipt_photo_uri),
      notes: data.notes ?? null,
      updated_at: new Date(serverUpdated || Date.now()).toISOString(),
    })
    services++
  }

  return { cars, services }
}

export async function fullSync(): Promise<{ cars: number; services: number; photosSkipped: number; photoErrorCodes: string[] }> {
  if (syncInProgress) throw new Error('Sync already in progress')
  syncInProgress = true

  try {
    const userId = getUserId()
    if (!userId) throw new Error('Not authenticated')

    const sqlite = await getDatabase()

    // PULL FIRST. Records that exist remotely but not locally must land in
    // SQLite BEFORE pruning, or prune would delete the server's newer copy
    // (data loss when a device with an older database syncs).
    const pulled = await pullRemote(userId)

    const cars = await getAllCars()
    let carsSynced = 0
    let servicesSynced = 0
    let photosSkipped = 0
    const photoErrorCodes = new Set<string>()

    const carIds = new Set<number>()
    const serviceIds = new Set<number>()
    for (const car of cars) {
      photosSkipped += await pushCar(userId, car, photoErrorCodes)
      carsSynced++
      carIds.add(car.id)
      const services = await getServicesForCar(car.id)
      for (const svc of services) {
        photosSkipped += await pushService(userId, svc, photoErrorCodes)
        servicesSynced++
        serviceIds.add(svc.id)
      }
    }

    // Safe now: the local ID sets include anything pulled in the step above.
    await pruneRemote(userId, carIds, serviceIds)

    await sqlite.runAsync(
      'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
      'last_sync_cursor',
      new Date().toISOString(),
    )

    return { cars: carsSynced + pulled.cars, services: servicesSynced + pulled.services, photosSkipped, photoErrorCodes: [...photoErrorCodes] }
  } finally {
    syncInProgress = false
  }
}

/** Deletes every cloud document and photo for a user. Used by account deletion
 *  so no personal data outlives the Firebase Auth account (App Store Guideline
 *  5.1.1(v) / GDPR). Firestore batches cap at 500 writes; photos delete in a
 *  burst and tolerate individual failures. */
export async function deleteAllUserData(userId: string): Promise<void> {
  const carSnap = await getDocs(collection(db, 'users', userId, 'cars'))
  for (let i = 0; i < carSnap.docs.length; i += 400) {
    const batch = writeBatch(db)
    for (const d of carSnap.docs.slice(i, i + 400)) batch.delete(d.ref)
    await batch.commit()
  }
  const svcSnap = await getDocs(collection(db, 'users', userId, 'services'))
  for (let i = 0; i < svcSnap.docs.length; i += 400) {
    const batch = writeBatch(db)
    for (const d of svcSnap.docs.slice(i, i + 400)) batch.delete(d.ref)
    await batch.commit()
  }
  try {
    const photosRef = ref(storage, `users/${userId}/photos`)
    const listing = await listAll(photosRef)
    for (const item of listing.items) {
      try { await deleteObject(item) } catch {}
    }
  } catch {}
}
