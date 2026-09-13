import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
} from 'react-native'
import { Stack, useRouter, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography, spacing, borderRadius } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { useLargeText } from '../utils/LargeTextContext'
import { usePremium } from '../utils/PremiumContext'
import SimpleAlert from '../components/SimpleAlert'
import AppIcon from '../components/AppIcon'

const SUPPORT_EMAIL = 'quizdue.dev@gmail.com'
const TAP = Platform.OS === 'android' ? 48 : 44

const FEATURES = [
  'Garage and service log on this phone',
  'PDF for a sale or a shop visit',
  'A backup file you can restore',
  '24/7 support directly from the creator of the app',
]

function UsaMadeTag({
  colors,
  scale,
}: {
  colors: { fill: string; border: string; textPrimary: string }
  scale: (n: number) => number
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        gap: spacing.sm,
        backgroundColor: colors.fill,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderCurve: 'continuous',
      }}
      accessibilityRole="text"
      accessibilityLabel="Made in the USA"
    >
      <UsaFlag />
      <Text
        numberOfLines={1}
        style={{ fontWeight: '700', color: colors.textPrimary, fontSize: scale(typography.caption) }}
      >
        Made in the USA
      </Text>
    </View>
  )
}

function UsaFlag() {
  const stripes = [0, 1, 2, 3, 4, 5, 6]
  return (
    <View
      style={{
        width: 22,
        height: 14,
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {stripes.map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: i % 2 === 0 ? '#B22234' : '#FFFFFF',
          }}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 9,
          height: 8,
          backgroundColor: '#3C3B6E',
        }}
      />
    </View>
  )
}

