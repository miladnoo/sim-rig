import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { User } from 'firebase/auth'
import * as AuthService from './AuthService'
import { signOutFromGoogle } from './GoogleAuthService'
import { logOutRevenueCat } from './PremiumContext'
import { deleteAllUserData } from './sync'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<User>
  signUp: (email: string, password: string) => Promise<User>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  deleteAccount: () => Promise<void>
  getErrorMessage: (error: any) => string
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => { throw new Error('not initialized') },
  signUp: async () => { throw new Error('not initialized') },
  signOut: async () => {},
  resetPassword: async () => {},
  deleteAccount: async () => {},
  getErrorMessage: () => '',
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChange((authUser) => {
      setUser(authUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    await signOutFromGoogle()
    await logOutRevenueCat()
    await AuthService.signOut()
  }, [])

  const deleteAccount = useCallback(async () => {
    const user = AuthService.getCurrentUser()
    // Cloud data must go BEFORE the auth account disappears, or the uid can
    // never be authorized to delete it again (orphaned PII).
    if (user) await deleteAllUserData(user.uid)
    await signOutFromGoogle()
    await logOutRevenueCat()
    await AuthService.deleteAccount()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: AuthService.signIn,
        signUp: AuthService.signUp,
        signOut,
        resetPassword: AuthService.resetPassword,
        deleteAccount,
        getErrorMessage: AuthService.getErrorMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext)
}
