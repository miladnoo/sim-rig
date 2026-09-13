import { useState, useMemo, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native'
import { Stack, useRouter, useNavigation } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography, spacing, borderRadius } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { useLargeText } from '../utils/LargeTextContext'
import { insertCar } from '../db/cars'
import { successTick } from '../utils/haptics'
import { decodeVin, extractVin, normalizeVinInput, shouldUseVin } from '../api/vin'
import { formatVinFound, pauseAfterVinSuccess, pauseForVinTheater } from '../utils/vinTheater'
import { usePremium } from '../utils/PremiumContext'
import { takePhoto, pickPhoto, replaceLocalPhoto } from '../utils/photos'
import SimpleAlert from '../components/SimpleAlert'
import ConfirmModal from '../components/ConfirmModal'
import VinLookupCard, { type VinLookupPhase } from '../components/VinLookupCard'
import VinScanner from '../components/VinScanner'

function isProperMileage(raw: string): boolean {
  const digits = raw.trim().replace(/,/g, '')
  return /^\d+$/.test(digits) && digits.length >= 2 && digits.length <= 7
}

export default function AddCarScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { scale } = useLargeText()
  const { isPremium } = usePremium()
  const [vinInput, setVinInput] = useState('')
  const [phase, setPhase] = useState<VinLookupPhase>('idle')
  const [successLabel, setSuccessLabel] = useState('')
  const [year, setYear] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [engine, setEngine] = useState('')
  const [mileage, setMileage] = useState('')
  const [carPhoto, setCarPhoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [discardModal, setDiscardModal] = useState(false)
  const [prompt, setPrompt] = useState<'miles' | 'photo' | 'photoLater' | null>(null)
  const [needMiles, setNeedMiles] = useState(false)
  const pendingLeave = useRef<any>(null)
  const allowLeave = useRef(false)
  const milesRef = useRef<TextInput>(null)
  const pendingPhotoAfterMiles = useRef(false)
  const photoAfterBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const carPhotoRef = useRef(carPhoto)
  carPhotoRef.current = carPhoto
  const styles = useMemo(() => StyleSheet.create({
    content: { padding: spacing.md, paddingBottom: 48 + insets.bottom },
    section: {
      color: colors.textSecondary,
      fontWeight: '700',
      fontSize: typography.caption,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    pair: { flexDirection: 'row', gap: spacing.sm },
    half: { flex: 1 },
    label: { fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.md },
    input: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.sm,
      padding: spacing.md,
      minHeight: 48,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      borderCurve: 'continuous',
    },
    actionBtnDisabled: { opacity: 0.6 },
    photoRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    photoBtn: {
      flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.sm,
      padding: spacing.md, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
      borderCurve: 'continuous',
    },
    photoBtnText: { fontSize: typography.bodySmall, color: colors.textPrimary },
    preview: { width: '100%', height: 160, borderRadius: borderRadius.sm, marginTop: spacing.sm, backgroundColor: colors.border, borderCurve: 'continuous' },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 999, padding: spacing.md, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg, borderCurve: 'continuous' },
    saveBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 19 },
  }), [colors, insets.bottom])

  const dirty = !!(vinInput.trim() || year.trim() || make.trim() || model.trim() || engine.trim() || mileage.trim() || carPhoto)

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (allowLeave.current || !dirty) return
      e.preventDefault()
      pendingLeave.current = e.data.action
      setDiscardModal(true)
    })
    return sub
  }, [navigation, dirty])

  useEffect(() => () => {
    if (photoAfterBlurTimer.current) clearTimeout(photoAfterBlurTimer.current)
  }, [])

  const applyResult = async (result: { year: string | null; make: string | null; model: string | null; engine: string | null }) => {
    setSuccessLabel(formatVinFound(result))
    setPhase('success')
    await pauseAfterVinSuccess()
    if (result.year) setYear(result.year)
    if (result.make) setMake(result.make)
    if (result.model) setModel(result.model)
    if (result.engine) setEngine(result.engine)
  }

  const handleDecodeVin = async (raw?: string) => {
    const cleanVin = extractVin(raw ?? vinInput) ?? (raw ?? vinInput).trim().toUpperCase()
    setVinInput(normalizeVinInput(cleanVin))
    if (!extractVin(cleanVin)) {
      setPhase('idle')
      setAlert({
        title: 'Cannot decode this VIN',
        message: 'NHTSA decode needs 17 characters (1981 and newer). For older cars, type year, make, and model. You can still save a shorter serial.',
      })
      return
    }
    if (year && !shouldUseVin(year)) {
      setPhase('idle')
      setAlert({ title: 'Pre-1981 vehicle', message: 'NHTSA often cannot decode VINs from before 1981. Fill in year, make, and model yourself.' })
      return
    }
    setPhase('working')
    setSuccessLabel('')
    const started = Date.now()
    const result = await decodeVin(extractVin(cleanVin)!)
    await pauseForVinTheater(started)
    if (!result || (!result.year && !result.make && !result.model)) {
      setPhase('idle')
      setAlert({ title: 'Could not decode', message: 'Check the VIN, or type year, make, and model yourself.' })
      return
    }
    await applyResult(result)
    if (!isProperMileage(mileage)) {
      setNeedMiles(true)
      pendingPhotoAfterMiles.current = true
      setPrompt('miles')
    } else if (!carPhoto) {
      setPrompt('photo')
    }
  }

  const handleSave = async () => {
    if (photoAfterBlurTimer.current) {
      clearTimeout(photoAfterBlurTimer.current)
      photoAfterBlurTimer.current = null
    }
    if (saving) return
    if (!make.trim() || !model.trim()) {
      setAlert({ title: 'Need make and model', message: 'Type the make and model, then save.' })
      return
    }
    if (!isPremium) {
      router.replace('/premium')
      return
    }
    setSaving(true)
    try {
      const id = await insertCar({
        year: year.trim(),
        make: make.trim(),
        model: model.trim(),
        engine: engine.trim() || null,
        vin: vinInput.trim().toUpperCase() || null,
        mileage: mileage.trim() || null,
        photo_uri: carPhoto,
      })
      allowLeave.current = true
      successTick()
      router.replace(`/car/${id}`)
    } catch {
      setAlert({ title: 'Could not save', message: 'The car was not saved. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
      <Stack.Screen options={{ title: 'Add a car', headerBackTitle: 'Garage' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <VinLookupCard
          value={vinInput}
          onChangeText={(t) => { setVinInput(normalizeVinInput(t)); if (phase === 'success') setPhase('idle') }}
          onScan={() => setScanOpen(true)}
          onFill={() => handleDecodeVin()}
          phase={phase}
          successLabel={successLabel}
        />

        <Text style={styles.section}>Car details</Text>

        <View style={styles.pair}>
          <View style={styles.half}>
            <Text style={[styles.label, { fontSize: scale(typography.body), marginTop: spacing.sm }]}>Year</Text>
            <TextInput style={[styles.input, { fontSize: scale(typography.body) }]} placeholder="1967" placeholderTextColor={colors.textMuted} value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
          </View>
          <View style={styles.half}>
            <Text style={[styles.label, { fontSize: scale(typography.body), marginTop: spacing.sm }]}>Miles</Text>
            <TextInput
              ref={milesRef}
              style={[styles.input, { fontSize: scale(typography.body) }, needMiles && !mileage.trim() && { borderColor: colors.primary }]}
              placeholder="89420"
              placeholderTextColor={colors.textMuted}
              value={mileage}
              onChangeText={(t) => {
                const next = t.replace(/[^\d,]/g, '')
                setMileage(next)
                if (next.trim()) setNeedMiles(false)
              }}
              keyboardType="number-pad"
              onFocus={() => {
                if (photoAfterBlurTimer.current) {
                  clearTimeout(photoAfterBlurTimer.current)
                  photoAfterBlurTimer.current = null
                }
              }}
              onEndEditing={(e) => {
                if (photoAfterBlurTimer.current) clearTimeout(photoAfterBlurTimer.current)
                if (!pendingPhotoAfterMiles.current || carPhotoRef.current) return
                if (!e.nativeEvent.text.trim()) return
                photoAfterBlurTimer.current = setTimeout(() => {
                  photoAfterBlurTimer.current = null
                  if (!pendingPhotoAfterMiles.current || carPhotoRef.current) return
                  pendingPhotoAfterMiles.current = false
                  Keyboard.dismiss()
                  setNeedMiles(false)
                  setPrompt('photo')
                }, 1500)
              }}
            />
            {needMiles && !mileage.trim() ? (
              <Text style={{ color: colors.textSecondary, fontSize: scale(typography.bodySmall), marginTop: 4, lineHeight: 20 }}>
                Please add the miles. The VIN does not include the odometer.
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.pair}>
          <View style={styles.half}>
            <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Make</Text>
            <TextInput style={[styles.input, { fontSize: scale(typography.body) }]} placeholder="Ford" placeholderTextColor={colors.textMuted} value={make} onChangeText={setMake} />
          </View>
          <View style={styles.half}>
            <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Model</Text>
            <TextInput style={[styles.input, { fontSize: scale(typography.body) }]} placeholder="Mustang" placeholderTextColor={colors.textMuted} value={model} onChangeText={setModel} />
          </View>
        </View>

        <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Engine</Text>
        <TextInput style={[styles.input, { fontSize: scale(typography.body) }]} placeholder="289 V8" placeholderTextColor={colors.textMuted} value={engine} onChangeText={setEngine} />

        <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Photo</Text>
        <View style={styles.photoRow}>
          <TouchableOpacity style={styles.photoBtn} onPress={() => takePhoto('car').then(async (uri) => { if (uri) { await replaceLocalPhoto(carPhoto, uri); setCarPhoto(uri) } }).catch((e) => setAlert({ title: 'Camera', message: e?.message || 'Could not take a photo.' }))}>
            <Text style={[styles.photoBtnText, { fontSize: scale(typography.body) }]}>Take photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto('car').then(async (uri) => { if (uri) { await replaceLocalPhoto(carPhoto, uri); setCarPhoto(uri) } }).catch((e) => setAlert({ title: 'Photos', message: e?.message || 'Could not choose a photo.' }))}>
            <Text style={[styles.photoBtnText, { fontSize: scale(typography.body) }]}>Choose</Text>
          </TouchableOpacity>
        </View>
        {carPhoto && <Image source={{ uri: carPhoto }} style={styles.preview} />}

        <TouchableOpacity style={[styles.saveBtn, saving && styles.actionBtnDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveBtnText, { fontSize: scale(typography.body) }]}>{saving ? 'Saving…' : 'Save car'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmModal
        visible={prompt === 'miles'}
        title="Add the miles"
        message="The VIN gives year, make, and model. It does not know the odometer. Type the miles in the Miles field."
        buttons={[
          {
            text: 'OK',
            onPress: () => {
              setPrompt(null)
              setTimeout(() => milesRef.current?.focus(), 300)
            },
          },
        ]}
      />
      <ConfirmModal
        visible={prompt === 'photo'}
        title="A picture of the car?"
        message="If you have a photo you like — parked, in good light — we can put it at the top of this page."
        buttons={[
          {
            text: 'Choose a photo',
            onPress: () => {
              setPrompt(null)
              pickPhoto('car')
                .then(async (uri) => {
                  if (!uri) return
                  await replaceLocalPhoto(carPhoto, uri)
                  setCarPhoto(uri)
                })
                .catch((e) => setAlert({ title: 'Photos', message: e?.message || 'Could not choose a photo.' }))
            },
          },
          {
            text: 'Not yet',
            style: 'cancel',
            onPress: () => setPrompt('photoLater'),
          },
        ]}
      />
      <SimpleAlert
        visible={prompt === 'photoLater'}
        title="Whenever you're ready"
        message="Next time the car is parked in nice light, open it and tap the empty photo."
        actionLabel="OK"
        onDismiss={() => {
          setPrompt(null)
        }}
      />
      <ConfirmModal
        visible={discardModal}
        title="Discard this car?"
        message="Nothing has been saved yet."
        buttons={[
          { text: 'Keep editing', style: 'cancel', onPress: () => setDiscardModal(false) },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              allowLeave.current = true
              setDiscardModal(false)
              if (carPhoto) replaceLocalPhoto(carPhoto, null)
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
        onScan={(vin) => {
          setVinInput(vin)
          void handleDecodeVin(vin)
        }}
      />
      <SimpleAlert
        visible={alert !== null}
        title={alert?.title ?? ''}
        message={alert?.message ?? ''}
        onDismiss={() => setAlert(null)}
      />
    </KeyboardAvoidingView>
  )
}
