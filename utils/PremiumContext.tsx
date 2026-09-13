import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases'
import { Platform } from 'react-native'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { fullSync } from './sync'

const IS_WEB = Platform.OS === 'web'

let PurchasesUI: { presentPaywall?: () => Promise<void>; presentCustomerCenter?: () => Promise<void> } = {}
try {
  PurchasesUI = require('react-native-purchases-ui')
} catch {}

function getPurchasesModule(): typeof import('react-native-purchases') {
  return require('react-native-purchases')
}

function getPurchases(): typeof import('react-native-purchases').default {
  const mod = getPurchasesModule()
  return (mod as any).default ?? mod
}

const RC_APPLE_KEY =
  process.env.EXPO_PUBLIC_RC_API_KEY || 'appl_IerrqoQZoYlsXgtTjEpXPVoDjtu'
const RC_TEST_STORE_KEY =
  process.env.EXPO_PUBLIC_RC_TEST_API_KEY || 'test_gnGmHkwrfmyIRPHcqHwIDUebpOW'
// goog_ key for the Play Store app in RevenueCat. Set EXPO_PUBLIC_RC_PLAY_API_KEY
// once the Play Console app is connected (see AGENTS.md). Release Android builds
// must use it; dev builds keep the Test Store so purchase flows work today.
const RC_PLAY_KEY = process.env.EXPO_PUBLIC_RC_PLAY_API_KEY || ''

function revenueCatApiKey(): string {
  if (Platform.OS === 'android') {
    if (!__DEV__ && RC_PLAY_KEY) return RC_PLAY_KEY
    return RC_TEST_STORE_KEY
  }
  return RC_APPLE_KEY
}
const ENTITLEMENT_IDS = ['classic_garage_pro', 'classic garage Pro']

export type ProductPeriod = 'lifetime' | 'yearly' | 'monthly'

export type PremiumPlan = 'lifetime' | 'monthly' | null

export interface PremiumState {
  isPremium: boolean
  entitled: boolean
  previewUnpaid: boolean
  /** True when RevenueCat could not initialize (offline, outage). The app
   *  stays usable and the paywall gains a Close button until it recovers. */
  initFailed: boolean
  plan: PremiumPlan
  isLoading: boolean
  customerInfo: CustomerInfo | null
  currentOffering: PurchasesOffering | null
  lifetimePackage: PurchasesPackage | null
  yearlyPackage: PurchasesPackage | null
  monthlyPackage: PurchasesPackage | null
}

interface PremiumActions {
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>
  purchase: () => Promise<boolean>
  restore: () => Promise<boolean>
  presentPaywallIfAvailable: () => Promise<boolean>
  presentCustomerCenter: () => Promise<void>
  refresh: () => Promise<void>
  setPreviewUnpaid: (on: boolean) => void
}

const defaultState: PremiumState = {
  isPremium: false,
  entitled: false,
  previewUnpaid: false,
  initFailed: false,
  plan: null,
  isLoading: true,
  customerInfo: null,
  currentOffering: null,
  lifetimePackage: null,
  yearlyPackage: null,
  monthlyPackage: null,
}

function hasPremiumAccess(info: CustomerInfo | null): boolean {
  const active = info?.entitlements.active
  if (!active) return false
  return ENTITLEMENT_IDS.some((id) => active[id] !== undefined)
}

function planFromInfo(info: CustomerInfo | null): PremiumPlan {
  const active = info?.entitlements.active
  if (!active) return null
  for (const id of ENTITLEMENT_IDS) {
    const row = active[id]
    if (!row) continue
    const sku = String(row.productIdentifier || '').toLowerCase()
    if (sku.includes('lifetime')) return 'lifetime'
    if (sku.includes('month')) return 'monthly'
    if (row.expirationDate) return 'monthly'
    return 'lifetime'
  }
  return null
}

function maybeCloudSync(premium: boolean): void {
  if (!premium || !auth.currentUser) return
  fullSync().catch((err) => {
    // Backup must never fail silently in dev — this catch used to hide
    // permission/config problems for weeks (see Firestore/Storage audit).
    if (__DEV__) console.warn('[sync] background sync failed:', (err as any)?.code || (err as Error)?.message || err)
  })
}

async function configureRevenueCat(): Promise<void> {
  const apiKey = revenueCatApiKey()
  if (!apiKey) {
    throw new Error('RevenueCat API key missing')
  }
  const Purchases = getPurchases()
  const { LOG_LEVEL } = getPurchasesModule()
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR)
  await Purchases.configure({
    apiKey,
    appUserID: undefined,
  })
}

