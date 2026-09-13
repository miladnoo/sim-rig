import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import { typography, spacing, borderRadius } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import type { PremiumPlan } from '../utils/PremiumContext'
import AppIcon from './AppIcon'

export default function PremiumBanner({
  entitled,
  previewUnpaid,
  plan,
  onPress,
  onPreviewUnpaid,
}: {
  entitled: boolean
  previewUnpaid: boolean
  plan: PremiumPlan
  onPress: () => void
  onPreviewUnpaid?: () => void
}) {
  const { colors } = useTheme()
  const unlocked = entitled && !previewUnpaid
  const styles = useMemo(() => StyleSheet.create({
    wrap: {
      backgroundColor: unlocked ? colors.surface : colors.primary,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderCurve: 'continuous',
    },
    title: {
      fontWeight: '700',
      fontSize: typography.body,
      color: unlocked ? colors.textPrimary : colors.onPrimary,
    },
    body: {
      marginTop: 4,
      fontSize: typography.bodySmall,
      lineHeight: 22,
      color: unlocked ? colors.textSecondary : colors.onPrimary,
    },
    preview: {
      marginTop: spacing.sm,
      minHeight: 48,
      justifyContent: 'center',
    },
    previewText: {
      fontWeight: '600',
      fontSize: typography.bodySmall,
      color: unlocked ? colors.primary : colors.onPrimary,
    },
  }), [colors, unlocked])

  const planLabel = plan === 'monthly' ? 'Monthly' : plan === 'lifetime' ? 'Lifetime' : 'Premium'
  const title = previewUnpaid
    ? 'Previewing unpaid'
    : unlocked
      ? `${planLabel} is on`
      : 'Not unlocked'
  const body = previewUnpaid
    ? 'This is what a new person sees. Close on the next screen to come back.'
    : unlocked
      ? 'Garage, PDF, and backup are on for this device. Sign-in is optional.'
      : `Lifetime or a 7-day trial, then monthly. ${Platform.OS === 'android' ? 'Google Play' : 'Apple'} handles payment.`

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
          <AppIcon name="chevron" color={unlocked ? colors.textMuted : colors.onPrimary} size={18} decorative />
        </View>
      </Pressable>
      {entitled && onPreviewUnpaid && __DEV__ ? (
        <Pressable
          style={styles.preview}
          onPress={onPreviewUnpaid}
          accessibilityRole="button"
          accessibilityLabel={previewUnpaid ? 'Leave unpaid preview' : 'Preview the unpaid app'}
        >
          <Text style={styles.previewText}>
            {previewUnpaid ? 'Back to unlocked' : 'Preview unpaid app'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
