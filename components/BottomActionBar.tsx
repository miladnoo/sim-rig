import { useMemo } from 'react'
import { Pressable, Text, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography, spacing, borderRadius, motion, elevation } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { pressTick } from '../utils/haptics'
import AppIcon from './AppIcon'

export default function BottomActionBar({
  label,
  icon = 'plus',
  onPress,
}: {
  label: string
  icon?: 'plus' | 'wrench'
  onPress: () => void
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: Math.max(insets.bottom, spacing.md),
      alignItems: 'center',
      // The wrapper must not swallow taps meant for content underneath —
      // without box-none its padding dead-zones cover list content.
      // 'box-none' lets touches pass through the wrapper and its padding
      // while the button itself stays tappable.
    },
    btn: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      minHeight: 56,
      borderRadius: 999,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderCurve: 'continuous',
      ...elevation.bar,
    },
    label: {
      color: colors.onPrimary,
      fontWeight: '700',
      // 19px bold keeps white-on-red inside WCAG large-text territory in dark
      // mode, where the brighter red drops the pair to ~3.4:1.
      fontSize: 19,
    },
  }), [colors, insets.bottom])

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={pressTick}
        onPress={onPress}
        style={({ pressed }) => [
          styles.btn,
          pressed && { transform: [{ scale: motion.pressScale }], backgroundColor: colors.primaryDark },
        ]}
      >
        <AppIcon name={icon} color={colors.onPrimary} size={20} decorative />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  )
}
