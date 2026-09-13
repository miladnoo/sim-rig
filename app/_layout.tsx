import { useEffect, useMemo } from 'react'
import { Platform } from 'react-native'
import { Stack, usePathname, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ThemeProvider as RNThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native'
import * as SystemUI from 'expo-system-ui'
import { useTheme, ThemeProvider } from '../utils/ThemeContext'
import { LargeTextProvider, useLargeText } from '../utils/LargeTextContext'
import { PremiumProvider, usePremium } from '../utils/PremiumContext'
import { AuthProvider } from '../utils/AuthContext'
import { OnboardingProvider, useOnboarding } from '../utils/OnboardingContext'
import { configureGoogleSignIn } from '../utils/GoogleAuthService'
import ErrorBoundary from '../components/ErrorBoundary'

function ThemedStack() {
  const { isDark, colors } = useTheme()
  const { scale } = useLargeText()
  const { isPremium, isLoading: premiumLoading, previewUnpaid, initFailed } = usePremium()
  const { ready, seen } = useOnboarding()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!ready || premiumLoading) return
    if (!seen) {
      if (pathname !== '/onboarding') router.replace('/onboarding')
      return
    }
    if (isPremium) return
    if (initFailed) return // RC unreachable: keep the app usable, no paywall trap
    if (pathname === '/premium' || pathname === '/privacy' || pathname === '/onboarding') return
    router.replace(previewUnpaid ? '/premium?preview=1' : '/premium')
  }, [ready, seen, premiumLoading, isPremium, previewUnpaid, initFailed, pathname, router])

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background)
  }, [colors.background])

  useEffect(() => {
    configureGoogleSignIn()
  }, [])

  const navigationTheme = useMemo(() => ({
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.separator,
      primary: colors.primary,
    },
  }), [isDark, colors])

  return (
    <RNThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '600', fontSize: scale(17) },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          contentStyle: { backgroundColor: colors.background },
          ...(Platform.OS === 'ios'
            ? { headerLargeTitleShadowVisible: false }
            : {}),
        }}
      >
        <Stack.Screen name="index" options={{ headerTitle: 'Garage', headerLargeTitle: true }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="add-car"
          options={{
            headerTitle: 'Add a car',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="car/[id]"
          options={{ headerTitle: '', headerBackTitle: 'Garage' }}
        />
        <Stack.Screen
          name="car/[id]/service/[serviceId]"
          options={{ headerTitle: 'Service details', headerShown: true }}
        />
        <Stack.Screen
          name="car/[id]/add"
          options={{
            headerTitle: 'Add a service',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="car/[id]/edit"
          options={{
            headerTitle: 'Edit car',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerTitle: 'Settings', headerLargeTitle: true }}
        />
        <Stack.Screen
          name="premium"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="auth"
          options={{ headerTitle: 'Account', presentation: 'modal' }}
        />
        <Stack.Screen
          name="privacy"
          options={{ headerTitle: 'Privacy' }}
        />
      </Stack>
    </RNThemeProvider>
  )
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
    <LargeTextProvider>
      <ThemeProvider>
        <AuthProvider>
          <OnboardingProvider>
            <PremiumProvider>
              <ThemedStack />
            </PremiumProvider>
          </OnboardingProvider>
        </AuthProvider>
      </ThemeProvider>
    </LargeTextProvider>
    </ErrorBoundary>
  )
}
