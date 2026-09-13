import { useMemo } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { motion, elevation } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import AppIcon from './AppIcon'

export default function FAB({ onPress, accessibilityLabel = 'Add' }: { onPress: () => void; accessibilityLabel?: string }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => StyleSheet.create({
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24 + insets.bottom,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary,
      ...elevation.fab,
    },
  }), [colors, insets.bottom])

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.fab,
        pressed && { transform: [{ scale: motion.pressScale }], backgroundColor: colors.primaryDark },
      ]}
      onPress={onPress}
    >
      <AppIcon name="plus" color={colors.onPrimary} size={26} decorative />
    </Pressable>
  )
}