export default function PremiumScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const preview = useLocalSearchParams<{ preview?: string }>().preview === '1'
  const {
    isPremium,
    previewUnpaid,
    initFailed,
    setPreviewUnpaid,
    purchasePackage,
    restore,
    lifetimePackage,
    monthlyPackage,
    refresh,
    isLoading,
  } = usePremium()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { scale } = useLargeText()
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null)
  const [plan, setPlan] = useState<'lifetime' | 'monthly'>('lifetime')
  const [alert, setAlert] = useState<{ title: string; message: string; goHome?: boolean } | null>(null)

  const showBuy = !isPremium || preview || previewUnpaid
  // Real unpaid users must always be able to leave the paywall when the store
  // layer is broken (RC init failure, offerings missing) — never trap someone
  // in a screen they cannot close.
  const canLeave = isPremium || preview || previewUnpaid || initFailed
  const ripple = Platform.OS === 'android' ? { color: colors.fill } : undefined

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: canLeave })
  }, [navigation, canLeave])

  const lifetimePrice = lifetimePackage?.product.priceString || '$24.99'
  const monthlyPrice = monthlyPackage?.product.priceString || '$4.99'
  const ctaHint = plan === 'lifetime'
    ? 'Pay once. Own it forever.'
    : `7-day free trial, then ${monthlyPrice} a month.`

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      paddingHorizontal: spacing.md,
      paddingTop: insets.top + spacing.sm,
      paddingBottom: spacing.md,
    },
    header: { gap: 4, marginBottom: spacing.md },
    kicker: {
      color: colors.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    title: {
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    subtitle: { color: colors.textSecondary, lineHeight: 22, marginTop: 4 },
    plans: { gap: spacing.sm },
    plan: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: colors.border,
      borderCurve: 'continuous',
    },
    planLifetime: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    planMonthly: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    planOn: { borderColor: colors.primary },
    planTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    planName: { fontWeight: '700', color: colors.textPrimary, flex: 1, minWidth: 0 },
    planPrice: {
      fontWeight: '700',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    planBlurb: { color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 },
    badge: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginBottom: spacing.sm,
      alignSelf: 'flex-start',
    },
    badgeText: { color: colors.onPrimary, fontWeight: '700' },
    features: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
      borderCurve: 'continuous',
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingVertical: 8,
      minHeight: TAP,
    },
    feature: { color: colors.textPrimary, flex: 1, minWidth: 0, lineHeight: 22 },
    usa: { marginTop: spacing.md },
    footer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: insets.bottom + spacing.sm,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
      gap: spacing.sm,
    },
    ctaHint: {
      color: colors.textPrimary,
      fontWeight: '600',
      textAlign: 'center',
    },
    cta: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      minHeight: TAP,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      borderCurve: 'continuous',
    },
    ctaText: { color: colors.onPrimary, fontWeight: '700' },
    storeNote: { color: colors.textSecondary, lineHeight: 18, textAlign: 'center' },
    footerLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
    // Quiet, centered, muted — a courtesy row, not a competing action.
    restore: { minHeight: TAP, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md },
    restoreText: { color: colors.textSecondary, fontWeight: '500' },
    later: { flex: 1, minHeight: TAP, justifyContent: 'center', alignItems: 'center' },
    laterText: { color: colors.textSecondary },
  }), [colors, insets.bottom, insets.top])

  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  const goHome = () => {
    if (previewUnpaid) setPreviewUnpaid(false)
    if (preview || (initFailed && !isPremium)) router.back()
    else router.replace('/')
  }

  const startJourney = async () => {
    const pkg = plan === 'lifetime' ? lifetimePackage : monthlyPackage
    if (busy || !pkg) {
      if (!pkg) {
        setAlert({
          title: 'Unavailable',
          message: plan === 'lifetime'
            ? (Platform.OS === 'android'
              ? 'Google Play did not return Lifetime. Check that the in-app product is active in Play Console, then retry.'
              : 'Apple did not return Lifetime. Paid Apps must be Active, and Lifetime is only for sale in the US right now.')
            : (Platform.OS === 'android'
              ? 'Google Play did not return Monthly. Check that the subscription with a 7-day trial is active in Play Console, then retry.'
              : 'Apple did not return Monthly. Paid Apps + tax/banking must be Active, and the first subscription has to be attached on the 1.0 version page.'),
        })
      }
      return
    }
    setBusy('buy')
    try {
      const success = await purchasePackage(pkg)
      if (success) {
        setAlert({
          title: 'You are in',
          message: `The garage is unlocked. Payment was secured by ${Platform.OS === 'android' ? 'Google Play' : 'the App Store'}.`,
          goHome: !preview,
        })
      }
    } catch (err: any) {
      setAlert({ title: 'Could not complete', message: err?.message || 'Try again later.' })
    } finally {
      setBusy(null)
    }
  }

  const handleRestore = async () => {
    if (busy) return
    setBusy('restore')
    try {
      const success = await restore()
      if (success) {
        setAlert({ title: 'Restored', message: 'Your purchase is back on this device.', goHome: !preview })
      } else {
        setAlert({
          title: 'Nothing to restore',
          message: Platform.OS === 'android'
            ? 'No purchase was found for this Google Play account.'
            : 'No purchase was found for this App Store account.',
        })
      }
    } catch (err: any) {
      setAlert({ title: 'Restore failed', message: err?.message || 'Try again later.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: canLeave }} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.kicker, { fontSize: scale(typography.caption) }]}>Classic Garage</Text>
          <Text style={[styles.title, { fontSize: scale(typography.header) }]}>
            {showBuy ? 'Unlock the garage' : 'Unlocked'}
          </Text>
          <Text style={[styles.subtitle, { fontSize: scale(typography.bodySmall) }]}>
            {showBuy
              ? 'Lifetime is pay once. Monthly starts with a 7-day trial.'
              : 'This device can use the garage, PDFs, and backups.'}
          </Text>
        </View>

        {showBuy ? (
          <View style={styles.plans} accessibilityRole="radiogroup">
            <Pressable
              style={({ pressed }) => [
                styles.plan,
                styles.planLifetime,
                plan === 'lifetime' && styles.planOn,
                pressed && { opacity: 0.92 },
              ]}
              onPress={() => setPlan('lifetime')}
              android_ripple={ripple}
              accessibilityRole="radio"
              accessibilityState={{ selected: plan === 'lifetime' }}
              accessibilityLabel={`Lifetime, ${lifetimePrice}, Best value, pay once own it forever`}
            >
              <View style={styles.badge}>
                <Text numberOfLines={1} style={[styles.badgeText, { fontSize: scale(11) }]}>
                  Best value
                </Text>
              </View>
              <View style={styles.planTop}>
                <Text style={[styles.planName, { fontSize: scale(typography.title) }]}>Lifetime</Text>
                <Text style={[styles.planPrice, { fontSize: scale(28) }]}>{lifetimePrice}</Text>
              </View>
              <Text style={[styles.planBlurb, { fontSize: scale(typography.bodySmall) }]}>
                Pay once. Own it forever.
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.plan,
                styles.planMonthly,
                plan === 'monthly' && styles.planOn,
                pressed && { opacity: 0.92 },
              ]}
              onPress={() => setPlan('monthly')}
              android_ripple={ripple}
              accessibilityRole="radio"
              accessibilityState={{ selected: plan === 'monthly' }}
              accessibilityLabel={`Monthly, 7-day free trial, then ${monthlyPrice} per month`}
            >
              <View style={styles.planTop}>
                <Text style={[styles.planName, { fontSize: scale(typography.body) }]}>Monthly</Text>
                <Text style={[styles.planPrice, { fontSize: scale(typography.title) }]}>{monthlyPrice}</Text>
              </View>
              <Text style={[styles.planBlurb, { fontSize: scale(typography.caption) }]}>
                7-day free trial, then {monthlyPrice} every month.
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.features}>
          {FEATURES.map((text) => {
            const isSupport = text.startsWith('24/7')
            const inner = (
              <>
                <AppIcon name="check" color={colors.success} size={18} decorative />
                <Text style={[styles.feature, { fontSize: scale(typography.bodySmall) }]}>{text}</Text>
              </>
            )
            if (isSupport) {
              return (
                <Pressable
                  key={text}
                  hitSlop={{ top: 4, bottom: 4 }}
                  style={({ pressed }) => [styles.featureRow, pressed && { opacity: 0.92 }]}
                  onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Classic Garage`)}
                  android_ripple={ripple}
                  accessibilityRole="link"
                  accessibilityLabel={`24/7 support directly from the creator of the app. Email ${SUPPORT_EMAIL}`}
                >
                  {inner}
                </Pressable>
              )
            }
            return (
              <View key={text} style={styles.featureRow}>
                {inner}
              </View>
            )
          })}
        </View>

        <View style={styles.usa}>
          <UsaMadeTag colors={colors} scale={scale} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : showBuy ? (
          <>
            <Text style={[styles.ctaHint, { fontSize: scale(typography.bodySmall) }]}>{ctaHint}</Text>
            <Pressable
              style={({ pressed }) => [styles.cta, (pressed || busy === 'buy') && { opacity: 0.88 }]}
              onPress={startJourney}
              disabled={busy !== null}
              android_ripple={ripple}
              accessibilityRole="button"
              accessibilityLabel={plan === 'lifetime'
                ? `Start with lifetime, ${lifetimePrice}. Pay once. Own it forever.`
                : `Start monthly, 7-day trial then ${monthlyPrice}`}
              accessibilityState={{ disabled: busy !== null }}
            >
              {busy === 'buy' ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={[styles.ctaText, { fontSize: scale(typography.body) }]}>Start your journey</Text>
              )}
            </Pressable>
            <Text style={[styles.storeNote, { fontSize: scale(typography.caption) }]}>
              Payment is secured by {Platform.OS === 'android' ? 'Google Play' : 'the App Store'}.
            </Text>
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.88 }]}
            onPress={goHome}
            android_ripple={ripple}
            accessibilityRole="button"
            accessibilityLabel="Back to garage"
          >
            <Text style={[styles.ctaText, { fontSize: scale(typography.body) }]}>Back to garage</Text>
          </Pressable>
        )}

        <View style={styles.footerLinks}>
          {/* Close exists for testing and for people who already own the app.
            In production an unpaid user sees only the CTA and a quiet restore
            row — no exit hatch fighting the paywall's job. */}
          {canLeave && (isPremium || __DEV__) ? (
            <Pressable
              style={({ pressed }) => [styles.later, pressed && { opacity: 0.88 }]}
              onPress={goHome}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={[styles.laterText, { fontSize: scale(typography.bodySmall) }]}>Close</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.restore, pressed && { opacity: 0.88 }]}
            onPress={handleRestore}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
            accessibilityState={{ disabled: busy !== null }}
          >
            {busy === 'restore' ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <Text style={[styles.restoreText, { fontSize: scale(typography.bodySmall) }]}>Restore purchases</Text>
            )}
          </Pressable>
        </View>
      </View>

      <SimpleAlert
        visible={alert !== null}
        title={alert?.title ?? ''}
        message={alert?.message ?? ''}
        onDismiss={() => {
          const go = alert?.goHome
          setAlert(null)
          if (go) router.replace('/')
        }}
      />
    </View>
  )
}
