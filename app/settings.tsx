import { useState, useMemo, Children, type ReactNode } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import Constants from 'expo-constants'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography, spacing, borderRadius } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { useLargeText } from '../utils/LargeTextContext'
import { usePremium } from '../utils/PremiumContext'
import { useAuth } from '../utils/AuthContext'
import { useOnboarding } from '../utils/OnboardingContext'
import * as Sharing from 'expo-sharing'
import { createBackup, restoreFromBackup } from '../utils/backup'
import { fullSync } from '../utils/sync'
import { insertCar, getAllCars, deleteCar, getCarCount } from '../db/cars'
import { insertService } from '../db/services'
import ConfirmModal from '../components/ConfirmModal'
import SimpleAlert from '../components/SimpleAlert'
import PickerModal from '../components/PickerModal'
import AppIcon from '../components/AppIcon'
import PremiumBanner from '../components/PremiumBanner'

// Demo photos match the names — the same '67 fastback and C3 Stingray shots as the
// onboarding example (bundled copies in assets/images/, source URLs below).
// Wrong-generation cars in the demo garage would be spotted instantly.
const SAMPLE_CARS = [
  { year: '1967', make: 'Ford', model: 'Mustang GT', engine: '289 V8', mileage: '89420', photoUri: 'https://images.unsplash.com/photo-1698326686561-c310d27fec76?w=800&q=80' },
  { year: '1971', make: 'Chevrolet', model: 'Corvette Stingray', engine: '350 V8', mileage: '62300', photoUri: 'https://images.unsplash.com/photo-1779173775412-854ca22294cf?w=800&q=80' },
]

const SAMPLE_SERVICES: Record<number, { date: string; mileage: string; description: string; cost: string; part_number: string; receipt_photo_uri?: string }[]> = {
  0: [
    { date: '2026-05-12', mileage: '89200', description: 'Oil change — Mobil 1 5W-30', cost: '49.99', part_number: 'FL-1A / Motorcraft' },
    { date: '2026-04-03', mileage: '88750', description: 'Front brake pads replaced', cost: '320.00', part_number: 'PBR/Akebono' },
    { date: '2026-02-18', mileage: '88000', description: 'Distributor cap and rotor replaced', cost: '42.50', part_number: 'NAPA Echlin' },
    { date: '2025-12-10', mileage: '87100', description: 'New tires — BFGoodrich Radial T/A', cost: '680.00', part_number: 'P235/60R15' },
  ],
  1: [
    { date: '2026-05-01', mileage: '61800', description: 'Oil change — Valvoline VR1 10W-40', cost: '55.00', part_number: 'Wix 51060' },
    { date: '2026-03-15', mileage: '61400', description: 'Thermostat replaced (180°F)', cost: '28.00', part_number: 'Stant 45359' },
    { date: '2026-01-20', mileage: '61000', description: 'New Optima RedTop battery', cost: '159.00', part_number: 'Optima 75/25' },
  ],
}