let ready: Promise<void> | null = null
function ensurePurchases(): Promise<void> {
  if (!ready) {
    ready = configureRevenueCat().catch((err) => {
      ready = null
      throw err
    })
  }
  return ready
}

/** Signs the current user out of RevenueCat so the next person on this device
 *  cannot inherit the previous person's entitlements. Call on sign-out. */
export async function logOutRevenueCat(): Promise<void> {
  if (IS_WEB) return
  try {
    await ensurePurchases()
    await getPurchases().logOut()
  } catch {}
}

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PremiumState>(defaultState)
  const previewUnpaidRef = React.useRef(false)

  const updateState = useCallback((partial: Partial<PremiumState>) => {
    setState((prev) => ({ ...prev, ...partial }))
  }, [])

  const applyAccess = useCallback((info: CustomerInfo | null) => {
    const entitled = hasPremiumAccess(info)
    updateState({
      customerInfo: info,
      entitled,
      plan: planFromInfo(info),
      isPremium: IS_WEB ? !previewUnpaidRef.current : entitled && !previewUnpaidRef.current,
    })
  }, [updateState])

  const extractPackages = useCallback((offering: PurchasesOffering | null) => {
    if (!offering) {
      updateState({
        currentOffering: null,
        lifetimePackage: null,
        yearlyPackage: null,
        monthlyPackage: null,
      })
      return
    }

    const lifetime =
      offering.lifetime ??
      offering.availablePackages.find((p) => p.identifier === '$rc_lifetime') ??
      null
    const yearly = offering.annual ?? offering.availablePackages.find((p) => p.identifier === '$rc_annual') ?? null
    const monthly = offering.monthly ?? offering.availablePackages.find((p) => p.identifier === '$rc_monthly') ?? null

    updateState({
      currentOffering: offering,
      lifetimePackage: lifetime,
      yearlyPackage: yearly,
      monthlyPackage: monthly,
    })
  }, [updateState])

  const checkPremium = useCallback(async (info?: CustomerInfo) => {
    try {
      let customerInfo: CustomerInfo
      if (info) {
        customerInfo = info
      } else {
        customerInfo = await getPurchases().getCustomerInfo()
      }
      applyAccess(customerInfo)
    } catch {
      applyAccess(null)
    }
  }, [applyAccess])

  const loadOfferings = useCallback(async () => {
    try {
      const offerings = await getPurchases().getOfferings()
      const current = offerings.current
      extractPackages(current)
      return current
    } catch {
      extractPackages(null)
      return null
    }
  }, [extractPackages])

  const init = useCallback(async () => {
    if (IS_WEB) {
      // RevenueCat is native-only. On web there is no store, so treat the app
      // as premium (the "preview unpaid" toggle can still lock it for paywall work).
      updateState({ isLoading: false })
      return
    }
    try {
      await ensurePurchases()
      const uid = auth.currentUser?.uid
      if (uid) {
        try {
          const { customerInfo } = await getPurchases().logIn(uid)
          applyAccess(customerInfo)
        } catch {}
      }
      await Promise.all([loadOfferings(), checkPremium()])

      getPurchases().addCustomerInfoUpdateListener((customerInfo) => {
        checkPremium(customerInfo)
      })
    } catch (err) {
      // RevenueCat is down or unreachable. The app must stay usable: the layout
      // treats initFailed as a temporary unlock and the paywall shows a Close
      // button so nobody gets trapped (see app/_layout.tsx, app/premium.tsx).
      console.warn('RevenueCat init failed, running in free mode')
      updateState({ initFailed: true })
    } finally {
      updateState({ isLoading: false })
    }
  }, [loadOfferings, checkPremium, applyAccess, updateState])

  useEffect(() => {
    init()
    let prevUid: string | null = auth.currentUser?.uid ?? null
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (IS_WEB) return
      try {
        await ensurePurchases()
        const next = user?.uid ?? null
        if (prevUid && next && prevUid !== next) {
          try {
            const info = await getPurchases().getCustomerInfo()
            if (!String(info.originalAppUserId).startsWith('$RCAnonymousID:')) {
              await getPurchases().logOut()
            }
          } catch {}
        }
        prevUid = next
        if (user) {
          // Isolate the RevenueCat logIn: if it throws (RC outage), the
          // entitlement still needs resolving so cloud backup isn't skipped
          // for the whole session.
          let entitled = false
          try {
            const { customerInfo } = await getPurchases().logIn(user.uid)
            applyAccess(customerInfo)
            entitled = hasPremiumAccess(customerInfo)
          } catch {
            try {
              const customerInfo = await getPurchases().getCustomerInfo()
              applyAccess(customerInfo)
              entitled = hasPremiumAccess(customerInfo)
            } catch {}
          }
          maybeCloudSync(entitled && !previewUnpaidRef.current)
        } else {
          await checkPremium()
        }
      } catch {}
    })
    return () => {
      unsub()
      try {
        getPurchases().removeCustomerInfoUpdateListener(checkPremium as any)
      } catch {}
    }
  }, [init, checkPremium, applyAccess])

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    if (IS_WEB) return false
    try {
      await ensurePurchases()
      const { customerInfo } = await getPurchases().purchasePackage(pkg)
      previewUnpaidRef.current = false
      applyAccess(customerInfo)
      const granted = hasPremiumAccess(customerInfo)
      if (granted) maybeCloudSync(true)
      return granted
    } catch (err: any) {
      if (err?.userCancelled) {
        return false
      }
      throw new Error('Something went wrong. Please try again.')
    }
  }, [applyAccess])

  const purchase = useCallback(async (): Promise<boolean> => {
    try {
      await ensurePurchases()
      const offerings = await getPurchases().getOfferings()
      extractPackages(offerings.current)
      const current = offerings.current
      const pkg =
        current?.lifetime ??
        current?.availablePackages.find((p) => p.identifier === '$rc_lifetime') ??
        null
      if (!pkg) {
        throw new Error(
          Platform.OS === 'android'
            ? 'Google Play did not return the lifetime product. Check that the in-app product is active in Play Console, then retry.'
            : 'Apple did not return the lifetime product. Paid Apps agreement must be Active, and Lifetime is only for sale in the US until we open more countries.'
        )
      }
      return await purchasePackage(pkg)
    } catch (err: any) {
      if (err?.userCancelled) return false
      if (err instanceof Error && err.message.startsWith('The lifetime')) throw err
      if (err instanceof Error && err.message.startsWith('Something went')) throw err
      throw new Error(
        Platform.OS === 'android'
          ? 'Google Play did not return any Classic Garage products. Check Play Console in-app products, then retry.'
          : 'The App Store did not return any Classic Garage products. Check Paid Apps + tax/banking, then retry.'
      )
    }
  }, [purchasePackage, extractPackages])

  const restore = useCallback(async (): Promise<boolean> => {
    if (IS_WEB) return false
    try {
      await ensurePurchases()
      const customerInfo = await getPurchases().restorePurchases()
      previewUnpaidRef.current = false
      applyAccess(customerInfo)
      const granted = hasPremiumAccess(customerInfo)
      if (granted) maybeCloudSync(true)
      return granted
    } catch {
      throw new Error('Could not restore purchases. Try again later.')
    }
  }, [applyAccess])

  const presentPaywallIfAvailable = useCallback(async (): Promise<boolean> => {
    try {
      if (!PurchasesUI.presentPaywall) return false
      await PurchasesUI.presentPaywall()
      const customerInfo = await getPurchases().getCustomerInfo()
      applyAccess(customerInfo)
      return hasPremiumAccess(customerInfo)
    } catch {
      return false
    }
  }, [applyAccess])

  const presentCustomerCenterFn = useCallback(async (): Promise<void> => {
    try {
      if (PurchasesUI.presentCustomerCenter) {
        await PurchasesUI.presentCustomerCenter()
        applyAccess(await getPurchases().getCustomerInfo())
      }
    } catch {}
  }, [applyAccess])

  const setPreviewUnpaid = useCallback((on: boolean) => {
    previewUnpaidRef.current = on
    updateState({
      previewUnpaid: on,
      isPremium: IS_WEB
        ? !on
        : (!on && hasPremiumAccess(state.customerInfo)) || state.initFailed,
    })
  }, [state.customerInfo, state.initFailed, updateState])

  const refresh = useCallback(async () => {
    await Promise.all([loadOfferings(), checkPremium()])
  }, [loadOfferings, checkPremium])

  return (
    <PremiumContext.Provider
      value={{
        ...state,
        purchasePackage,
        purchase,
        restore,
        presentPaywallIfAvailable,
        presentCustomerCenter: presentCustomerCenterFn,
        refresh,
        setPreviewUnpaid,
      }}
    >
      {children}
    </PremiumContext.Provider>
  )
}

interface PremiumContextType extends PremiumState, PremiumActions {}

const PremiumContext = createContext<PremiumContextType>({
  ...defaultState,
  purchasePackage: async () => false,
  purchase: async () => false,
  restore: async () => false,
  presentPaywallIfAvailable: async () => false,
  presentCustomerCenter: async () => {},
  refresh: async () => {},
  setPreviewUnpaid: () => {},
})

export function usePremium() {
  return useContext(PremiumContext)
}
