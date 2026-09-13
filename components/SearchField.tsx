import { Platform, TextInput, StyleSheet, View, Pressable } from 'react-native'
import { useMemo } from 'react'
import { typography, spacing, borderRadius } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { useLargeText } from '../utils/LargeTextContext'
import AppIcon from './AppIcon'

export default function SearchField({
  placeholder,
  value,
  onChangeText,
}: {
  placeholder: string
  value: string
  onChangeText: (text: string) => void
}) {
  const { colors } = useTheme()
  const { scale } = useLargeText()
  const styles = useMemo(() => StyleSheet.create({
    wrap: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      backgroundColor: colors.fill,
      borderRadius: 999,
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: spacing.md,
      paddingRight: 6,
      gap: spacing.sm,
      borderCurve: 'continuous',
    },
    input: {
      flex: 1,
      color: colors.textPrimary,
      paddingVertical: spacing.sm,
      minHeight: 48,
    },
    clearBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
    },
  }), [colors])

  if (Platform.OS !== 'android') return null

  return (
    <View style={styles.wrap}>
      <AppIcon name="search" color={colors.textMuted} size={18} decorative />
      <TextInput
        style={[styles.input, { fontSize: scale(typography.body) }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel={placeholder}
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.5 }]}
        >
          <AppIcon name="close" color={colors.textMuted} size={18} decorative />
        </Pressable>
      ) : null}
    </View>
  )
}
