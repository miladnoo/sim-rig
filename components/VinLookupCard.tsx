import { useEffect, useMemo, useRef } from 'react'
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { typography, spacing, borderRadius, motion } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import AppIcon from './AppIcon'
import VinBarcodeMark from './VinBarcodeMark'

export type VinLookupPhase = 'idle' | 'working' | 'success'

export default function VinLookupCard({
  value,
  onChangeText,
  onScan,
  onFill,
  phase,
  successLabel,
}: {
  value: string
  onChangeText: (text: string) => void
  onScan?: () => void
  onFill: () => void
  phase: VinLookupPhase
  successLabel?: string
}) {
  const { colors } = useTheme()
  const showScan = Platform.OS !== 'web' && !!onScan
  const pop = useRef(new Animated.Value(0.92)).current
  const fade = useRef(new Animated.Value(0)).current
  const working = phase === 'working'
  const success = phase === 'success'

  useEffect(() => {
    if (!success) {
      pop.setValue(0.92)
      fade.setValue(0)
      return
    }
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: reduced ? 1 : 220, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pop, { toValue: 1, duration: reduced ? 1 : 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start()
    })
    return () => { cancelled = true }
  }, [success, fade, pop])

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: success ? colors.success : colors.border,
      borderCurve: 'continuous',
    },
    kicker: {
      fontSize: typography.caption,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    scan: {
      minHeight: 132,
      borderRadius: borderRadius.sm,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: success ? colors.success : colors.primary,
      backgroundColor: colors.fill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderCurve: 'continuous',
    },
    scanLabel: {
      marginTop: spacing.sm,
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    scanHint: {
      marginTop: 4,
      fontSize: typography.bodySmall,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    successRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    successText: {
      flex: 1,
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.success,
    },
    typeLabel: {
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
      fontSize: typography.body,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.sm,
      padding: spacing.md,
      minHeight: 48,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: typography.body,
      borderCurve: 'continuous',
    },
    fill: {
      marginTop: spacing.sm,
      minHeight: 52,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      opacity: working ? 0.7 : 1,
      borderCurve: 'continuous',
    },
    fillText: { color: colors.onPrimary, fontWeight: '700', fontSize: typography.body },
    status: {
      marginTop: spacing.sm,
      fontSize: typography.bodySmall,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  }), [colors, success, working])

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Start with the VIN</Text>
      {showScan ? (
        <Pressable
          onPress={onScan}
          disabled={working}
          accessibilityRole="button"
          accessibilityLabel="Scan VIN barcode"
          accessibilityHint="Opens the camera to scan the barcode on the dash or door sticker"
          style={({ pressed }) => [styles.scan, pressed && { transform: [{ scale: motion.pressScale }] }]}
        >
          {success ? (
            <Animated.View style={{ alignItems: 'center', opacity: fade, transform: [{ scale: pop }] }}>
              <AppIcon name="check" color={colors.success} size={36} decorative />
              <Text style={styles.scanLabel}>VIN found</Text>
              {successLabel ? <Text style={styles.scanHint}>{successLabel}</Text> : null}
            </Animated.View>
          ) : (
            <>
              <VinBarcodeMark color={colors.textPrimary} busy={working} />
              <Text style={styles.scanLabel}>{working ? 'Looking up this VIN…' : 'Scan barcode'}</Text>
              <Text style={styles.scanHint}>
                {working ? 'Checking year, make, and model' : 'Tap here · dash or driver door sticker'}
              </Text>
            </>
          )}
        </Pressable>
      ) : null}

      <Text style={styles.typeLabel}>Or type the VIN</Text>
      <TextInput
        style={styles.input}
        placeholder="17 characters, 1981 and newer"
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel="VIN"
        editable={!working}
      />
      <Pressable
        onPress={onFill}
        disabled={working}
        accessibilityRole="button"
        accessibilityLabel="Fill from VIN"
        style={({ pressed }) => [styles.fill, pressed && { transform: [{ scale: motion.pressScale }], opacity: 0.88 }]}
      >
        <Text style={styles.fillText}>{working ? 'Working…' : 'Fill from VIN'}</Text>
      </Pressable>
      {success && successLabel ? (
        <View style={styles.successRow}>
          <AppIcon name="check" color={colors.success} size={20} decorative />
          <Text style={styles.successText}>{successLabel}</Text>
        </View>
      ) : (
        <Text style={styles.status}>Older cars without a 17-character VIN: skip this and type make and model below.</Text>
      )}
    </View>
  )
}
