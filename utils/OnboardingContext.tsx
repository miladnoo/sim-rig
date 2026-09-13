import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'

const STORAGE_KEY = 'onboarding-done'

interface OnboardingContextType {
  ready: boolean
  seen: boolean
  complete: () => Promise<void>
  replay: () => Promise<void>
}

const OnboardingContext = createContext<OnboardingContextType>({
  ready: false,
  seen: false,
  complete: async () => {},
  replay: async () => {},
})

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((value) => setSeen(value === 'true'))
      .catch(() => setSeen(false))
      .finally(() => setReady(true))
  }, [])

  const complete = useCallback(async () => {
    setSeen(true)
    await SecureStore.setItemAsync(STORAGE_KEY, 'true').catch(() => {})
  }, [])

  const replay = useCallback(async () => {
    setSeen(false)
    await SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {})
  }, [])

  return (
    <OnboardingContext.Provider value={{ ready, seen, complete, replay }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  return useContext(OnboardingContext)
}
