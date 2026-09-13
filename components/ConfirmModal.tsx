import { Modal, View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions } from 'react-native'
import { useMemo } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography, spacing, borderRadius, motion } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { useLargeText } from '../utils/LargeTextContext'

interface ConfirmButton {
  text: string
  style?: 'cancel' | 'destructive' | 'default'
  onPress: () => void
}

interface ConfirmModalProps {
  visible: boolean
  title: string
  message: string
  buttons: ConfirmButton[]
}

export default function ConfirmModal({ visible, title, message, buttons }: ConfirmModalProps) {
  const { colors } = useTheme()
  const { scale } = useLargeText()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const cardWidth = Math.min(340, width - 40)
  const messageMax = Math.max(88, Math.min(220, height * 0.28))

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: insets.top + spacing.md,
      paddingBottom: insets.bottom + spacing.md,
      paddingHorizontal: 20,
    },
    card: {
      width: cardWidth,
      maxHeight: height * 0.78,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderCurve: 'continuous',
    },
    copy: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    title: {
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      letterSpacing: -0.3,
      marginBottom: spacing.sm,
    },
    message: {
      color: colors.textSecondary,
      textAlign: 'center',
    },
    actions: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
    button: {
      minHeight: 52,
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonSplit: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
    buttonText: {
      fontWeight: '600',
      textAlign: 'center',
      width: '100%',
    },
  }), [colors, cardWidth, height, insets.bottom, insets.top])

  const colorFor = (style?: string) => {
    if (style === 'destructive') return colors.error
    if (style === 'cancel') return colors.textPrimary
    return colors.primary
  }

  const dismiss = buttons.find((b) => b.style === 'cancel') ?? buttons[0]

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss?.onPress}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.copy}>
            <Text style={[styles.title, { fontSize: scale(20) }]}>{title}</Text>
            <ScrollView
              style={{ maxHeight: messageMax }}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.message, { fontSize: scale(typography.body), lineHeight: Math.round(scale(typography.body) * 1.4) }]}>
                {message}
              </Text>
            </ScrollView>
          </View>
          <View style={styles.actions}>
            {buttons.map((btn, i) => (
              <Pressable
                key={`${btn.text}-${i}`}
                style={({ pressed }) => [
                  styles.button,
                  i > 0 && styles.buttonSplit,
                  pressed && { backgroundColor: colors.fill, transform: [{ scale: motion.pressScale }] },
                ]}
                onPress={btn.onPress}
                accessibilityRole="button"
                accessibilityLabel={btn.text}
              >
                <Text
                  style={[
                    styles.buttonText,
                    {
                      fontSize: scale(typography.body),
                      color: colorFor(btn.style),
                      fontWeight: btn.style === 'cancel' ? '600' : '700',
                    },
                  ]}
                >
                  {btn.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  )
}
