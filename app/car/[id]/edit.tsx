import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography, spacing, borderRadius } from '../../../theme'
import { useTheme } from '../../../utils/ThemeContext'
import { useLargeText } from '../../../utils/LargeTextContext'
import { getCar, updateCar } from '../../../db/cars'
import { takePhoto, pickPhoto, replaceLocalPhoto } from '../../../utils/photos'
import { decodeVin, extractVin } from '../../../api/vin'

import SimpleAlert from '../../../components/SimpleAlert'
import ConfirmModal from '../../../components/ConfirmModal'
import EmptyState from '../../../components/EmptyState'
import VinScanner from '../../../components/VinScanner'

export default function EditCarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const navigation = useNavigation()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { scale } = useLargeText()
  const carId = parseInt(id!, 10)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [year, setYear] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [engine, setEngine] = useState('')
  const [vin, setVin] = useState('')
  const [mileage, setMileage] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [alert, setAlert] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  // VIN captured by the scanner is decoded after the modal closes, so the
  // result is applied to a visible screen.
  const scanDecodeRef = useRef<string | null>(null)
  useEffect(() => {
    if (scanOpen === false && scanDecodeRef.current) {
      const scanned = scanDecodeRef.current
      scanDecodeRef.current = null
      setVin(scanned)
      void decodeScannedVin(scanned)
    }
  }, [scanOpen])

  const decodeScannedVin = async (scanned: string) => {
    const result = await decodeVin(extractVin(scanned)!)
    if (!result) return
    if (result.year) setYear(result.year)
    if (result.make) setMake(result.make)
    if (result.model) setModel(result.model)
    if (result.engine) setEngine(result.engine)
    setAlert(`Filled from VIN: ${[result.year, result.make, result.model].filter(Boolean).join(' ')}`)
  }
  const [discardModal, setDiscardModal] = useState(false)
  const pendingLeave = useRef<any>(null)
  const allowLeave = useRef(false)
  const original = useRef({ year: '', make: '', model: '', engine: '', vin: '', mileage: '', photo: null as string | null })

  const styles = useMemo(() => StyleSheet.create({
    content: { padding: spacing.md, paddingBottom: 48 + insets.bottom },
    center: { flex: 1, justifyContent: 'center' },
    pair: { flexDirection: 'row', gap: spacing.sm },
    half: { flex: 1 },
    section: {
      color: colors.textSecondary,
      fontWeight: '700',
      fontSize: typography.caption,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    label: { fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.md },
    input: {
      backgroundColor: colors.surface, borderRadius: borderRadius.sm, padding: spacing.md,
      minHeight: 48, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderCurve: 'continuous',
    },
    photoRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    photoBtn: {
      flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.sm,
      padding: spacing.md, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderCurve: 'continuous',
    },
    photoBtnText: { fontSize: typography.bodySmall, color: colors.textPrimary },
    preview: { width: '100%', height: 160, borderRadius: borderRadius.sm, marginTop: spacing.sm, backgroundColor: colors.border, borderCurve: 'continuous' },
    vinFillBtn: {
      marginLeft: spacing.sm, backgroundColor: colors.surface, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: spacing.md, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderCurve: 'continuous',
    },
    vinFillText: { color: colors.primary, fontWeight: '700', fontSize: typography.bodySmall },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 999, padding: spacing.md, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg, borderCurve: 'continuous' },
    saveBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 19 },
  }), [colors, insets.bottom])

  const loadCar = useCallback(() => {
    setLoading(true)
    getCar(carId)
      .then((car) => {
        setLoadError(false)
        if (!car) {
          setMissing(true)
          return
        }
        setMissing(false)
        setYear(car.year || '')
        setMake(car.make)
        setModel(car.model)
        setEngine(car.engine || '')
        setVin(car.vin || '')
        setMileage(car.mileage || '')
        setPhoto(car.photo_uri)
        original.current = {
          year: car.year || '',
          make: car.make,
          model: car.model,
          engine: car.engine || '',
          vin: car.vin || '',
          mileage: car.mileage || '',
          photo: car.photo_uri,
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [carId])

  useEffect(() => {
    loadCar()
  }, [loadCar])

  const dirty =
    year !== original.current.year ||
    make !== original.current.make ||
    model !== original.current.model ||
    engine !== original.current.engine ||
    vin !== original.current.vin ||
    mileage !== original.current.mileage ||
    photo !== original.current.photo

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (allowLeave.current || loading || !dirty) return
      e.preventDefault()
      pendingLeave.current = e.data.action
      setDiscardModal(true)
    })
    return sub
  }, [navigation, dirty, loading])

  // Edit keeps the VIN as a plain field: the car already exists, so this is
  // bookkeeping, not onboarding. Fill-from-VIN theater stays on Add.
  const handleDecodeVin = async () => {
    const clean = extractVin(vin) ?? vin.trim().toUpperCase()
    setVin(clean)
    if (!extractVin(clean)) {
      setAlert('NHTSA decode needs 17 characters (1981 and newer). You can still save a shorter serial.')
      return
    }
    const result = await decodeVin(extractVin(clean)!)
    if (!result || (!result.year && !result.make && !result.model)) {
      setAlert('Could not decode this VIN. Check it, or keep the fields you typed.')
      return
    }
    if (result.year) setYear(result.year)
    if (result.make) setMake(result.make)
    if (result.model) setModel(result.model)
    if (result.engine) setEngine(result.engine)
    setAlert(`Filled from VIN: ${[result.year, result.make, result.model].filter(Boolean).join(' ')}`)
  }

  const handleSave = async () => {
    if (saving) return
    if (!make.trim() || !model.trim()) {
      setAlert('Make and model are required.')
      return
    }
    setSaving(true)
    try {
      await updateCar(carId, {
        year: year.trim(),
        make: make.trim(),
        model: model.trim(),
        engine: engine.trim() || null,
        vin: vin.trim().toUpperCase() || null,
        mileage: mileage.trim() || null,
        photo_uri: photo,
      })
      allowLeave.current = true
      router.back()
    } catch {
      setAlert('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Edit car' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (loadError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Edit car' }} />
        <EmptyState
          title="Could not load this car"
          subtitle="The record on this phone could not be read. Try again."
          actionLabel="Try again"
          onAction={loadCar}
        />
      </View>
    )
  }

  if (missing) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Edit car' }} />
        <Text style={{ color: colors.textSecondary, fontSize: scale(typography.body) }}>Car not found</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
      <Stack.Screen options={{ title: 'Edit car' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Car details</Text>
        <View style={styles.pair}>
          <View style={styles.half}>
            <Text style={[styles.label, { fontSize: scale(typography.body), marginTop: spacing.sm }]}>Year</Text>
            <TextInput style={[styles.input, { fontSize: scale(typography.body) }]} value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} placeholderTextColor={colors.textMuted} />
          </View>
          <View style={styles.half}>
            <Text style={[styles.label, { fontSize: scale(typography.body), marginTop: spacing.sm }]}>Mileage</Text>
            <TextInput style={[styles.input, { fontSize: scale(typography.body) }]} value={mileage} onChangeText={setMileage} keyboardType="number-pad" placeholderTextColor={colors.textMuted} />
          </View>
        </View>
        <View style={styles.pair}>
          <View style={styles.half}>
            <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Make *</Text>
            <TextInput style={[styles.input, { fontSize: scale(typography.body) }]} value={make} onChangeText={setMake} placeholderTextColor={colors.textMuted} />
          </View>
          <View style={styles.half}>
            <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Model *</Text>
            <TextInput style={[styles.input, { fontSize: scale(typography.body) }]} value={model} onChangeText={setModel} placeholderTextColor={colors.textMuted} />
          </View>
        </View>
        <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Engine</Text>
        <TextInput style={[styles.input, { fontSize: scale(typography.body) }]} value={engine} onChangeText={setEngine} placeholderTextColor={colors.textMuted} />
        <Text style={[styles.label, { fontSize: scale(typography.body) }]}>VIN</Text>
        <View style={styles.pair}>
          <TextInput
            style={[styles.input, { flex: 1, fontSize: scale(typography.body) }]}
            value={vin}
            onChangeText={(t) => setVin(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={17}
            placeholder="If it has one"
            placeholderTextColor={colors.textMuted}
          />
          {vin.trim() ? (
            <TouchableOpacity style={styles.vinFillBtn} onPress={handleDecodeVin}>
              <Text style={styles.vinFillText}>Decode</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.vinFillBtn} onPress={() => setScanOpen(true)}>
              <Text style={styles.vinFillText}>Scan</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Photo</Text>
        <View style={styles.photoRow}>
          <TouchableOpacity style={styles.photoBtn} onPress={() => takePhoto('car').then(async (uri) => {
            if (!uri) return
            if (photo && photo !== original.current.photo) await replaceLocalPhoto(photo, uri)
            setPhoto(uri)
          }).catch((e) => setAlert(e?.message || 'Could not take a photo.'))}>
            <Text style={[styles.photoBtnText, { fontSize: scale(typography.body) }]}>Take photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto('car').then(async (uri) => {
            if (!uri) return
            if (photo && photo !== original.current.photo) await replaceLocalPhoto(photo, uri)
            setPhoto(uri)
          }).catch((e) => setAlert(e?.message || 'Could not choose a photo.'))}>
            <Text style={[styles.photoBtnText, { fontSize: scale(typography.body) }]}>Choose</Text>
          </TouchableOpacity>
        </View>
        {photo ? <Image source={{ uri: photo }} style={styles.preview} /> : null}
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveBtnText, { fontSize: scale(typography.body) }]}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
      <ConfirmModal
        visible={discardModal}
        title="Discard changes?"
        message="Edits to this car have not been saved."
        buttons={[
          { text: 'Keep editing', style: 'cancel', onPress: () => setDiscardModal(false) },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              allowLeave.current = true
              setDiscardModal(false)
              if (photo && photo !== original.current.photo) replaceLocalPhoto(photo, original.current.photo)
              const action = pendingLeave.current
              pendingLeave.current = null
              if (action) navigation.dispatch(action)
              else router.back()
            },
          },
        ]}
      />
      <VinScanner
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={(scanned) => {
          setVin(scanned)
          scanDecodeRef.current = scanned
        }}
      />
      <SimpleAlert
        visible={alert !== null}
        title={alert?.includes('Make') ? 'Missing Info' : alert?.includes('save') ? 'Could not save' : alert?.includes('decode') || alert?.includes('VIN') || alert?.includes('NHTSA') ? 'VIN' : 'Photo'}
        message={alert ?? ''}
        onDismiss={() => setAlert(null)}
      />
    </KeyboardAvoidingView>
  )
}
