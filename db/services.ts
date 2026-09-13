import { getDatabase } from './schema'
import { maybeUpdateCarMileage } from './cars'
import { deletePhoto } from '../utils/photos'

export interface ServiceEntry {
  id: number
  car_id: number
  date: string
  mileage: string | null
  description: string
  cost: string | null
  part_number: string | null
  receipt_photo_uri: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export async function getServicesForCar(carId: number): Promise<ServiceEntry[]> {
  const db = await getDatabase()
  return await db.getAllAsync<ServiceEntry>(
    'SELECT * FROM services WHERE car_id = ? ORDER BY date DESC, id DESC',
    carId
  )
}

export async function getServiceCountForCar(carId: number): Promise<number> {
  const db = await getDatabase()
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM services WHERE car_id = ?',
    carId
  )
  return result?.count ?? 0
}

export async function insertService(service: {
  car_id: number
  date: string
  mileage?: string | null
  description: string
  cost?: string | null
  part_number?: string | null
  receipt_photo_uri?: string | null
  notes?: string | null
}): Promise<number> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const result = await db.runAsync(
    `INSERT INTO services (car_id, date, mileage, description, cost, part_number, receipt_photo_uri, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    service.car_id,
    service.date,
    service.mileage ?? null,
    service.description,
    service.cost ?? null,
    service.part_number ?? null,
    service.receipt_photo_uri ?? null,
    service.notes ?? null,
    now
  )
  await maybeUpdateCarMileage(service.car_id, service.mileage)
  return result.lastInsertRowId
}

export async function upsertService(service: {
  id: number
  car_id: number
  date: string
  mileage?: string | null
  description: string
  cost?: string | null
  part_number?: string | null
  receipt_photo_uri?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}): Promise<void> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO services (id, car_id, date, mileage, description, cost, part_number, receipt_photo_uri, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       car_id = excluded.car_id,
       date = excluded.date,
       mileage = excluded.mileage,
       description = excluded.description,
       cost = excluded.cost,
       part_number = excluded.part_number,
       receipt_photo_uri = excluded.receipt_photo_uri,
       notes = excluded.notes,
       updated_at = excluded.updated_at`,
    service.id,
    service.car_id,
    service.date,
    service.mileage ?? null,
    service.description,
    service.cost ?? null,
    service.part_number ?? null,
    service.receipt_photo_uri ?? null,
    service.notes ?? null,
    service.created_at ?? now,
    service.updated_at ?? now,
  )
  await maybeUpdateCarMileage(service.car_id, service.mileage)
}

export async function getService(id: number): Promise<ServiceEntry | null> {
  const db = await getDatabase()
  const row = await db.getFirstAsync<ServiceEntry>('SELECT * FROM services WHERE id = ?', id)
  return row ?? null
}

export async function deleteService(id: number): Promise<void> {
  const db = await getDatabase()
  const row = await getService(id)
  if (row?.receipt_photo_uri) await deletePhoto(row.receipt_photo_uri)
  await db.runAsync('DELETE FROM services WHERE id = ?', id)
}

export async function updateService(
  id: number,
  fields: Partial<Omit<ServiceEntry, 'id' | 'car_id' | 'created_at'>>
): Promise<void> {
  const db = await getDatabase()
  const keys = Object.keys(fields)
  if (keys.length === 0) return

  const prev = await getService(id)
  if (
    prev?.receipt_photo_uri &&
    'receipt_photo_uri' in fields &&
    fields.receipt_photo_uri !== prev.receipt_photo_uri
  ) {
    await deletePhoto(prev.receipt_photo_uri)
  }

  const now = new Date().toISOString()
  const setClause = [...keys.map((key) => `${key} = ?`), 'updated_at = ?'].join(', ')
  const values = keys.map((k) => (fields as any)[k])

  await db.runAsync(
    `UPDATE services SET ${setClause} WHERE id = ?`,
    ...values,
    now,
    id
  )
  if ('mileage' in fields) {
    const row = await getService(id)
    if (row) await maybeUpdateCarMileage(row.car_id, fields.mileage)
  }
}
