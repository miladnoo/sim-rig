import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { lightColors, darkColors, AppColors } from '../theme'

type ThemePreference = 'system' | 'light' | 'dark'

interface ThemeContextType {
  colors: AppColors
  isDark: boolean
  preference: ThemePreference
  setPreference: (mode: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextType>({
  colors: lightColors,
  isDark: false,
  preference: 'system',
  setPreference: () => {},
})

const STORAGE_KEY = 'theme-preference'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>('system')

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored)
      }
    }).catch(() => {})
  }, [])

  const setPreference = useCallback((mode: ThemePreference) => {
    setPreferenceState(mode)
    SecureStore.setItemAsync(STORAGE_KEY, mode).catch(() => {})
  }, [])

  const isDark = useMemo(() => {
    if (preference === 'system') return systemScheme === 'dark'
    return preference === 'dark'
  }, [preference, systemScheme])

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark])

  return (
    <ThemeContext.Provider value={{ colors, isDark, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext)
}
