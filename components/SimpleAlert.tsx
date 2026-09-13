import { Modal, View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions } from 'react-native'
import { useMemo } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography, spacing, borderRadius, motion } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { useLargeText } from '../utils/LargeTextContext'

interface SimpleAlertProps {
  visible: boolean
  title: string
  message?: string
  onDismiss: () => void
  actionLabel?: string
}

export default function SimpleAlert({ visible, title, message, onDismiss, actionLabel = 'OK' }: SimpleAlertProps) {
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
    button: {
      minHeight: 52,
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
    buttonText: {
      color: colors.primary,
      fontWeight: '700',
      textAlign: 'center',
      width: '100%',
    },
  }), [colors, cardWidth, height, insets.bottom, insets.top])

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.copy}>
            <Text style={[styles.title, { fontSize: scale(20) }]}>{title}</Text>
            {message ? (
              <ScrollView style={{ maxHeight: messageMax }} bounces={false} showsVerticalScrollIndicator={false}>
                <Text style={[styles.message, { fontSize: scale(typography.body), lineHeight: Math.round(scale(typography.body) * 1.4) }]}>
                  {message}
                </Text>
              </ScrollView>
            ) : null}
          </View>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && { backgroundColor: colors.fill, transform: [{ scale: motion.pressScale }] }]}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={[styles.buttonText, { fontSize: scale(typography.body) }]}>{actionLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}
