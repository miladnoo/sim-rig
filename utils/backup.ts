import * as FileSystem from 'expo-file-system/legacy'
import * as DocumentPicker from 'expo-document-picker'
import { getDatabase, resetDatabase } from '../db/schema'
import { getAllCars } from '../db/cars'
import { getServicesForCar } from '../db/services'

function zipLib(): { zip: (from: string, to: string) => Promise<string>; unzip: (from: string, to: string) => Promise<string> } {
  try {
    return require('react-native-zip-archive')
  } catch {
    throw new Error('Backup needs the Classic Garage development build.')
  }
}

const DB_FILENAME = 'classicgarage.db'
const MANIFEST_FILENAME = 'manifest.json'

function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)
}

function getFileExtension(uri: string): string {
  const filename = uri.split('/').pop() ?? ''
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex >= 0 ? filename.slice(dotIndex + 1) : 'jpg'
}

function remapLocalPhotoUri(uri: string | null): string | null {
  if (!uri || uri.startsWith('http://') || uri.startsWith('https://')) return uri
  const doc = FileSystem.documentDirectory || ''
  const normalized = uri.replace(/\\/g, '/')
  for (const folder of ['receipts', 'car_photos'] as const) {
    const marker = `/${folder}/`
    const i = normalized.lastIndexOf(marker)
    if (i >= 0) return `${doc}${folder}/${normalized.slice(i + marker.length)}`
  }
  return uri
}

async function remapRestoredPhotoUris(db: Awaited<ReturnType<typeof getDatabase>>): Promise<void> {
  const cars = await db.getAllAsync<{ id: number; photo_uri: string | null }>('SELECT id, photo_uri FROM cars')
  for (const c of cars) {
    const next = remapLocalPhotoUri(c.photo_uri)
    if (next !== c.photo_uri) await db.runAsync('UPDATE cars SET photo_uri = ? WHERE id = ?', next, c.id)
  }
  const svcs = await db.getAllAsync<{ id: number; receipt_photo_uri: string | null }>('SELECT id, receipt_photo_uri FROM services')
  for (const s of svcs) {
    const next = remapLocalPhotoUri(s.receipt_photo_uri)
    if (next !== s.receipt_photo_uri) await db.runAsync('UPDATE services SET receipt_photo_uri = ? WHERE id = ?', next, s.id)
  }
}

export async function createBackup(): Promise<string> {
  const db = await getDatabase()
  await db.execAsync('PRAGMA wal_checkpoint(FULL)')

  const backupDir = `${FileSystem.cacheDirectory}backup_${Date.now()}/`
  await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true })

  const dbPath = `${FileSystem.documentDirectory}SQLite/${DB_FILENAME}`
  await FileSystem.copyAsync({ from: dbPath, to: `${backupDir}${DB_FILENAME}` })

  const photosDir = `${FileSystem.documentDirectory}receipts/`
  const photosInfo = await FileSystem.getInfoAsync(photosDir)
  if (photosInfo.exists) {
    await FileSystem.copyAsync({ from: photosDir, to: `${backupDir}receipts/` })
  }

  const carPhotosDir = `${FileSystem.documentDirectory}car_photos/`
  const carPhotosInfo = await FileSystem.getInfoAsync(carPhotosDir)
  if (carPhotosInfo.exists) {
    await FileSystem.copyAsync({ from: carPhotosDir, to: `${backupDir}car_photos/` })
  }

  const organizedPhotosDir = `${backupDir}photos/`
  await FileSystem.makeDirectoryAsync(organizedPhotosDir, { intermediates: true })

  const cars = await getAllCars()
  const photosManifest: Array<{
    filename: string
    originalUri: string
    car: { id: number; make: string; model: string; year: string }
    service?: { id: number; description: string; date: string }
  }> = []

  for (const car of cars) {
    const services = await getServicesForCar(car.id)

    for (const service of services) {
      if (!service.receipt_photo_uri) continue

      const ext = getFileExtension(service.receipt_photo_uri)
      const carLabel = sanitizeFilename(`${car.make}_${car.model}`)
      const descLabel = sanitizeFilename(service.description)
      const dateLabel = sanitizeFilename(service.date)
      const filename = `${carLabel}_${descLabel}_${dateLabel}_${service.id}.${ext}`

      const srcInfo = await FileSystem.getInfoAsync(service.receipt_photo_uri)
      if (srcInfo.exists) {
        await FileSystem.copyAsync({
          from: service.receipt_photo_uri,
          to: `${organizedPhotosDir}${filename}`,
        })
        photosManifest.push({
          filename,
          originalUri: service.receipt_photo_uri,
          car: { id: car.id, make: car.make, model: car.model, year: car.year },
          service: { id: service.id, description: service.description, date: service.date },
        })
      }
    }

    if (car.photo_uri) {
      const ext = getFileExtension(car.photo_uri)
      const carLabel = sanitizeFilename(`${car.make}_${car.model}`)
      const yearLabel = sanitizeFilename(car.year)
      const filename = `${carLabel}_Main_${yearLabel}_${car.id}.${ext}`

      const srcInfo = await FileSystem.getInfoAsync(car.photo_uri)
      if (srcInfo.exists) {
        await FileSystem.copyAsync({
          from: car.photo_uri,
          to: `${organizedPhotosDir}${filename}`,
        })
        photosManifest.push({
          filename,
          originalUri: car.photo_uri,
          car: { id: car.id, make: car.make, model: car.model, year: car.year },
        })
      }
    }
  }

  await FileSystem.writeAsStringAsync(
    `${backupDir}photos_manifest.json`,
    JSON.stringify(photosManifest, null, 2)
  )

  await FileSystem.writeAsStringAsync(
    `${backupDir}${MANIFEST_FILENAME}`,
    JSON.stringify({
      version: 1,
      createdAt: new Date().toISOString(),
      appName: 'Classic Garage',
    })
  )

  const backupsDir = `${FileSystem.documentDirectory}backups/`
  const backupsDirInfo = await FileSystem.getInfoAsync(backupsDir)
  if (!backupsDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(backupsDir, { intermediates: true })
  }

  const zipPath = `${backupsDir}Classic_Garage_backup_${new Date().toISOString().slice(0, 10)}.zip`
  const zipExists = await FileSystem.getInfoAsync(zipPath)
  if (zipExists.exists) {
    await FileSystem.deleteAsync(zipPath, { idempotent: true })
  }
  await zipLib().zip(backupDir, zipPath)

  await FileSystem.deleteAsync(backupDir, { idempotent: true })

  return zipPath
}

