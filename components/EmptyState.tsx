import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { typography, spacing, motion } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { useLargeText } from '../utils/LargeTextContext'
import AppIcon, { type AppIconName } from './AppIcon'

interface EmptyStateProps {
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  icon?: AppIconName
}

export default function EmptyState({ title, subtitle, actionLabel, onAction, icon = 'car' }: EmptyStateProps) {
  const { colors } = useTheme()
  const { scale } = useLargeText()
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: 60,
    },
    glyph: {
      width: 76,
      height: 76,
      borderRadius: 38,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: scale(typography.title),
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -0.3,
      marginBottom: spacing.sm,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: scale(typography.body),
      textAlign: 'center',
      lineHeight: Math.round(scale(typography.body) * 1.4),
      color: colors.textSecondary,
    },
    action: {
      marginTop: spacing.lg,
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingVertical: 14,
      paddingHorizontal: spacing.xl,
      minHeight: 48,
      justifyContent: 'center',
      borderCurve: 'continuous',
    },
    actionText: {
      color: colors.onPrimary,
      fontWeight: '700',
      fontSize: scale(typography.body),
    },
  }), [colors, scale])

  return (
    <View style={styles.container}>
      <View style={styles.glyph} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <AppIcon name={icon} color={colors.textMuted} size={32} decorative />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [styles.action, pressed && { transform: [{ scale: motion.pressScale }], backgroundColor: colors.primaryDark }]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
