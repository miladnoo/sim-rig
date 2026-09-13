import { getDatabase } from './schema'
import { deletePhoto } from '../utils/photos'

export interface Car {
  id: number
  year: string
  make: string
  model: string
  engine: string | null
  vin: string | null
  photo_uri: string | null
  mileage: string | null
  last_service_date?: string | null
  created_at: string
  updated_at: string
}

export async function getAllCars(): Promise<Car[]> {
  const db = await getDatabase()
  return await db.getAllAsync<Car>(
    `SELECT cars.*,
      (SELECT date FROM services s WHERE s.car_id = cars.id ORDER BY date DESC, id DESC LIMIT 1) AS last_service_date
     FROM cars ORDER BY created_at DESC`
  )
}

export async function getCar(id: number): Promise<Car | null> {
  const db = await getDatabase()
  const car = await db.getFirstAsync<Car>(
    'SELECT * FROM cars WHERE id = ?',
    id
  )
  return car ?? null
}

export async function getCarCount(): Promise<number> {
  const db = await getDatabase()
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM cars'
  )
  return result?.count ?? 0
}

export async function insertCar(car: {
  year?: string
  make: string
  model: string
  engine?: string | null
  vin?: string | null
  photo_uri?: string | null
  mileage?: string | null
}): Promise<number> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const result = await db.runAsync(
    `INSERT INTO cars (year, make, model, engine, vin, photo_uri, mileage, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    car.year ?? '',
    car.make,
    car.model,
    car.engine ?? null,
    car.vin ?? null,
    car.photo_uri ?? null,
    car.mileage ?? null,
    now
  )
  return result.lastInsertRowId
}

export async function updateCar(
  id: number,
  fields: Partial<Omit<Car, 'id' | 'created_at' | 'last_service_date'>>
): Promise<void> {
  const db = await getDatabase()
  const keys = Object.keys(fields)
  if (keys.length === 0) return

  if ('photo_uri' in fields) {
    const prev = await getCar(id)
    if (prev?.photo_uri && fields.photo_uri !== prev.photo_uri) {
      await deletePhoto(prev.photo_uri)
    }
  }

  const now = new Date().toISOString()
  const setClause = [...keys.map((key) => `${key} = ?`), 'updated_at = ?'].join(', ')
  const values = keys.map((k) => (fields as any)[k])

  await db.runAsync(
    `UPDATE cars SET ${setClause} WHERE id = ?`,
    ...values,
    now,
    id
  )
}

export async function upsertCar(car: {
  id: number
  year?: string
  make: string
  model: string
  engine?: string | null
  vin?: string | null
  photo_uri?: string | null
  mileage?: string | null
  created_at?: string
  updated_at?: string
}): Promise<void> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO cars (id, year, make, model, engine, vin, photo_uri, mileage, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       year = excluded.year,
       make = excluded.make,
       model = excluded.model,
       engine = excluded.engine,
       vin = excluded.vin,
       photo_uri = excluded.photo_uri,
       mileage = excluded.mileage,
       updated_at = excluded.updated_at`,
    car.id,
    car.year ?? '',
    car.make,
    car.model,
    car.engine ?? null,
    car.vin ?? null,
    car.photo_uri ?? null,
    car.mileage ?? null,
    car.created_at ?? now,
    car.updated_at ?? now,
  )
}

export async function maybeUpdateCarMileage(carId: number, mileage: string | null | undefined): Promise<void> {
  const next = parseInt((mileage || '').replace(/[^0-9]/g, ''), 10)
  if (!Number.isFinite(next)) return
  const car = await getCar(carId)
  if (!car) return
  const prev = parseInt((car.mileage || '').replace(/[^0-9]/g, ''), 10)
  // A service entry only RAISES the odometer. Also ignore silly-low readings
  // when the car has no mileage yet (< 100 mi) — that guards against a stray
  // short number in the mileage field overwriting an empty odometer.
  if (Number.isFinite(prev) && next <= prev) return
  if (!Number.isFinite(prev) && next < 100) return
  await updateCar(carId, { mileage: String(next) })
}

export async function deleteCar(id: number): Promise<void> {
  const db = await getDatabase()
  const car = await getCar(id)
  const receipts = await db.getAllAsync<{ receipt_photo_uri: string | null }>(
    'SELECT receipt_photo_uri FROM services WHERE car_id = ?',
    id,
  )
  for (const row of receipts) {
    if (row.receipt_photo_uri) await deletePhoto(row.receipt_photo_uri)
  }
  if (car?.photo_uri) await deletePhoto(car.photo_uri)
  await db.runAsync('DELETE FROM services WHERE car_id = ?', id)
  await db.runAsync('DELETE FROM cars WHERE id = ?', id)
}
