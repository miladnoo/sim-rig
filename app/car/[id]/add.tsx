import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography, spacing, borderRadius } from '../../../theme'
import { useTheme } from '../../../utils/ThemeContext'
import { useLargeText } from '../../../utils/LargeTextContext'
import { insertService } from '../../../db/services'
import { getCar } from '../../../db/cars'
import { takePhoto, pickPhoto, replaceLocalPhoto } from '../../../utils/photos'
import { successTick } from '../../../utils/haptics'
import { toLocalDateString } from '../../../utils/dates'
import ConfirmModal from '../../../components/ConfirmModal'
import SimpleAlert from '../../../components/SimpleAlert'

export default function AddServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { scale } = useLargeText()
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [mileage, setMileage] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [partNumber, setPartNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptUri, setReceiptUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [discardModal, setDiscardModal] = useState(false)
  const [requiredAlert, setRequiredAlert] = useState(false)
  const [saveErrorAlert, setSaveErrorAlert] = useState(false)
  const [photoAlert, setPhotoAlert] = useState<string | null>(null)

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, paddingBottom: 48 + insets.bottom },
    label: { fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.md },
    input: {
      backgroundColor: colors.surface, borderRadius: borderRadius.sm, padding: spacing.md,
      minHeight: 48, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderCurve: 'continuous',
    },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    dateBtn: {
      backgroundColor: colors.surface, borderRadius: borderRadius.sm, padding: spacing.md,
      minHeight: 48, justifyContent: 'center',
      borderWidth: 1, borderColor: colors.border, borderCurve: 'continuous',
    },
    dateText: { color: colors.textPrimary },
    photoRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    photoBtn: {
      flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.sm, padding: spacing.md,
      minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderCurve: 'continuous',
    },
    photoBtnText: { fontSize: typography.bodySmall, color: colors.textPrimary },
    receiptPreview: { width: '100%', height: 160, borderRadius: borderRadius.sm, marginTop: spacing.sm, backgroundColor: colors.border, borderCurve: 'continuous' },
    removePhoto: { color: colors.error, fontSize: typography.bodySmall, marginTop: spacing.sm, textAlign: 'center' },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 999, padding: spacing.md, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg, borderCurve: 'continuous' },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 19 },
  }), [colors, insets.bottom])

  const markChanged = useCallback(() => {
    if (!hasChanges) setHasChanges(true)
  }, [hasChanges])

  const navigation = useNavigation()
  const pendingLeave = useRef<any>(null)
  const allowLeave = useRef(false)

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (allowLeave.current || !hasChanges) return
      e.preventDefault()
      pendingLeave.current = e.data.action
      setDiscardModal(true)
    })
    return sub
  }, [navigation, hasChanges])

  const carId = parseInt(id!, 10)

  useEffect(() => {
    let cancelled = false
    getCar(carId).then((car) => {
      if (cancelled || !car?.mileage) return
      setMileage((prev) => prev || car.mileage || '')
    })
    return () => { cancelled = true }
  }, [carId])

  const onDateChange = (_: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false)
    if (!selectedDate) return
    setDate(selectedDate)
    if (toLocalDateString(selectedDate) !== toLocalDateString(date)) markChanged()
  }

  const handleSave = async () => {
    if (saving) return
    if (!description.trim()) {
      setRequiredAlert(true)
      return
    }

    setSaving(true)
    try {
      await insertService({
        car_id: carId,
        date: toLocalDateString(date),
        mileage: mileage.trim() || null,
        description: description.trim(),
        cost: cost.trim() || null,
        part_number: partNumber.trim() || null,
        receipt_photo_uri: receiptUri,
        notes: notes.trim() || null,
      })
      allowLeave.current = true
      setHasChanges(false)
      successTick()
      router.back()
    } catch {
      setSaveErrorAlert(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
      <Stack.Screen options={{ title: 'Add Service' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { fontSize: scale(typography.body), marginTop: 0 }]}>What was done</Text>
        <TextInput
          style={[styles.input, styles.multiline, { fontSize: scale(typography.body) }]}
          placeholder="Oil change, brakes, tires…"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={(t) => { setDescription(t); markChanged() }}
          multiline
          numberOfLines={3}
        />

        <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Date</Text>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        ) : (
          <>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={[styles.dateText, { fontSize: scale(typography.body) }]}>
                {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
            {showDatePicker ? (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            ) : null}
          </>
        )}

        <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Miles</Text>
        <TextInput
          style={[styles.input, { fontSize: scale(typography.body) }]}
          placeholder="e.g. 42150"
          placeholderTextColor={colors.textMuted}
          value={mileage}
          onChangeText={(t) => { setMileage(t); markChanged() }}
          keyboardType="number-pad"
        />

        <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Cost</Text>
        <TextInput
          style={[styles.input, { fontSize: scale(typography.body) }]}
          placeholder="e.g. 49.99"
          placeholderTextColor={colors.textMuted}
          value={cost}
          onChangeText={(t) => { setCost(t); markChanged() }}
          keyboardType="decimal-pad"
        />

        <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Part number / brand</Text>
        <TextInput
          style={[styles.input, { fontSize: scale(typography.body) }]}
          placeholder="e.g. FL-1A / Motorcraft"
          placeholderTextColor={colors.textMuted}
          value={partNumber}
          onChangeText={(t) => { setPartNumber(t); markChanged() }}
        />

        <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Receipt</Text>
        <View style={styles.photoRow}>
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={() => takePhoto('receipt').then(async (uri) => { if (uri) { await replaceLocalPhoto(receiptUri, uri); setReceiptUri(uri); markChanged() } }).catch((e) => setPhotoAlert(e?.message || 'Allow camera or photos in Settings, then try again.'))}
          >
            <Text style={[styles.photoBtnText, { fontSize: scale(typography.body) }]}>Take photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={() => pickPhoto('receipt').then(async (uri) => { if (uri) { await replaceLocalPhoto(receiptUri, uri); setReceiptUri(uri); markChanged() } }).catch((e) => setPhotoAlert(e?.message || 'Allow camera or photos in Settings, then try again.'))}
          >
            <Text style={[styles.photoBtnText, { fontSize: scale(typography.body) }]}>Choose</Text>
          </TouchableOpacity>
        </View>
        {receiptUri ? <Image source={{ uri: receiptUri }} style={styles.receiptPreview} /> : null}
        {receiptUri ? (
          <TouchableOpacity onPress={() => { replaceLocalPhoto(receiptUri, null); setReceiptUri(null); markChanged() }}>
            <Text style={styles.removePhoto}>Remove photo</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multiline, { fontSize: scale(typography.body) }]}
          placeholder="Anything else worth remembering"
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={(t) => { setNotes(t); markChanged() }}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={[styles.saveBtnText, { fontSize: scale(typography.body) }]}>{saving ? 'Saving…' : 'Save record'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmModal
        visible={discardModal}
        title="Discard changes?"
        message="This service record has not been saved."
        buttons={[
          { text: 'Keep editing', style: 'cancel', onPress: () => setDiscardModal(false) },
          { text: 'Discard', style: 'destructive', onPress: () => {
            setDiscardModal(false)
            allowLeave.current = true
            setHasChanges(false)
            if (receiptUri) replaceLocalPhoto(receiptUri, null)
            const action = pendingLeave.current
            pendingLeave.current = null
            if (action) navigation.dispatch(action)
            else router.back()
          } },
        ]}
      />
      <SimpleAlert visible={requiredAlert} title="Required" message="Describe what was done." onDismiss={() => setRequiredAlert(false)} />
      <SimpleAlert visible={saveErrorAlert} title="Could not save" message="Try again." onDismiss={() => setSaveErrorAlert(false)} />
      <SimpleAlert visible={photoAlert !== null} title="Could not add photo" message={photoAlert ?? ''} onDismiss={() => setPhotoAlert(null)} />
    </KeyboardAvoidingView>
  )
}
