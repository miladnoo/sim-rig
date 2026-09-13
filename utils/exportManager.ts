import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as Print from 'expo-print'
import { Platform } from 'react-native'
import { getCar, type Car } from '../db/cars'
import { getServicesForCar } from '../db/services'
import { buildServiceHistoryHTML } from './exportPDF'
import { formatServiceDate, toLocalDateString } from './dates'
import { uriToBase64 } from './photos'

function today(): string {
  return toLocalDateString(new Date())
}

function carName(car: Car): string {
  return `${car.year || ''} ${car.make} ${car.model}`.trim() || 'Car'
}

export function sanitizeFilename(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'file'
}

function imageMime(uri: string): string {
  const lower = uri.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

export type PreparedPdf = {
  path: string
  filename: string
  title: string
}

async function writeNamedPdf(html: string, filename: string): Promise<string> {
  const printed = await Print.printToFileAsync({ html, width: 612, height: 792 })
  const dir = `${FileSystem.documentDirectory}exports/`
  const dirInfo = await FileSystem.getInfoAsync(dir)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  }
  const dest = `${dir}${filename}`
  const existing = await FileSystem.getInfoAsync(dest)
  if (existing.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true })
  }
  await FileSystem.copyAsync({ from: printed.uri, to: dest })
  await FileSystem.deleteAsync(printed.uri, { idempotent: true }).catch(() => {})
  return dest
}

export async function sharePdfFile(path: string, title: string): Promise<void> {
  const available = await Sharing.isAvailableAsync()
  if (!available) {
    throw new Error('This phone cannot share files yet.')
  }
  await Sharing.shareAsync(path, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: title,
  })
}

export function serviceHistoryFilename(car: Car): string {
  return `${sanitizeFilename(carName(car))}_service_history_${today()}.pdf`
}

export async function createCarPdf(carId: number): Promise<PreparedPdf> {
  const car = await getCar(carId)
  if (!car) throw new Error('That car could not be found.')

  const services = await getServicesForCar(carId)
  if (services.length === 0) {
    throw new Error('Add a service record before making a PDF.')
  }

  const name = carName(car)
  const carPhoto = car.photo_uri ? await uriToBase64(car.photo_uri) : null
  const carPhotoMime = car.photo_uri ? imageMime(car.photo_uri) : 'image/jpeg'

  let receiptsHtml = ''
  for (const svc of services) {
    if (!svc.receipt_photo_uri) continue
    const b64 = await uriToBase64(svc.receipt_photo_uri)
    if (!b64) continue
    const caption = `${formatServiceDate(svc.date)} — ${svc.description}`
    const mime = imageMime(svc.receipt_photo_uri)
    receiptsHtml += `<div class="receipt"><img src="data:${mime};base64,${b64}" /><p>${caption.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p></div>`
  }

  const html = buildServiceHistoryHTML(name, car.mileage, services, carPhoto, receiptsHtml, carPhotoMime)
  const filename = serviceHistoryFilename(car)
  const path = await writeNamedPdf(html, filename)
  return { path, filename, title: name }
}

export async function downloadPdf(path: string, filename: string): Promise<void> {
  if (Platform.OS === 'android') {
    const SAF = FileSystem.StorageAccessFramework
    const perm = await SAF.requestDirectoryPermissionsAsync()
    if (!perm.granted) throw new Error('Save cancelled')
    const content = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.Base64,
    })
    const uri = await SAF.createFileAsync(perm.directoryUri, filename, 'application/pdf')
    await SAF.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.Base64 })
    return
  }

  const available = await Sharing.isAvailableAsync()
  if (!available) {
    throw new Error('This phone cannot save the PDF. It is still in Classic Garage.')
  }
  await Sharing.shareAsync(path, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Download ${filename}`,
  })
}

/** @deprecated Use createCarPdf, then download, then share. */
export async function handleCarExport(carId: number): Promise<string> {
  const pdf = await createCarPdf(carId)
  await downloadPdf(pdf.path, pdf.filename)
  return pdf.path
}
