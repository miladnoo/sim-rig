export type AppColors = {
  background: string
  surface: string
  fill: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  primary: string
  primaryDark: string
  onPrimary: string
  border: string
  cardBorder: string
  separator: string
  success: string
  warning: string
  error: string
  onError: string
  scrim: string
}

// Light mode reads like shop paper: warm off-white, warm ink.
// (Cool slate grays made the garage feel like a spreadsheet.)
export const lightColors: AppColors = {
  background: '#F4F2EE',
  surface: '#FFFFFF',
  fill: '#EAE6DF',
  textPrimary: '#1C1917',
  textSecondary: '#57534E',
  textMuted: '#79716B',
  primary: '#B91C1C',
  primaryDark: '#991B1B',
  onPrimary: '#FFFFFF',
  border: '#E7E0D8',
  cardBorder: '#E7E0D8',
  separator: '#D6CFC5',
  success: '#15803D',
  warning: '#B45309',
  error: '#B91C1C',
  onError: '#FFFFFF',
  scrim: 'rgba(28, 25, 23, 0.45)',
}

// Dark mode keeps the proven iOS-family neutrals; the red does the branding.
export const darkColors: AppColors = {
  background: '#000000',
  surface: '#1C1C1E',
  fill: '#2C2C2E',
  textPrimary: '#F5F5F7',
  textSecondary: '#D1D1D6',
  textMuted: '#A1A1AA',
  primary: '#FF453A',
  primaryDark: '#FF6961',
  onPrimary: '#FFFFFF',
  border: '#38383A',
  cardBorder: '#38383A',
  separator: '#3A3A3C',
  success: '#30D158',
  warning: '#FFD60A',
  error: '#FF453A',
  onError: '#FFFFFF',
  scrim: 'rgba(0, 0, 0, 0.55)',
}

// Type scale is editorial: the display size is reserved for the few big
// moments (onboarding title, paywall). Everything else steps down cleanly.
export const typography = {
  display: 34,
  header: 28,
  title: 22,
  body: 17,
  bodySmall: 15,
  caption: 13,
}

// Classic 4-point spacing plus named rungs so screens stop inventing values.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
}

export const space = {
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '6': 24,
  '8': 32,
  '12': 48,
}

export const borderRadius = {
  sm: 12,
  md: 16,
  lg: 22,
}

// Shared elevation: soft, directional, identical tokens in both modes.
const shadow = {
  shadowColor: '#1C1917',
  shadowOpacity: 0.14,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
}

export const elevation = {
  card: {
    ...shadow,
    elevation: 1,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  bar: { ...shadow },
  fab: {
    ...shadow,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
}

export const motion = {
  pressScale: 0.97,
  pressMs: 100,
  fastMs: 150,
  normalMs: 220,
}
