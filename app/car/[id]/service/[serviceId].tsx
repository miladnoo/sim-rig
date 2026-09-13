import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography, spacing, borderRadius } from '../../../../theme'
import { useTheme } from '../../../../utils/ThemeContext'
import { useLargeText } from '../../../../utils/LargeTextContext'
import { getService, updateService, deleteService } from '../../../../db/services'
import { takePhoto, pickPhoto, deletePhoto, replaceLocalPhoto } from '../../../../utils/photos'
import { parseLocalDate, toLocalDateString, formatServiceDate, formatMileage } from '../../../../utils/dates'
import type { ServiceEntry } from '../../../../db/services'
import ConfirmModal from '../../../../components/ConfirmModal'
import SimpleAlert from '../../../../components/SimpleAlert'
import EmptyState from '../../../../components/EmptyState'
import PickerModal from '../../../../components/PickerModal'

export default function ServiceDetailScreen() {
  const { id, serviceId } = useLocalSearchParams<{ id: string; serviceId: string }>()
  const router = useRouter()
  const navigation = useNavigation()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { scale } = useLargeText()

  const [entry, setEntry] = useState<ServiceEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [mileage, setMileage] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [partNumber, setPartNumber] = useState('')
  const [receiptUri, setReceiptUri] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [photoModal, setPhotoModal] = useState(false)
  const [deleteServiceModal, setDeleteServiceModal] = useState(false)
  const [requiredAlert, setRequiredAlert] = useState(false)
  const [saveErrorAlert, setSaveErrorAlert] = useState(false)
  const [photoAlert, setPhotoAlert] = useState<string | null>(null)
  const [discardModal, setDiscardModal] = useState(false)
  const pendingLeave = useRef<any>(null)
  const allowLeave = useRef(false)

  const carId = parseInt(id!, 10)
  const svcId = parseInt(serviceId!, 10)

  const fillFrom = (svc: ServiceEntry) => {
    setDate(parseLocalDate(svc.date))
    setMileage(svc.mileage || '')
    setDescription(svc.description)
    setCost(svc.cost || '')
    setPartNumber(svc.part_number || '')
    setReceiptUri(svc.receipt_photo_uri)
    setNotes(svc.notes || '')
  }

  const load = useCallback(async () => {
    try {
      const svc = await getService(svcId)
      setLoadError(false)
      if (svc) {
        setEntry(svc)
        fillFrom(svc)
      } else {
        setEntry(null)
      }
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [svcId])

  useEffect(() => {
    load()
  }, [load])

  const dirty = !!(editing && entry && (
    toLocalDateString(date) !== entry.date ||
    mileage !== (entry.mileage || '') ||
    description !== entry.description ||
    cost !== (entry.cost || '') ||
    partNumber !== (entry.part_number || '') ||
    notes !== (entry.notes || '') ||
    receiptUri !== entry.receipt_photo_uri
  ))

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (allowLeave.current || !dirty) return
      e.preventDefault()
      pendingLeave.current = e.data.action
      setDiscardModal(true)
    })
    return sub
  }, [navigation, dirty])

  const onDateChange = (_: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false)
    if (selectedDate) setDate(selectedDate)
  }

  const handleSave = async () => {
    if (saving) return
    if (!description.trim()) {
      setRequiredAlert(true)
      return
    }
    setSaving(true)
    const dateStr = toLocalDateString(date)
    try {
      await updateService(svcId, {
        date: dateStr,
        mileage: mileage.trim() || null,
        description: description.trim(),
        cost: cost.trim() || null,
        part_number: partNumber.trim() || null,
        receipt_photo_uri: receiptUri,
        notes: notes.trim() || null,
      })
      setEditing(false)
      setEntry((prev) => prev ? {
        ...prev,
        date: dateStr,
        mileage: mileage.trim() || null,
        description: description.trim(),
        cost: cost.trim() || null,
        part_number: partNumber.trim() || null,
        receipt_photo_uri: receiptUri,
        notes: notes.trim() || null,
      } : null)
    } catch {
      setSaveErrorAlert(true)
    } finally {
      setSaving(false)
    }
  }

  const handleTakePhoto = async () => {
    setPhotoModal(false)
    try {
      const uri = await takePhoto('receipt')
      if (uri) {
        if (receiptUri && receiptUri !== entry?.receipt_photo_uri) await replaceLocalPhoto(receiptUri, uri)
        setReceiptUri(uri)
      }
    } catch (e: any) {
      setPhotoAlert(e?.message || 'Allow camera or photos in Settings, then try again.')
    }
  }

  const handlePickPhoto = async () => {
    setPhotoModal(false)
    try {
      const uri = await pickPhoto('receipt')
      if (uri) {
        if (receiptUri && receiptUri !== entry?.receipt_photo_uri) await replaceLocalPhoto(receiptUri, uri)
        setReceiptUri(uri)
      }
    } catch (e: any) {
      setPhotoAlert(e?.message || 'Allow camera or photos in Settings, then try again.')
    }
  }

  const handleRemovePhoto = async () => {
    if (receiptUri && receiptUri !== entry?.receipt_photo_uri) {
      await deletePhoto(receiptUri)
    }
    setReceiptUri(null)
  }

  const handleDeleteService = async () => {
    allowLeave.current = true
    setDeleteServiceModal(false)
    await deleteService(svcId)
    router.back()
  }

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1 },
    content: { padding: spacing.md, paddingBottom: 48 + insets.bottom },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerBtn: { color: colors.primary, fontSize: 17, fontWeight: '600' },
    label: { fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.md },
    input: { borderRadius: borderRadius.sm, padding: spacing.md, minHeight: 48, borderWidth: 1, borderCurve: 'continuous' },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    detailRow: { marginBottom: spacing.md },
    detailLabel: { marginBottom: spacing.xs, fontWeight: '600', fontSize: typography.caption, textTransform: 'uppercase', letterSpacing: 0.6 },
    detailValue: { lineHeight: 24 },
    receiptPreview: { width: '100%', height: 160, borderRadius: borderRadius.sm, marginTop: spacing.sm, backgroundColor: colors.border, borderCurve: 'continuous' },
    receiptFull: { width: '100%', height: 200, borderRadius: borderRadius.sm, marginTop: spacing.xs, backgroundColor: colors.border, borderCurve: 'continuous' },
    removeText: { fontSize: typography.bodySmall, marginTop: spacing.sm, textAlign: 'center' },
    photoBtn: { borderRadius: borderRadius.sm, padding: spacing.md, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderCurve: 'continuous' },
    saveBtn: { borderRadius: borderRadius.sm, padding: spacing.md, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg, borderCurve: 'continuous' },
    saveBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 19 },
    deleteServiceBtn: { marginTop: spacing.lg, borderRadius: 999, padding: spacing.md, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderCurve: 'continuous' },
    deleteServiceText: { fontWeight: '600', fontSize: typography.body },
  }), [colors, insets.bottom])

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Service' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (loadError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Service' }} />
        <EmptyState
          title="Could not load this record"
          subtitle="The service log could not be read. Try again."
          actionLabel="Try again"
          onAction={() => { setLoading(true); load() }}
        />
      </View>
    )
  }

  if (!entry) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Service' }} />
        <Text style={{ color: colors.textMuted, fontSize: scale(typography.body) }}>Record not found</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top}>
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: formatServiceDate(entry.date),
          headerRight: () => (
            <Pressable
              onPress={() => {
                if (editing) {
                  if (receiptUri && receiptUri !== entry.receipt_photo_uri) {
                    replaceLocalPhoto(receiptUri, entry.receipt_photo_uri)
                  }
                  setEditing(false)
                  fillFrom(entry)
                } else {
                  setEditing(true)
                }
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={editing ? 'Cancel editing' : 'Edit record'}
              style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }}
            >
              <Text style={styles.headerBtn}>{editing ? 'Cancel' : 'Edit'}</Text>
            </Pressable>
          ),
        }}
      />

      {editing ? (
        <>
          <Text style={[styles.label, { color: colors.textPrimary, fontSize: scale(typography.bodySmall), marginTop: 0 }]}>Date</Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker value={date} mode="date" display="compact" onChange={onDateChange} maximumDate={new Date()} />
          ) : (
            <>
              <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: colors.textPrimary, fontSize: scale(typography.body) }}>
                  {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              {showDatePicker ? (
                <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />
              ) : null}
            </>
          )}

          <Text style={[styles.label, { color: colors.textPrimary, fontSize: scale(typography.bodySmall) }]}>Mileage</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, fontSize: scale(typography.body) }]} value={mileage} onChangeText={setMileage} keyboardType="number-pad" placeholderTextColor={colors.textMuted} />

          <Text style={[styles.label, { color: colors.textPrimary, fontSize: scale(typography.bodySmall) }]}>What was done</Text>
          <TextInput style={[styles.input, styles.multiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, fontSize: scale(typography.body) }]} value={description} onChangeText={setDescription} multiline numberOfLines={3} placeholderTextColor={colors.textMuted} />

          <Text style={[styles.label, { color: colors.textPrimary, fontSize: scale(typography.bodySmall) }]}>Cost</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, fontSize: scale(typography.body) }]} value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />

          <Text style={[styles.label, { color: colors.textPrimary, fontSize: scale(typography.bodySmall) }]}>Part number / brand</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, fontSize: scale(typography.body) }]} value={partNumber} onChangeText={setPartNumber} placeholderTextColor={colors.textMuted} />

          <Text style={[styles.label, { color: colors.textPrimary, fontSize: scale(typography.bodySmall) }]}>Receipt</Text>
          {receiptUri ? (
            <View>
              <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
              <TouchableOpacity onPress={handleRemovePhoto}><Text style={[styles.removeText, { color: colors.error }]}>Remove photo</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.photoBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setPhotoModal(true)}>
              <Text style={{ color: colors.textSecondary, fontSize: scale(typography.body) }}>Add photo</Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.label, { color: colors.textPrimary, fontSize: scale(typography.bodySmall) }]}>Notes</Text>
          <TextInput style={[styles.input, styles.multiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, fontSize: scale(typography.body) }]} value={notes} onChangeText={setNotes} multiline numberOfLines={3} placeholderTextColor={colors.textMuted} />

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          {entry.mileage ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary, fontSize: scale(typography.bodySmall) }]}>Mileage</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary, fontSize: scale(typography.body) }]}>{formatMileage(entry.mileage)} mi</Text>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary, fontSize: scale(typography.bodySmall) }]}>Work done</Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary, fontSize: scale(typography.title), fontWeight: '700', letterSpacing: -0.3, lineHeight: 30 }]} selectable>{entry.description}</Text>
          </View>

          {entry.cost ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary, fontSize: scale(typography.bodySmall) }]}>Cost</Text>
              <Text style={[styles.detailValue, { color: colors.primary, fontWeight: '700', fontSize: scale(typography.body) }]}>
                ${Number.isFinite(parseFloat(entry.cost)) ? parseFloat(entry.cost).toFixed(2) : entry.cost}
              </Text>
            </View>
          ) : null}

          {entry.part_number ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary, fontSize: scale(typography.bodySmall) }]}>Part / brand</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary, fontSize: scale(typography.body) }]} selectable>{entry.part_number}</Text>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary, fontSize: scale(typography.bodySmall) }]}>Receipt</Text>
            {entry.receipt_photo_uri ? (
              <Image source={{ uri: entry.receipt_photo_uri }} style={styles.receiptFull} />
            ) : (
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: spacing.sm }]}
                onPress={() => setEditing(true)}
                accessibilityRole="button"
                accessibilityLabel="Add a receipt photo"
              >
                <Text style={{ color: colors.textSecondary, fontSize: scale(typography.body) }}>Add a receipt photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {entry.notes ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary, fontSize: scale(typography.bodySmall) }]}>Notes</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary, fontSize: scale(typography.body) }]}>{entry.notes}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.deleteServiceBtn, { borderColor: colors.error }]}
            onPress={() => setDeleteServiceModal(true)}
          >
            <Text style={[styles.deleteServiceText, { color: colors.error }]}>Delete record</Text>
          </TouchableOpacity>
        </>
      )}

      <PickerModal
        visible={photoModal}
        title="Add photo"
        items={[
          { label: 'Take photo', onPress: handleTakePhoto },
          { label: 'Choose from library', onPress: handlePickPhoto },
        ]}
        onCancel={() => setPhotoModal(false)}
      />
      <ConfirmModal
        visible={deleteServiceModal}
        title="Delete service?"
        message={`Remove “${entry.description}” from ${formatServiceDate(entry.date)}?`}
        buttons={[
          { text: 'Cancel', style: 'cancel', onPress: () => setDeleteServiceModal(false) },
          { text: 'Delete', style: 'destructive', onPress: handleDeleteService },
        ]}
      />
      <ConfirmModal
        visible={discardModal}
        title="Discard edits?"
        message="Changes to this service record have not been saved."
        buttons={[
          { text: 'Keep editing', style: 'cancel', onPress: () => setDiscardModal(false) },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              allowLeave.current = true
              setDiscardModal(false)
              if (entry && receiptUri && receiptUri !== entry.receipt_photo_uri) {
                replaceLocalPhoto(receiptUri, entry.receipt_photo_uri)
              }
              const action = pendingLeave.current
              pendingLeave.current = null
              if (action) navigation.dispatch(action)
              else router.back()
            },
          },
        ]}
      />
      <SimpleAlert visible={requiredAlert} title="Required" message="Describe what was done." onDismiss={() => setRequiredAlert(false)} />
      <SimpleAlert visible={saveErrorAlert} title="Could not save" message="Try again." onDismiss={() => setSaveErrorAlert(false)} />
      <SimpleAlert visible={photoAlert !== null} title="Could not add photo" message={photoAlert ?? ''} onDismiss={() => setPhotoAlert(null)} />
    </ScrollView>
    </KeyboardAvoidingView>
  )
}