export async function restoreFromBackup(): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/x-zip-compressed', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  })

  if (result.canceled) return false
  const pickedFile = result.assets[0]
  if (!pickedFile) return false

  const fileInfo = await FileSystem.getInfoAsync(pickedFile.uri)
  if (!fileInfo.exists || fileInfo.size === 0) {
    throw new Error('Backup file not found or empty')
  }

  const restoreDir = `${FileSystem.cacheDirectory}restore_${Date.now()}/`
  await FileSystem.makeDirectoryAsync(restoreDir, { intermediates: true })

  await zipLib().unzip(pickedFile.uri, restoreDir)

  const manifestPath = `${restoreDir}${MANIFEST_FILENAME}`
  const manifestInfo = await FileSystem.getInfoAsync(manifestPath)
  if (!manifestInfo.exists) {
    await FileSystem.deleteAsync(restoreDir, { idempotent: true })
    throw new Error('Invalid backup file: missing manifest')
  }

  const backupDbPath = `${restoreDir}${DB_FILENAME}`
  const dbInfo = await FileSystem.getInfoAsync(backupDbPath)
  if (!dbInfo.exists) {
    await FileSystem.deleteAsync(restoreDir, { idempotent: true })
    throw new Error('Invalid backup file: missing database')
  }

  const autoBackupDir = `${FileSystem.cacheDirectory}auto_backup_${Date.now()}/`
  await FileSystem.makeDirectoryAsync(autoBackupDir, { intermediates: true })

  const currentDbPath = `${FileSystem.documentDirectory}SQLite/${DB_FILENAME}`
  const currentDbInfo = await FileSystem.getInfoAsync(currentDbPath)
  if (currentDbInfo.exists) {
    await FileSystem.copyAsync({ from: currentDbPath, to: `${autoBackupDir}${DB_FILENAME}` })
  }

  try {
    const db = await getDatabase()
    await db.closeAsync()
    resetDatabase()

    await FileSystem.deleteAsync(currentDbPath, { idempotent: true })

    await FileSystem.copyAsync({ from: backupDbPath, to: currentDbPath })

    const walPath = `${FileSystem.documentDirectory}SQLite/${DB_FILENAME}-wal`
    const shmPath = `${FileSystem.documentDirectory}SQLite/${DB_FILENAME}-shm`
    await FileSystem.deleteAsync(walPath, { idempotent: true })
    await FileSystem.deleteAsync(shmPath, { idempotent: true })

    const receiptsDir = `${restoreDir}receipts/`
    const receiptsDestDir = `${FileSystem.documentDirectory}receipts/`
    const receiptsInfo = await FileSystem.getInfoAsync(receiptsDir)
    if (receiptsInfo.exists) {
      await FileSystem.deleteAsync(receiptsDestDir, { idempotent: true })
      await FileSystem.copyAsync({ from: receiptsDir, to: receiptsDestDir })
    }

    const carPhotosRestore = `${restoreDir}car_photos/`
    const carPhotosDest = `${FileSystem.documentDirectory}car_photos/`
    const carPhotosInfo = await FileSystem.getInfoAsync(carPhotosRestore)
    if (carPhotosInfo.exists) {
      await FileSystem.deleteAsync(carPhotosDest, { idempotent: true })
      await FileSystem.copyAsync({ from: carPhotosRestore, to: carPhotosDest })
    }

    const dbAfter = await getDatabase()
    await remapRestoredPhotoUris(dbAfter)
    return true
  } catch (err) {
    const autoDbPath = `${autoBackupDir}${DB_FILENAME}`
    const autoInfo = await FileSystem.getInfoAsync(autoDbPath)
    if (autoInfo.exists) {
      await FileSystem.copyAsync({ from: autoDbPath, to: currentDbPath })
    }
    throw err
  } finally {
    await FileSystem.deleteAsync(restoreDir, { idempotent: true })
    await FileSystem.deleteAsync(autoBackupDir, { idempotent: true })
  }
}
