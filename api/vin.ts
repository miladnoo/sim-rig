export interface VinResult {
  year: string | null
  make: string | null
  model: string | null
  engine: string | null
}

function nhtsaField(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  if (!s || s === '0' || /^not applicable$/i.test(s) || /^n\/a$/i.test(s) || /^invalid$/i.test(s)) return null
  return s
}

/** VIN characters never include I, O, or Q. */
export function extractVin(raw: string): string | null {
  const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const match = upper.match(/[A-HJ-NPR-Z0-9]{17}/)
  return match ? match[0] : null
}

export function looksLikeVin(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin.trim().toUpperCase())
}

export function normalizeVinInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17)
}

export async function decodeVin(vin: string): Promise<VinResult | null> {
  const clean = vin.trim().toUpperCase()
  if (!looksLikeVin(clean)) return null

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10000)
  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(clean)}?format=json`,
      { signal: ctrl.signal },
    )
    if (!response.ok) return null
    const data = await response.json()
    const result = data.Results?.[0]
    if (!result) return null

    const errorCode = String(result.ErrorCode ?? '').split(',')[0]?.trim()
    const year = nhtsaField(result.ModelYear)
    const make = nhtsaField(result.Make)
    const model = nhtsaField(result.Model)

    if (errorCode && errorCode !== '0' && !year && !make && !model) return null

    let engine: string | null = null
    const cyl = nhtsaField(result.EngineCylinders)
    const displ = nhtsaField(result.DisplacementL)
    if (cyl || displ) {
      engine = `${cyl ? cyl + '-cyl' : ''}${cyl && displ ? ' ' : ''}${displ ? displ + 'L' : ''}`.trim()
    }

    return { year, make, model, engine }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export function shouldUseVin(year?: string): boolean {
  if (!year) return true
  const y = parseInt(year, 10)
  return !isNaN(y) && y >= 1981
}
