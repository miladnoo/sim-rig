import * as SQLite from 'expo-sqlite'

let db: SQLite.SQLiteDatabase | null = null
let opening: Promise<SQLite.SQLiteDatabase> | null = null
let epoch = 0

export function resetDatabase(): void {
  db = null
  opening = null
  epoch += 1
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  return getDatabaseOnce(true)
}

async function getDatabaseOnce(retry: boolean): Promise<SQLite.SQLiteDatabase> {
  if (db) return db
  if (!opening) {
    opening = openDatabase(epoch)
  }
  try {
    return await opening
  } catch (err) {
    opening = null
    db = null
    if (retry && err instanceof Error && err.message === 'Database reset') {
      return getDatabaseOnce(false)
    }
    throw err
  }
}

async function openDatabase(openedFor: number): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync('classicgarage.db', {
    finalizeUnusedStatementsBeforeClosing: false,
  })
  if (openedFor !== epoch) {
    try { await database.closeAsync() } catch {}
    throw new Error('Database reset')
  }
  await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
  await runMigrations(database)
  if (openedFor !== epoch) {
    try { await database.closeAsync() } catch {}
    throw new Error('Database reset')
  }
  db = database
  return database
}

async function runMigrations(database: SQLite.SQLiteDatabase) {
  const result = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  )
  const version = result?.user_version ?? 0

  if (version < 1) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS cars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        engine TEXT,
        vin TEXT,
        photo_uri TEXT,
        mileage TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        car_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        mileage TEXT,
        description TEXT NOT NULL,
        cost TEXT,
        part_number TEXT,
        receipt_photo_uri TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_services_car_id ON services(car_id);
      CREATE INDEX IF NOT EXISTS idx_services_date ON services(date);
      CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      PRAGMA user_version = 2;
    `)
  } else {
    if (version < 2) {
      await database.execAsync(`
        ALTER TABLE cars ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
        ALTER TABLE services ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
        CREATE TABLE IF NOT EXISTS sync_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        PRAGMA user_version = 2;
      `)
    }
  }
}
