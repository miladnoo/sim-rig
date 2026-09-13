import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'

const DOC_DIR = FileSystem.documentDirectory || ''
const RECEIPTS_DIR = `${DOC_DIR}receipts/`
const CAR_PHOTOS_DIR = `${DOC_DIR}car_photos/`

async function ensureDir(dir: string) {
  const info = await FileSystem.getInfoAsync(dir)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  }
}

export async function takePhoto(type: 'receipt' | 'car'): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (!permission.granted) {
    throw new Error('Allow camera access in Settings to photograph cars and receipts.')
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: type === 'receipt' ? 0.7 : 0.5,
    mediaTypes: ['images'],
    allowsEditing: false,
  })

  if (result.canceled || !result.assets?.[0]) return null

  const source = result.assets[0].uri
  const dir = type === 'receipt' ? RECEIPTS_DIR : CAR_PHOTOS_DIR
  await ensureDir(dir)

  const timestamp = Date.now()
  const dest = `${dir}${timestamp}.jpg`
  try {
    await FileSystem.copyAsync({ from: source, to: dest })
    return dest
  } catch {
    throw new Error('Could not save the photo on this phone.')
  }
}

export async function pickPhoto(type: 'receipt' | 'car'): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) {
    throw new Error('Allow photo library access to choose a picture.')
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    quality: type === 'receipt' ? 0.7 : 0.5,
    mediaTypes: ['images'],
    allowsEditing: false,
  })

  if (result.canceled || !result.assets?.[0]) return null

  const source = result.assets[0].uri
  const dir = type === 'receipt' ? RECEIPTS_DIR : CAR_PHOTOS_DIR
  await ensureDir(dir)

  const timestamp = Date.now()
  const dest = `${dir}${timestamp}.jpg`
  try {
    await FileSystem.copyAsync({ from: source, to: dest })
    return dest
  } catch {
    throw new Error('Could not save the photo on this phone.')
  }
}

export async function deletePhoto(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri)
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true })
    }
  } catch {}
}

export async function replaceLocalPhoto(previous: string | null | undefined, next: string | null): Promise<string | null> {
  if (previous && previous !== next) await deletePhoto(previous)
  return next
}

export async function uriToBase64(uri: string): Promise<string | null> {
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    })
  } catch {
    return null
  }
}
