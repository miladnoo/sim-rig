import { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography, spacing, borderRadius } from '../../theme'
import { useTheme } from '../../utils/ThemeContext'
import { useLargeText } from '../../utils/LargeTextContext'
import { usePremium } from '../../utils/PremiumContext'
import { getCar, updateCar, Car } from '../../db/cars'
import { getServicesForCar, ServiceEntry } from '../../db/services'
import { createCarPdf, type PreparedPdf } from '../../utils/exportManager'
import PdfReadyModal from '../../components/PdfReadyModal'
import { formatMonthYear, formatServiceDate, formatMileage } from '../../utils/dates'
import ServiceEntryComponent from '../../components/ServiceEntry'
import BottomActionBar from '../../components/BottomActionBar'
import EmptyState from '../../components/EmptyState'
import SimpleAlert from '../../components/SimpleAlert'
import ConfirmModal from '../../components/ConfirmModal'
import SearchField from '../../components/SearchField'
import AppIcon from '../../components/AppIcon'
import HeaderIconButton from '../../components/HeaderIconButton'
import { pickPhoto, replaceLocalPhoto } from '../../utils/photos'

export default function CarTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { scale } = useLargeText()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { isPremium } = usePremium()
  const [car, setCar] = useState<Car | null>(null)
  const [services, setServices] = useState<ServiceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pdfReady, setPdfReady] = useState<PreparedPdf | null>(null)
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null)
  const [query, setQuery] = useState('')
  const [photoAsk, setPhotoAsk] = useState<'ask' | 'wait' | null>(null)

  const styles = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center' },
    banner: { height: 240, backgroundColor: colors.fill },
    bannerImage: { width: '100%', height: '100%' },
    bannerPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    bannerHint: { marginTop: spacing.sm, color: colors.textSecondary, fontWeight: '600' },
    bannerScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 80,
      backgroundColor: 'rgba(15, 23, 42, 0.35)',
    },
    stats: {
      flexDirection: 'row',
      gap: spacing.md,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.cardBorder,
      borderCurve: 'continuous',
    },
    stat: { flex: 1 },
    statLabel: { color: colors.textSecondary, marginBottom: 2, fontSize: typography.caption, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '600' },
    statValue: { color: colors.textPrimary, fontWeight: '700', fontVariant: ['tabular-nums'] },
    vin: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
    // 180 > the floating pill's worst case (insets + padding + 56pt button),
    // so the last service row can never end up dead under it.
    list: { paddingBottom: 180 + insets.bottom },
    groupTitle: {
      fontWeight: '700',
      color: colors.textPrimary,
      paddingVertical: spacing.sm,
      flex: 1,
    },
    groupHead: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
    },
    groupRail: {
      width: 10,
      marginRight: spacing.md,
      alignItems: 'center',
    },
    groupRailLine: {
      width: 2,
      flex: 1,
      backgroundColor: colors.separator,
      minHeight: 20,
    },
  }), [colors, scale, insets.bottom])

  const carId = parseInt(id!, 10)

  const loadData = useCallback(async () => {
    try {
      const [carData, servicesData] = await Promise.all([
        getCar(carId),
        getServicesForCar(carId),
      ])
      setCar(carData)
      setServices(servicesData)
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [carId])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData])
  )

  const handleExportPdf = async () => {
    if (!isPremium) {
      router.push('/premium')
      return
    }
    if (!car || services.length === 0) {
      setAlert({ title: 'No records', message: 'Add a service record before exporting.' })
      return
    }
    setExporting(true)
    try {
      setPdfReady(await createCarPdf(carId))
    } catch (err: any) {
      setAlert({
        title: 'Could not make PDF',
        message: typeof err?.message === 'string' ? err.message : 'The file could not be created. Try again.',
      })
    } finally {
      setExporting(false)
    }
  }

  const carName = car ? `${car.year || ''} ${car.make} ${car.model}`.trim() : ''
  const totalSpent = services.reduce((sum, s) => sum + (parseFloat((s.cost || '').replace(/[^0-9.]/g, '')) || 0), 0)
  const lastService = services[0]

  const groupedServices = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? services.filter((s) =>
          `${s.description} ${s.part_number || ''} ${s.notes || ''} ${s.mileage || ''}`.toLowerCase().includes(q)
        )
      : services
    const groups: Record<string, ServiceEntry[]> = {}
    for (const s of list) {
      const key = s.date.substring(0, 7)
      ;(groups[key] ||= []).push(s)
    }
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, data]) => ({ title: formatMonthYear(month), data }))
  }, [services, query])

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (loadError) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ title: 'Car' }} />
        <EmptyState
          title="Could not load this car"
          subtitle="The service log could not be read. Try again."
          actionLabel="Try again"
          onAction={() => { setLoading(true); loadData() }}
        />
      </View>
    )
  }

  if (!car) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ title: 'Car' }} />
        <EmptyState title="Car not found" />
      </View>
    )
  }

  const header = (
    <View>
      <View style={styles.banner}>
        {car.photo_uri ? (
          <Image source={{ uri: car.photo_uri }} style={styles.bannerImage} resizeMode="cover" />
        ) : (
          <Pressable
            style={styles.bannerPlaceholder}
            onPress={() => setPhotoAsk('ask')}
            accessibilityRole="button"
            accessibilityLabel="Add a photo of this car"
          >
            <AppIcon name="car" color={colors.textMuted} size={40} decorative />
            <Text style={[styles.bannerHint, { fontSize: scale(typography.bodySmall) }]}>Tap to add a photo</Text>
          </Pressable>
        )}
        {car.photo_uri ? <View style={styles.bannerScrim} pointerEvents="none" /> : null}
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { fontSize: scale(typography.caption) }]}>Mileage</Text>
          <Text style={[styles.statValue, { fontSize: scale(typography.body) }]}>
            {car.mileage ? `${formatMileage(car.mileage)} mi` : '—'}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { fontSize: scale(typography.caption) }]}>Logged</Text>
          <Text style={[styles.statValue, { fontSize: scale(typography.body) }]}>
            {totalSpent > 0 ? `$${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { fontSize: scale(typography.caption) }]}>Last service</Text>
          <Text style={[styles.statValue, { fontSize: scale(typography.body) }]}>
            {lastService ? formatServiceDate(lastService.date) : '—'}
          </Text>
        </View>
      </View>
      {car.vin ? (
        <Text style={[styles.vin, { fontSize: scale(typography.bodySmall) }]} selectable>
          VIN {car.vin}
        </Text>
      ) : null}
      <SearchField placeholder="Work, part, notes" value={query} onChangeText={setQuery} />
    </View>
  )

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: carName,
          headerBackTitle: 'Garage',
          ...(Platform.OS === 'ios'
            ? {
                headerSearchBarOptions: {
                  placeholder: 'Work, part, notes',
                  hideWhenScrolling: true,
                  onChangeText: (e: { nativeEvent: { text: string } }) => setQuery(e.nativeEvent.text),
                  onCancelButtonPress: () => setQuery(''),
                },
              }
            : {}),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <HeaderIconButton
                name="pencil"
                color={colors.textPrimary}
                onPress={() => router.push(`/car/${carId}/edit`)}
                accessibilityLabel="Edit car"
              />
              <Pressable
                onPress={handleExportPdf}
                hitSlop={8}
                disabled={exporting}
                accessibilityRole="button"
                accessibilityLabel={exporting ? 'Making PDF' : 'Make PDF'}
                style={({ pressed }) => [
                  { minHeight: 48, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 24 },
                  pressed && { opacity: 0.6 },
                  exporting && { opacity: 0.4 },
                ]}
              >
                <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '700' }}>{exporting ? 'Wait…' : 'PDF'}</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <FlatList
        data={groupedServices}
        keyExtractor={(item) => item.title}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            title={query.trim() ? 'No matches' : 'No service records yet'}
            subtitle={query.trim() ? 'Try a different word, part number, or mileage.' : 'Log oil, brakes, parts, and receipts here.'}
            icon={query.trim() ? 'search' : 'wrench'}
            actionLabel={query.trim() ? undefined : 'Add a record'}
            onAction={query.trim() ? undefined : () => router.push(`/car/${carId}/add`)}
          />
        }
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); loadData() }}
        contentInsetAdjustmentBehavior="automatic"
        renderItem={({ item: group, index: groupIndex }) => (
          <View>
            <View style={styles.groupHead}>
              <View style={styles.groupRail}>
                <View style={styles.groupRailLine} />
              </View>
              <Text style={[styles.groupTitle, { fontSize: scale(typography.body) }]}>
                {group.title}
              </Text>
            </View>
            {group.data.map((entry, index) => (
              <ServiceEntryComponent
                key={entry.id}
                entry={entry}
                isLast={groupIndex === groupedServices.length - 1 && index === group.data.length - 1}
                onPress={() => router.push(`/car/${carId}/service/${entry.id}`)}
              />
            ))}
          </View>
        )}
        contentContainerStyle={styles.list}
      />

      {(services.length > 0 || query.trim()) ? (
        <BottomActionBar label="Add a service" onPress={() => router.push(`/car/${carId}/add`)} />
      ) : null}

      <SimpleAlert
        visible={alert !== null}
        title={alert?.title ?? ''}
        message={alert?.message ?? ''}
        onDismiss={() => setAlert(null)}
      />
      <ConfirmModal
        visible={photoAsk === 'ask'}
        title="Have a good picture now?"
        message="If you have a shot you like, we can put it here. Parked, in good light, is plenty."
        buttons={[
          {
            text: 'Choose a photo',
            onPress: () => {
              setPhotoAsk(null)
              pickPhoto('car')
                .then(async (uri) => {
                  if (!uri || !car) return
                  await replaceLocalPhoto(car.photo_uri, uri)
                  await updateCar(carId, { photo_uri: uri })
                  await loadData()
                })
                .catch((e) => setAlert({ title: 'Photos', message: e?.message || 'Could not choose a photo.' }))
            },
          },
          {
            text: 'Not yet',
            style: 'cancel',
            onPress: () => setPhotoAsk('wait'),
          },
        ]}
      />
      <SimpleAlert
        visible={photoAsk === 'wait'}
        title="No worries"
        message="We'll wait. Tap the empty photo again when you have one."
        actionLabel="OK"
        onDismiss={() => setPhotoAsk(null)}
      />
      <PdfReadyModal
        pdf={pdfReady}
        onClose={() => setPdfReady(null)}
        onError={(message) => setAlert({ title: 'PDF', message })}
      />
    </View>
  )
}
