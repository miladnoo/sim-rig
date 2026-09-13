import React, { createContext, useContext, useCallback } from 'react'

interface LargeTextContextType {
  largeText: boolean
  toggleLargeText: () => void
  scale: (size: number) => number
}

const LargeTextContext = createContext<LargeTextContextType>({
  largeText: false,
  toggleLargeText: () => {},
  scale: (size: number) => size,
})

/** System text size is respected by React Native. Do not add a second in-app scale. */
export function LargeTextProvider({ children }: { children: React.ReactNode }) {
  const scale = useCallback((size: number) => size, [])
  const toggleLargeText = useCallback(() => {}, [])
  return (
    <LargeTextContext.Provider value={{ largeText: false, toggleLargeText, scale }}>
      {children}
    </LargeTextContext.Provider>
  )
}

export function useLargeText() {
  return useContext(LargeTextContext)
}
