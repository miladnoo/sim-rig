import { Platform, Vibration } from 'react-native'

// Tactile confirmation for primary actions, built on RN core's Vibration so
// no new native module (and therefore no dev-client rebuild) is required.
// Every call is guarded: if the device or permission refuses, the tap must
// still work — feedback may fail silently, actions may not.
//
// Patterns are deliberately minimal: a tick to acknowledge a press, a short
// double-tick for completions. Nothing that buzzes on its own.

export function pressTick(): void {
  try {
    if (Platform.OS === 'android') Vibration.vibrate(8)
  } catch {
    // No vibration permission/hardware — fine.
  }
}

export function successTick(): void {
  try {
    if (Platform.OS === 'android') Vibration.vibrate([0, 12, 60, 12])
  } catch {
    // Ignore.
  }
}
