import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useMemo } from 'react'
import { typography, spacing, borderRadius } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { useLargeText } from '../utils/LargeTextContext'

interface PickerItem {
  label: string
  onPress: () => void
}

interface PickerModalProps {
  visible: boolean
  title: string
  items: PickerItem[]
  onCancel: () => void
}

export default function PickerModal({ visible, title, items, onCancel }: PickerModalProps) {
  const { colors } = useTheme()
  const { scale } = useLargeText()
  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      maxHeight: '70%',
      borderCurve: 'continuous',
    },
    title: {
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      letterSpacing: -0.3,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
    },
    item: {
      minHeight: 48,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
      justifyContent: 'center',
    },
    itemText: {
      color: colors.textPrimary,
      textAlign: 'center',
    },
    cancelBtn: {
      marginTop: spacing.sm,
      minHeight: 48,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    cancelText: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
  }), [colors])

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={[styles.title, { fontSize: scale(typography.title) }]}>{title}</Text>
          <ScrollView bounces={false}>
            {items.map((item, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.fill }]}
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Text style={[styles.itemText, { fontSize: scale(typography.body) }]}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.cancelBtn} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={[styles.cancelText, { fontSize: scale(typography.body) }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
