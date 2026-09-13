import { useMemo } from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { typography, spacing, borderRadius, elevation } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { useLargeText } from '../utils/LargeTextContext'
import { pressTick } from '../utils/haptics'
import { formatMileage } from '../utils/dates'
import AppIcon from './AppIcon'

interface CarCardProps {
  year: string
  make: string
  model: string
  mileage: string | null
  lastService?: string | null
  photoUri: string | null
  onPress: () => void
  onRemove?: () => void
}

export default function CarCard({ year, make, model, mileage, lastService, photoUri, onPress, onRemove }: CarCardProps) {
  const { colors } = useTheme()
  const { scale } = useLargeText()
  const name = [year, make, model].filter(Boolean).join(' ')
  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.md,
      overflow: 'hidden',
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.cardBorder,
      ...elevation.card,
    },
    photo: {
      width: '100%',
      height: 156,
      backgroundColor: colors.fill,
    },
    placeholder: {
      height: 156,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.fill,
    },
    body: {
      padding: spacing.md,
      paddingBottom: 12,
    },
    name: {
      fontWeight: '700',
      color: colors.textPrimary,
      fontSize: scale(typography.title),
      letterSpacing: -0.4,
      marginBottom: 10,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 5,
    },
    label: {
      color: colors.textSecondary,
      fontSize: scale(typography.bodySmall),
      flex: 1,
    },
    value: {
      color: colors.textPrimary,
      fontSize: scale(typography.bodySmall),
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
      textAlign: 'right',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: spacing.md,
      paddingRight: 6,
      paddingBottom: 6,
      minHeight: 48,
    },
    openWrap: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 8,
      marginLeft: -8,
    },
    open: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: scale(typography.bodySmall),
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    removeBtn: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 24,
    },
  }), [colors, scale])

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}. Open service log`}
        accessibilityHint="Shows the service history and car details"
        style={({ pressed }) => pressed && { opacity: 0.94 }}
        onPressIn={pressTick}
        onPress={onPress}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : (
          <View style={styles.placeholder}>
            <AppIcon name="car" color={colors.textMuted} size={40} decorative />
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Miles</Text>
            <Text style={styles.value}>{mileage ? formatMileage(mileage) : '—'}</Text>
          </View>
          <View style={[styles.row, { paddingBottom: 0 }]}>
            <Text style={styles.label}>Last service</Text>
            <Text style={styles.value}>{lastService || 'None yet'}</Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.footer}>
        <Pressable
          onPress={onPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Open ${name}`}
          style={({ pressed }) => [styles.openWrap, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.open}>Open</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <AppIcon name="chevron" color={colors.textMuted} size={16} decorative />
          {onRemove ? (
            <Pressable
              onPress={onRemove}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${name}`}
              accessibilityHint="Removes this car and its service records"
              style={({ pressed }) => [styles.removeBtn, pressed && { backgroundColor: colors.fill, opacity: 0.7 }]}
            >
              <AppIcon name="trash" color={colors.textMuted} size={20} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  )
}
