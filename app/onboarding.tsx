import { useMemo, useState } from 'react'
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography, spacing, borderRadius, motion } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { useLargeText } from '../utils/LargeTextContext'
import { useOnboarding } from '../utils/OnboardingContext'
import AppIcon from '../components/AppIcon'

const TAP = Platform.OS === 'android' ? 48 : 44

// A real photo, not an icon placeholder — the demo card should be
// indistinguishable from the product. Photo matches the name: a genuine
// '67 fastback (visually verified at the dashboard's banner crop).
// Bundled so the example card renders instantly, offline, and matches the demo garage.
const DEMO_PHOTO = require('../assets/images/demo-mustang67.jpg')

export default function OnboardingScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const { scale } = useLargeText()
  const { complete } = useOnboarding()
  const [step, setStep] = useState(0)
  const last = step === 2
  const ripple = Platform.OS === 'android' ? { color: colors.fill } : undefined

  const styles = useMemo(() => StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: insets.top + spacing.lg,
      paddingBottom: insets.bottom + spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    kicker: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: typography.caption,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    body: { flex: 1, justifyContent: 'center' },
    title: {
      fontSize: scale(typography.display),
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.8,
      lineHeight: scale(typography.display) * 1.12,
      marginBottom: spacing.md,
    },
    copy: {
      fontSize: scale(typography.body),
      lineHeight: 26,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
    },
    preview: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
      borderCurve: 'continuous',
    },
    hero: {
      width: '100%',
      height: 168,
      backgroundColor: colors.fill,
    },
    cardBody: { padding: spacing.md },
    carName: {
      fontWeight: '700',
      color: colors.textPrimary,
      fontSize: typography.title,
      letterSpacing: -0.4,
      marginBottom: spacing.sm,
    },
    meta: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    metaLabel: { color: colors.textSecondary, fontSize: typography.bodySmall },
    metaValue: {
      color: colors.textPrimary,
      fontSize: typography.bodySmall,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    serviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
    },
    serviceIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.fill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    serviceTitle: { fontWeight: '600', color: colors.textPrimary, fontSize: typography.body },
    serviceSub: {
      color: colors.textSecondary,
      fontSize: typography.bodySmall,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    valueRows: { gap: spacing.sm, marginBottom: spacing.sm },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.cardBorder,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderCurve: 'continuous',
    },
    valueIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.fill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    valueTitle: { fontWeight: '700', color: colors.textPrimary, fontSize: typography.body },
    valueSub: { color: colors.textSecondary, fontSize: typography.bodySmall, marginTop: 2 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.lg },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.fill },
    dotOn: { backgroundColor: colors.primary, width: 22 },
    row: { flexDirection: 'row', gap: spacing.sm },
    btn: {
      flex: 1,
      minHeight: TAP,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderCurve: 'continuous',
    },
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    primaryText: { color: colors.onPrimary, fontWeight: '700', fontSize: 19 },
    secondaryText: { color: colors.textPrimary, fontWeight: '600', fontSize: typography.body },
  }), [colors, insets.bottom, insets.top, scale])

  const finish = async () => {
    await complete()
    // Step 2 is a value story, not a price sheet — the decision happens on
    // the paywall, where the real packages live.
    router.replace(last ? '/premium' : '/')
  }

  const ctaLabel = last ? 'See plans' : 'Next'

  return (
    <View style={styles.root}>
      {/* The dots below are the only progress indicator — a second counter
          here was redundant. Screen readers still announce the step. */}
      <View accessibilityRole="text" accessibilityLabel={`Classic Garage intro, step ${step + 1} of 3`}>
        <Text style={styles.kicker}>Classic Garage</Text>
      </View>

      <View style={styles.body}>
        {step === 0 ? (
          <>
            <Text style={styles.title}>Your garage,{"\n"}in your pocket.</Text>
            <Text style={styles.copy}>
              Every car is a card. Open it for the service log. Remove it when you sell.
              Everything stays on this phone unless you make a backup.
            </Text>
            <View style={styles.preview} accessibilityElementsHidden>
              <Image source={DEMO_PHOTO} style={styles.hero} resizeMode="cover" accessibilityIgnoresInvertColors />
              <View style={styles.cardBody}>
                <Text style={styles.carName}>1967 Ford Mustang GT</Text>
                <View style={styles.meta}>
                  <Text style={styles.metaLabel}>Miles</Text>
                  <Text style={styles.metaValue}>89,420</Text>
                </View>
                <View style={styles.meta}>
                  <Text style={styles.metaLabel}>Last service</Text>
                  <Text style={styles.metaValue}>Mar 12, 2026</Text>
                </View>
              </View>
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={styles.title}>Write the work down.</Text>
            <Text style={styles.copy}>
              Oil, brakes, the part number, the receipt. Where you can find it — and ready
              to hand to a shop or a buyer as a clean PDF.
            </Text>
            <View style={styles.preview} accessibilityElementsHidden>
              <View style={styles.serviceRow}>
                <View style={styles.serviceIcon}>
                  <AppIcon name="wrench" color={colors.primary} size={18} decorative />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceTitle}>Oil and filter</Text>
                  <Text style={styles.serviceSub}>Mar 12 · 89,420 mi · $49.99</Text>
                </View>
              </View>
              <View style={styles.serviceRow}>
                <View style={styles.serviceIcon}>
                  <AppIcon name="doc" color={colors.primary} size={18} decorative />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceTitle}>Front brakes</Text>
                  <Text style={styles.serviceSub}>Receipt attached</Text>
                </View>
              </View>
              <View style={[styles.serviceRow, { borderBottomWidth: 0 }]}>
                <View style={styles.serviceIcon}>
                  <AppIcon name="plus" color={colors.textMuted} size={18} decorative />
                </View>
                <Text style={[styles.serviceTitle, { color: colors.textSecondary }]}>Add a service</Text>
              </View>
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.title}>Built to last.</Text>
            <Text style={styles.copy}>
              Unlock everything once and it stays yours — no matter how many
              cars come and go.
            </Text>
            <View style={styles.valueRows} accessibilityElementsHidden>
              <View style={styles.valueRow}>
                <View style={styles.valueIcon}>
                  <AppIcon name="car" color={colors.primary} size={18} decorative />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.valueTitle}>Unlimited cars</Text>
                  <Text style={styles.valueSub}>The daily driver, the project, the one that got away.</Text>
                </View>
              </View>
              <View style={styles.valueRow}>
                <View style={styles.valueIcon}>
                  <AppIcon name="doc" color={colors.primary} size={18} decorative />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.valueTitle}>Print-ready history</Text>
                  <Text style={styles.valueSub}>A clean PDF any shop or buyer will actually read.</Text>
                </View>
              </View>
              <View style={styles.valueRow}>
                <View style={styles.valueIcon}>
                  <AppIcon name="download" color={colors.primary} size={18} decorative />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.valueTitle}>Backups, yours to keep</Text>
                  <Text style={styles.valueSub}>Export a zip. Restore it anywhere, any time.</Text>
                </View>
              </View>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.dots} accessibilityElementsHidden>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
        ))}
      </View>

      <View style={styles.row}>
        {step > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.btn, styles.secondary, pressed && { opacity: 0.88, transform: [{ scale: motion.pressScale }] }]}
            onPress={() => setStep((s) => s - 1)}
            android_ripple={ripple}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.secondaryText}>Back</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.btn, styles.primary, pressed && { opacity: 0.88, transform: [{ scale: motion.pressScale }] }]}
          onPress={() => (last ? finish() : setStep((s) => s + 1))}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text style={styles.primaryText}>{ctaLabel}</Text>
        </Pressable>
      </View>
    </View>
  )
}
