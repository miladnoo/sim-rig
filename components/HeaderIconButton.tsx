import { Pressable, StyleSheet } from 'react-native'
import { motion } from '../theme'
import AppIcon, { type AppIconName } from './AppIcon'

export default function HeaderIconButton({
  name,
  color,
  onPress,
  accessibilityLabel,
  disabled,
}: {
  name: AppIconName
  color: string
  onPress: () => void
  accessibilityLabel: string
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.hit,
        pressed && !disabled && { transform: [{ scale: motion.pressScale }] },
        disabled && { opacity: 0.4 },
      ]}
    >
      <AppIcon name={name} color={color} size={22} decorative />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
