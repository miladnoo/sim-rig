export function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y || 1970, (m || 1) - 1, d || 1)
}

export function formatServiceDate(s: string): string {
  return parseLocalDate(s).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatMonthYear(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y || 1970, (m || 1) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export function formatMileage(m: string | null | undefined): string | null {
  if (!m) return null
  const n = parseInt(String(m).replace(/[^0-9]/g, ''), 10)
  if (!Number.isFinite(n)) return m
  return n.toLocaleString('en-US')
}
