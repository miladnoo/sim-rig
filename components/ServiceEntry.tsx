import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { useMemo } from 'react'
import { typography, spacing, borderRadius } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { useLargeText } from '../utils/LargeTextContext'
import { ServiceEntry as ServiceEntryType } from '../db/services'
import { formatServiceDate, formatMileage } from '../utils/dates'

interface ServiceEntryProps {
  entry: ServiceEntryType
  isLast?: boolean
  onPress?: () => void
  onLongPress?: () => void
}

export default function ServiceEntry({ entry, isLast, onPress, onLongPress }: ServiceEntryProps) {
  const { colors } = useTheme()
  const { scale } = useLargeText()
  const cost = entry.cost ? parseFloat((entry.cost || '').replace(/[^0-9.]/g, '')) : NaN
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    rail: {
      width: 10,
      marginRight: spacing.md,
      alignItems: 'center',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginTop: 8,
    },
    line: {
      width: 2,
      flex: 1,
      backgroundColor: colors.separator,
      marginTop: 4,
      minHeight: 12,
    },
    content: {
      flex: 1,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    date: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    mileage: {
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    description: {
      color: colors.textPrimary,
      fontWeight: '600',
      marginBottom: 4,
    },
    details: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    cost: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    part: {
      color: colors.textMuted,
    },
    receiptThumb: {
      width: 80,
      height: 60,
      borderRadius: borderRadius.sm,
      marginTop: spacing.sm,
      backgroundColor: colors.fill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.cardBorder,
      borderCurve: 'continuous',
    },
    notes: {
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
  }), [colors])

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${formatServiceDate(entry.date)}${entry.mileage ? `, ${formatMileage(entry.mileage)} miles` : ''}, ${entry.description}`}
      style={({ pressed }) => [styles.container, pressed && { backgroundColor: colors.fill }]}
    >
      <View style={styles.rail}>
        <View style={styles.dot} />
        {isLast ? null : <View style={styles.line} />}
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.date, { fontSize: scale(typography.bodySmall) }]}>
            {formatServiceDate(entry.date)}
          </Text>
          {entry.mileage ? (
            <Text style={[styles.mileage, { fontSize: scale(typography.bodySmall) }]}>
              {formatMileage(entry.mileage)} mi
            </Text>
          ) : null}
        </View>
        <Text style={[styles.description, { fontSize: scale(typography.body) }]} selectable>
          {entry.description}
        </Text>
        <View style={styles.details}>
          {Number.isFinite(cost) ? (
            <Text style={[styles.cost, { fontSize: scale(typography.body) }]}>
              ${cost.toFixed(2)}
            </Text>
          ) : null}
          {entry.part_number ? (
            <Text style={[styles.part, { fontSize: scale(typography.bodySmall) }]} selectable>
              {entry.part_number}
            </Text>
          ) : null}
        </View>
        {entry.receipt_photo_uri ? (
          <Image source={{ uri: entry.receipt_photo_uri }} style={styles.receiptThumb} accessibilityIgnoresInvertColors />
        ) : null}
        {entry.notes ? (
          <Text style={[styles.notes, { fontSize: scale(typography.bodySmall) }]} numberOfLines={2}>
            {entry.notes}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}
