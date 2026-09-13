import { AccessibilityInfo } from 'react-native'
import type { VinResult } from '../api/vin'

export function formatVinFound(result: VinResult): string {
  const line = [result.year, result.make, result.model].filter(Boolean).join(' ')
  return line || 'Vehicle found'
}

export async function pauseForVinTheater(startedAt: number, minMs = 1650) {
  const reduced = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false)
  if (reduced) return
  const wait = Math.max(0, minMs - (Date.now() - startedAt))
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait))
}

export async function pauseAfterVinSuccess(ms = 720) {
  const reduced = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false)
  if (reduced) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}