export default function SettingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, preference, setPreference } = useTheme()
  const { scale } = useLargeText()
  const { isPremium, entitled, previewUnpaid, plan, restore, presentCustomerCenter, setPreviewUnpaid } = usePremium()
  const { user, signOut, deleteAccount } = useAuth()
  const { replay } = useOnboarding()
  const [syncing, setSyncing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)
  const [simpleAlert, setSimpleAlert] = useState<{ visible: boolean; title: string; message?: string }>({ visible: false, title: '' })
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; title: string; message: string; buttons: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress: () => void }[] }>({ visible: false, title: '', message: '', buttons: [] })
  const [pickerModal, setPickerModal] = useState<{ visible: boolean; title: string; items: { label: string; onPress: () => void }[] }>({ visible: false, title: '', items: [] })

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 48 + insets.bottom },
    sectionLabel: {
      fontSize: scale(13), fontWeight: '600', color: colors.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 16,
    },
    group: {
      backgroundColor: colors.surface, borderRadius: borderRadius.md, overflow: 'hidden',
      marginBottom: spacing.lg, borderCurve: 'continuous',
    },
    hairline: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, minHeight: 52 },
    rowTitle: { fontSize: scale(typography.body), fontWeight: '500', color: colors.textPrimary },
    rowDesc: { fontSize: scale(typography.bodySmall), color: colors.textSecondary, marginTop: 2, flexShrink: 1, paddingRight: spacing.sm },
    premiumBanner: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.lg, borderCurve: 'continuous' },
    premiumTitle: { fontSize: scale(typography.body), fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.2 },
    premiumDesc: { fontSize: scale(typography.bodySmall), color: colors.textSecondary, marginTop: 4 },
    themeRow: { flexDirection: 'row', backgroundColor: colors.fill, margin: spacing.sm, borderRadius: borderRadius.sm, borderCurve: 'continuous' },
    themeOption: { flex: 1, paddingVertical: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.sm },
    themeLabel: { fontSize: scale(typography.bodySmall), fontWeight: '600' },
    footer: { alignItems: 'center', marginTop: spacing.sm, gap: 4 },
    version: { fontSize: typography.caption, color: colors.textMuted },
  }), [colors, scale, insets.bottom])

  const Group = ({ title, children }: { title: string; children: ReactNode }) => {
    const items = Children.toArray(children)
    return (
      <View>
        <Text style={styles.sectionLabel}>{title}</Text>
        <View style={styles.group}>
          {items.map((child, i) => (
            <View key={i} style={i < items.length - 1 ? styles.hairline : undefined}>{child}</View>
          ))}
        </View>
      </View>
    )
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await fullSync()
      let photosNote = ''
      if (result.photosSkipped > 0) {
        const codes = result.photoErrorCodes || []
        let reason = ''
        if (codes.some((c) => c.startsWith('storage/unauthorized') || c.startsWith('storage/canceled'))) {
          reason = ' Sign in again, then retry.'
        } else if (codes.some((c) => c === 'storage/retry-limit-exceeded' || c === 'storage/unavailable')) {
          reason = ' Network error — try again when connected.'
        } else if (codes.some((c) => c === 'storage/unauthenticated')) {
          reason = ' Sign in, then retry.'
        } else if (
          codes.some((c) => c.startsWith('storage/quota') || c === 'storage/unknown' || c === 'unknown')
        ) {
          reason = ' Cloud storage is not set up for this project yet — the photos stay safe on this phone and will upload later.'
        }
        photosNote = ` ${result.photosSkipped} photo${result.photosSkipped === 1 ? '' : 's'} stayed on this phone.${reason}`
      }
      setSimpleAlert({
        visible: true,
        title: 'Sync complete',
        message: `${result.cars} cars and ${result.services} services synced.${photosNote}`,
      })
    } catch (err: any) {
      const code = String(err?.code || '')
      const raw = typeof err?.message === 'string' ? err.message : ''
      let message = 'Could not complete sync.'
      if (code === 'permission-denied' || code === 'storage/unauthorized') {
        message = 'Cloud backup could not write. Sign in again, then retry.'
      } else if (code === 'unavailable' || code === 'auth/network-request-failed') {
        message = 'Network error. Check your connection.'
      } else if (raw === 'Not authenticated') {
        message = 'Sign in, then sync.'
      } else if (raw && !raw.startsWith('Firebase:') && !raw.startsWith('[')) {
        message = raw
      }
      setSimpleAlert({ visible: true, title: 'Sync failed', message })
    } finally {
      setSyncing(false)
    }
  }

  const handleBackup = async () => {
    if (!isPremium) {
      router.push('/premium')
      return
    }
    setExporting(true)
    try {
      const zipPath = await createBackup()
      await Sharing.shareAsync(zipPath, { mimeType: 'application/zip', dialogTitle: 'Classic Garage backup' })
    } catch (err: any) {
      setSimpleAlert({ visible: true, title: 'Backup failed', message: err?.message || 'Could not create backup.' })
    } finally {
      setExporting(false)
    }
  }

  const handleRestore = async () => {
    setConfirmModal({
      visible: true,
      title: 'Restore backup?',
      message: 'This replaces everything on this device. A safety copy of the current garage is made first.',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => setConfirmModal((prev) => ({ ...prev, visible: false })) },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setConfirmModal((prev) => ({ ...prev, visible: false }))
            try {
              setExporting(true)
              const restored = await restoreFromBackup()
              if (restored) {
                setSimpleAlert({ visible: true, title: 'Restore complete', message: 'Your garage was restored from the backup.' })
              }
            } catch (err: any) {
              if (err?.message === 'Restore cancelled') return
              setSimpleAlert({ visible: true, title: 'Restore failed', message: err?.message || 'Could not restore backup.' })
            } finally {
              setExporting(false)
            }
          },
        },
      ],
    })
  }

  const handleDeleteCar = async () => {
    const allCars = await getAllCars()
    if (allCars.length === 0) {
      setSimpleAlert({ visible: true, title: 'No cars', message: 'There is nothing in the garage to delete.' })
      return
    }
    setPickerModal({
      visible: true,
      title: 'Select a car',
      items: allCars.map((c) => ({
        label: `${c.year} ${c.make} ${c.model}`.trim(),
        onPress: () => {
          setPickerModal((prev) => ({ ...prev, visible: false }))
          const name = `${c.year} ${c.make} ${c.model}`.trim()
          setConfirmModal({
            visible: true,
            title: `Delete ${name}?`,
            message: 'This also removes its service records.',
            buttons: [
              { text: 'Cancel', style: 'cancel', onPress: () => setConfirmModal((prev) => ({ ...prev, visible: false })) },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  setConfirmModal((prev) => ({ ...prev, visible: false }))
                  await deleteCar(c.id)
                  setSimpleAlert({ visible: true, title: 'Car deleted', message: `${name} was removed.` })
                },
              },
            ],
          })
        },
      })),
    })
  }

  const doLoadSampleData = async () => {
    setLoadingSample(true)
    try {
      for (let i = 0; i < SAMPLE_CARS.length; i++) {
        const car = SAMPLE_CARS[i]
        const carId = await insertCar({
          year: car.year, make: car.make, model: car.model, engine: car.engine,
          mileage: car.mileage, photo_uri: car.photoUri,
        })
        for (const svc of SAMPLE_SERVICES[i] ?? []) {
          await insertService({
            car_id: carId, date: svc.date, mileage: svc.mileage, description: svc.description,
            cost: svc.cost, part_number: svc.part_number, receipt_photo_uri: svc.receipt_photo_uri,
          })
        }
      }
      setSimpleAlert({ visible: true, title: 'Sample data loaded', message: 'Two cars with service history were added.' })
    } catch {
      setSimpleAlert({ visible: true, title: 'Error', message: 'Could not load sample data.' })
    } finally {
      setLoadingSample(false)
    }
  }

  const loadSampleData = async () => {
    const existingCount = await getCarCount()
    if (existingCount > 0) {
      setConfirmModal({
        visible: true,
        title: 'Garage is not empty',
        message: 'Sample cars will be added alongside what you already have.',
        buttons: [
          { text: 'Cancel', style: 'cancel', onPress: () => setConfirmModal((prev) => ({ ...prev, visible: false })) },
          { text: 'Add them', onPress: () => { setConfirmModal((prev) => ({ ...prev, visible: false })); doLoadSampleData() } },
        ],
      })
      return
    }
    doLoadSampleData()
  }

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <PremiumBanner
          entitled={entitled}
          previewUnpaid={previewUnpaid}
          plan={plan}
          onPress={() => router.push(entitled && !previewUnpaid ? '/premium' : '/premium?preview=1')}
          onPreviewUnpaid={() => {
            if (previewUnpaid) {
              setPreviewUnpaid(false)
              return
            }
            setPreviewUnpaid(true)
            router.replace('/premium?preview=1')
          }}
        />

        <Group title="Account">
          {!user ? (
            <Pressable style={styles.row} onPress={() => router.push('/auth')}>
              <View>
                <Text style={styles.rowTitle}>Sign in</Text>
                <Text style={styles.rowDesc}>Google, Apple, or email — for optional cloud backup</Text>
              </View>
              <AppIcon name="chevron" color={colors.textMuted} size={16} decorative />
            </Pressable>
          ) : (
            <View style={styles.row}>
              <View>
                <Text style={styles.rowTitle}>Signed in</Text>
                <Text style={styles.rowDesc}>{user.email || user.displayName || 'Apple or Google account'}</Text>
              </View>
              <Pressable
                onPress={async () => { await signOut(); setSimpleAlert({ visible: true, title: 'Signed out' }) }}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                style={({ pressed }) => [{
                  minHeight: 48,
                  justifyContent: 'center',
                  paddingHorizontal: 8,
                  borderRadius: 24,
                }, pressed && { opacity: 0.6 }]}
              >
                <Text style={{ color: colors.error, fontWeight: '700' }}>Sign out</Text>
              </Pressable>
            </View>
          )}
          {user && isPremium ? (
            <Pressable style={styles.row} onPress={handleSync} disabled={syncing}>
              <View>
                <Text style={styles.rowTitle}>{syncing ? 'Syncing…' : 'Sync garage'}</Text>
                <Text style={styles.rowDesc}>Text records go to your account. Photos stay on this phone if cloud photos cannot upload.</Text>
              </View>
              {syncing ? <ActivityIndicator size="small" color={colors.primary} /> : <AppIcon name="chevron" color={colors.textMuted} size={16} decorative />}
            </Pressable>
          ) : user ? (
            <Pressable style={styles.row} onPress={() => router.push('/premium')}>
              <View>
                <Text style={styles.rowTitle}>Cloud backup</Text>
                <Text style={styles.rowDesc}>Premium unlocks optional backup</Text>
              </View>
              <AppIcon name="chevron" color={colors.textMuted} size={16} decorative />
            </Pressable>
          ) : null}
        </Group>

        <Group title="Data">
          <Pressable style={styles.row} onPress={handleBackup} disabled={exporting}>
            <View>
              <Text style={styles.rowTitle}>Backup to file</Text>
              <Text style={styles.rowDesc}>Share a zip you can restore later</Text>
            </View>
            {exporting ? <ActivityIndicator size="small" color={colors.primary} /> : <AppIcon name="chevron" color={colors.textMuted} size={16} decorative />}
          </Pressable>
          <Pressable style={styles.row} onPress={handleRestore}>
            <View>
              <Text style={styles.rowTitle}>Restore from backup</Text>
              <Text style={styles.rowDesc}>Replace this garage with a backup file</Text>
            </View>
            <AppIcon name="chevron" color={colors.textMuted} size={16} decorative />
          </Pressable>
        </Group>

        <Group title="Look">
          <View style={styles.themeRow}>
            {(['system', 'light', 'dark'] as const).map((mode) => (
              <Pressable
                key={mode}
                style={[styles.themeOption, preference === mode && { backgroundColor: colors.surface }]}
                onPress={() => setPreference(mode)}
              >
                <Text style={[styles.themeLabel, { color: preference === mode ? colors.primary : colors.textPrimary }]}>
                  {mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Group>

        <Group title="Support">
          <Pressable
            style={styles.row}
            onPress={async () => {
              try {
                const ok = await restore()
                setSimpleAlert({
                  visible: true,
                  title: ok ? 'Premium restored' : 'Nothing to restore',
                  message: ok
                    ? 'Your purchase is back on this device.'
                    : 'No purchase was found for this store account.',
                })
              } catch (err: any) {
                setSimpleAlert({
                  visible: true,
                  title: 'Restore failed',
                  message: err?.message || 'Try again later.',
                })
              }
            }}
          >
            <View>
              <Text style={styles.rowTitle}>Restore purchases</Text>
              <Text style={styles.rowDesc}>Recover Premium on a new device</Text>
            </View>
            <AppIcon name="chevron" color={colors.textMuted} size={16} decorative />
          </Pressable>
          {isPremium ? (
            <Pressable style={styles.row} onPress={presentCustomerCenter}>
              <View>
                <Text style={styles.rowTitle}>Manage purchase</Text>
              <Text style={styles.rowDesc}>{Platform.OS === 'android' ? 'View or change your Google Play purchase' : 'View or change your App Store purchase'}</Text>
              </View>
              <AppIcon name="chevron" color={colors.textMuted} size={16} decorative />
            </Pressable>
          ) : null}
          <Pressable
            style={styles.row}
            onPress={async () => {
              await replay()
              router.push('/onboarding')
            }}
          >
            <View>
              <Text style={styles.rowTitle}>Show intro again</Text>
              <Text style={styles.rowDesc}>How to add cars and keep a log</Text>
            </View>
            <AppIcon name="chevron" color={colors.textMuted} size={16} decorative />
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push('/privacy')}>
            <View>
              <Text style={styles.rowTitle}>Privacy</Text>
              <Text style={styles.rowDesc}>How records are stored</Text>
            </View>
            <AppIcon name="chevron" color={colors.textMuted} size={16} decorative />
          </Pressable>
          <Pressable style={styles.row} onPress={() => Linking.openURL('mailto:quizdue.dev@gmail.com?subject=Classic Garage Feedback')}>
            <View>
              <Text style={styles.rowTitle}>Send feedback</Text>
              <Text style={styles.rowDesc}>quizdue.dev@gmail.com</Text>
            </View>
            <AppIcon name="chevron" color={colors.textMuted} size={16} decorative />
          </Pressable>
        </Group>

        <Group title="Danger zone">
          <Pressable style={styles.row} onPress={handleDeleteCar}>
            <View>
              <Text style={[styles.rowTitle, { color: colors.error }]}>Delete a car</Text>
              <Text style={styles.rowDesc}>Also deletes that car’s service log</Text>
            </View>
          </Pressable>
          {user ? (
            <Pressable
              style={styles.row}
              onPress={() => {
                setConfirmModal({
                  visible: true,
                  title: 'Delete account?',
                  message: 'Removes your login and everything stored in your cloud backup (cars, services, photos). Records on this device stay.',
                  buttons: [
                    { text: 'Cancel', style: 'cancel', onPress: () => setConfirmModal((prev) => ({ ...prev, visible: false })) },
                    {
                      text: 'Delete account',
                      style: 'destructive',
                      onPress: async () => {
                        setConfirmModal((prev) => ({ ...prev, visible: false }))
                        try {
                          await deleteAccount()
                          setSimpleAlert({ visible: true, title: 'Account deleted', message: 'Your login and cloud backup were removed. Local records were not.' })
                        } catch (err: any) {
                          setSimpleAlert({ visible: true, title: 'Could not delete', message: err?.message || 'Sign in again, then retry.' })
                        }
                      },
                    },
                  ],
                })
              }}
            >
              <View>
                <Text style={[styles.rowTitle, { color: colors.error }]}>Delete account</Text>
                <Text style={styles.rowDesc}>Removes login and cloud backup. The garage stays on this phone.</Text>
              </View>
            </Pressable>
          ) : null}
        </Group>

        {__DEV__ ? (
          <Group title="Developer">
            <Pressable style={styles.row} onPress={loadSampleData} disabled={loadingSample}>
              <View>
                <Text style={styles.rowTitle}>{loadingSample ? 'Loading…' : 'Load sample data'}</Text>
                <Text style={styles.rowDesc}>Two demo cars with service history</Text>
              </View>
            </Pressable>
          </Group>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.version}>Classic Garage {Constants.expoConfig?.version ?? '1.0.0'}</Text>
          <Text style={styles.version}>
            {previewUnpaid ? 'Previewing unpaid' : entitled ? (plan === 'monthly' ? 'Monthly' : plan === 'lifetime' ? 'Lifetime' : 'Unlocked') : 'Not unlocked'}
          </Text>
        </View>
      </ScrollView>

      <SimpleAlert visible={simpleAlert.visible} title={simpleAlert.title} message={simpleAlert.message} onDismiss={() => setSimpleAlert((prev) => ({ ...prev, visible: false }))} />
      <ConfirmModal visible={confirmModal.visible} title={confirmModal.title} message={confirmModal.message} buttons={confirmModal.buttons} />
      <PickerModal visible={pickerModal.visible} title={pickerModal.title} items={pickerModal.items} onCancel={() => setPickerModal((prev) => ({ ...prev, visible: false }))} />
    </View>
  )
}
