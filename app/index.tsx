import { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { Redirect, Stack, useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography, spacing } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { usePremium } from '../utils/PremiumContext'
import { useOnboarding } from '../utils/OnboardingContext'
import { getAllCars, deleteCar, Car } from '../db/cars'
import { formatServiceDate } from '../utils/dates'
import CarCard from '../components/CarCard'
import BottomActionBar from '../components/BottomActionBar'
import EmptyState from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import SearchField from '../components/SearchField'
import HeaderIconButton from '../components/HeaderIconButton'

export default function GarageScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { isPremium, isLoading: premiumLoading, previewUnpaid, initFailed } = usePremium()
  const { ready, seen } = useOnboarding()
  const insets = useSafeAreaInsets()
  const [cars, setCars] = useState<Car[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Car | null>(null)

  const styles = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    // 180 > the floating pill's worst case (insets + padding + 56pt button),
    // so the last card can never end up dead under it.
    list: { padding: spacing.md, paddingBottom: 180 + insets.bottom },
  }), [colors, insets.bottom])

  const loadCars = useCallback(async () => {
    try {
      setCars(await getAllCars())
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadCars()
    }, [loadCars])
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cars
    return cars.filter((c) =>
      `${c.year} ${c.make} ${c.model} ${c.vin ?? ''} ${c.engine || ''}`.toLowerCase().includes(q)
    )
  }, [cars, query])

  const openAddCar = () => {
    if (!premiumLoading && !isPremium) {
      router.replace('/premium')
      return
    }
    router.push('/add-car')
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await deleteCar(pendingDelete.id)
    setPendingDelete(null)
    loadCars()
  }

  if (!ready || premiumLoading) {
    return (
      <View style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    )
  }
  if (!seen) return <Redirect href="/onboarding" />
  // Keep parity with _layout: when RevenueCat init failed, the app stays usable
  // instead of bouncing between the garage and a paywall with no exit.
  if (!isPremium && !initFailed) {
    return <Redirect href={previewUnpaid ? '/premium?preview=1' : '/premium'} />
  }

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: 'Garage',
          headerShown: true,
          headerLargeTitle: true,
          ...(Platform.OS === 'ios'
            ? {
                headerSearchBarOptions: {
                  placeholder: 'Search cars',
                  hideWhenScrolling: true,
                  onChangeText: (e: { nativeEvent: { text: string } }) => setQuery(e.nativeEvent.text),
                  onCancelButtonPress: () => setQuery(''),
                },
              }
            : {}),
          headerRight: () => (
            <HeaderIconButton
              name="gear"
              color={colors.textPrimary}
              onPress={() => router.push('/settings')}
              accessibilityLabel="Settings"
            />
          ),
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError ? (
        <EmptyState
          title="Could not open the garage"
          subtitle="The records on this phone could not be read. Try again."
          actionLabel="Try again"
          onAction={() => { setLoading(true); loadCars() }}
          icon="wrench"
        />
      ) : cars.length === 0 ? (
        <EmptyState
          title="Add your first car"
          subtitle="Then write down oil changes, brakes, and receipts."
          actionLabel="Add a car"
          onAction={openAddCar}
        />
      ) : (
        <>
          <SearchField placeholder="Search cars" value={query} onChangeText={setQuery} />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={[
              styles.list,
              filtered.length === 0 && { flexGrow: 1 },
            ]}
            contentInsetAdjustmentBehavior="automatic"
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadCars() }}
            ListEmptyComponent={
              <EmptyState title="No matches" subtitle="Try a different make, model, or year." icon="search" />
            }
            renderItem={({ item }) => (
              <CarCard
                year={item.year}
                make={item.make}
                model={item.model}
                mileage={item.mileage}
                lastService={item.last_service_date ? formatServiceDate(item.last_service_date) : null}
                photoUri={item.photo_uri}
                onPress={() => router.push(`/car/${item.id}`)}
                onRemove={() => setPendingDelete(item)}
              />
            )}
          />
        </>
      )}

      {cars.length > 0 ? <BottomActionBar label="Add a car" onPress={openAddCar} /> : null}

      <ConfirmModal
        visible={pendingDelete !== null}
        title={pendingDelete ? `Remove ${pendingDelete.year} ${pendingDelete.make} ${pendingDelete.model}?`.trim() : ''}
        message="This also removes its service records. This cannot be undone."
        buttons={[
          { text: 'Keep it', style: 'cancel', onPress: () => setPendingDelete(null) },
          { text: 'Remove', style: 'destructive', onPress: confirmDelete },
        ]}
      />
    </View>
  )
}
