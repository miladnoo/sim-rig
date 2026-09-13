import { useMemo } from 'react'
import { ScrollView, Text, StyleSheet, Platform } from 'react-native'
import { typography, spacing } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { useLargeText } from '../utils/LargeTextContext'

export default function PrivacyScreen() {
  const { colors } = useTheme()
  const { scale } = useLargeText()
  const styles = useMemo(() => StyleSheet.create({
    content: { padding: spacing.md, paddingBottom: 48 },
    h: { fontWeight: '700', color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
    p: { color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.sm },
  }), [colors])

  return (
    <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Text style={[styles.h, { fontSize: scale(typography.title), marginTop: 0 }]}>Privacy Policy</Text>
      <Text style={[styles.p, { fontSize: scale(typography.bodySmall) }]}>Last updated: September 7, 2026</Text>
      <Text style={[styles.p, { fontSize: scale(typography.body) }]}>
        Classic Garage is a local maintenance log. Car and service records live in a database on your device. The app works without an account.
      </Text>
      <Text style={[styles.h, { fontSize: scale(typography.body) }]}>What stays on your phone</Text>
      <Text style={[styles.p, { fontSize: scale(typography.body) }]}>
        Year, make, model, VIN, mileage, service notes, costs, part numbers, and photos you attach. We do not sell this data.
      </Text>
      <Text style={[styles.h, { fontSize: scale(typography.body) }]}>Optional cloud backup</Text>
      <Text style={[styles.p, { fontSize: scale(typography.body) }]}>
        If you sign in with Premium, copies of car and service text can go to Firebase (Google). Photos stay on this phone until cloud photo storage is available. You can delete the account in Settings. Garage data on the device is not wiped when you delete the account.
      </Text>
      <Text style={[styles.h, { fontSize: scale(typography.body) }]}>Purchases</Text>
      <Text style={[styles.p, { fontSize: scale(typography.body) }]}>
        Lifetime unlock goes through {Platform.OS === 'android' ? 'Google Play' : 'Apple'} via RevenueCat. They process payment. We receive whether the unlock is active.
      </Text>
      <Text style={[styles.h, { fontSize: scale(typography.body) }]}>VIN decode</Text>
      <Text style={[styles.p, { fontSize: scale(typography.body) }]}>
        If you type a VIN, it is sent to the U.S. NHTSA vPIC API to fill year, make, and model.
      </Text>
      <Text style={[styles.h, { fontSize: scale(typography.body) }]}>Contact</Text>
      <Text style={[styles.p, { fontSize: scale(typography.body) }]}>
        quizdue.dev@gmail.com
      </Text>
    </ScrollView>
  )
}
