import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { typography, spacing, borderRadius } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { extractVin } from '../api/vin'
import AppIcon from './AppIcon'

const BARCODE_TYPES = [
  'code39',
  'code128',
  'code93',
  'codabar',
  'pdf417',
  'qr',
  'datamatrix',
  'aztec',
  'ean13',
  'upc_a',
  'itf14',
] as const

export default function VinScanner({
  visible,
  onClose,
  onScan,
}: {
  visible: boolean
  onClose: () => void
  onScan: (vin: string) => void
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const locked = useRef(false)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hint, setHint] = useState('Line up the VIN barcode on the dash or door sticker.')
  const [captured, setCaptured] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) {
      locked.current = false
      setHint('Line up the VIN barcode on the dash or door sticker.')
      setCaptured(null)
      if (holdTimer.current) clearTimeout(holdTimer.current)
      return
    }
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission()
    }
  }, [visible, permission, requestPermission])

  const completeScan = (vin: string) => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    onScan(vin)
    onClose()
  }

  const styles = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    frameWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    frame: {
      width: '82%',
      height: 120,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.9)',
      borderRadius: 12,
    },
    top: {
      position: 'absolute',
      top: insets.top + spacing.sm,
      left: spacing.md,
      right: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    close: {
      minHeight: 44,
      minWidth: 64,
      justifyContent: 'center',
    },
    closeText: { color: '#fff', fontWeight: '600', fontSize: typography.body },
    title: { color: '#fff', fontWeight: '700', fontSize: typography.body },
    bottom: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      bottom: insets.bottom + spacing.lg,
    },
    hint: { color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontSize: typography.body, lineHeight: 24 },
    got: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    gotTitle: { color: '#fff', fontSize: typography.header, fontWeight: '700', marginTop: spacing.md },
    gotVin: { color: 'rgba(255,255,255,0.9)', fontSize: typography.body, marginTop: spacing.sm, letterSpacing: 1.2 },
    perm: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background },
    permBtn: {
      marginTop: spacing.lg,
      minHeight: 52,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    permBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: typography.body },
  }), [colors, insets.bottom, insets.top])

  if (Platform.OS === 'web') return null

  const onBarcode = ({ data }: { data: string }) => {
    if (locked.current) return
    const vin = extractVin(data)
    if (!vin) {
      setHint('That code is not a 17-character VIN. Try the door sticker.')
      return
    }
    locked.current = true
    setCaptured(vin)
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holdTimer.current = setTimeout(() => completeScan(vin), 900)
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      {!permission ? (
        <View style={[styles.perm, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !permission.granted ? (
        <View style={styles.perm}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.title, fontWeight: '700', textAlign: 'center' }}>
            Camera is needed to scan a VIN
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.body, textAlign: 'center', marginTop: spacing.sm, lineHeight: 24 }}>
            Allow camera, then point it at the barcode on the dash or driver door sticker.
          </Text>
          <Pressable style={styles.permBtn} onPress={() => requestPermission()}>
            <Text style={styles.permBtnText}>Allow camera</Text>
          </Pressable>
          <Pressable style={[styles.permBtn, { backgroundColor: colors.fill, marginTop: spacing.sm }]} onPress={onClose}>
            <Text style={[styles.permBtnText, { color: colors.textPrimary }]}>Not now</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.root}>
          {visible ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
              onBarcodeScanned={captured ? undefined : onBarcode}
            />
          ) : null}
          <View style={styles.frameWrap} pointerEvents="none">
            <View style={styles.frame} />
          </View>
          <View style={styles.top}>
            <Pressable
              style={styles.close}
              onPress={() => (captured ? completeScan(captured) : onClose())}
              accessibilityRole="button"
              accessibilityLabel="Close scanner"
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
            <Text style={styles.title}>Scan VIN</Text>
            <View style={{ width: 64 }} />
          </View>
          <View style={styles.bottom}>
            <Text style={styles.hint}>{captured ? 'Got it' : hint}</Text>
          </View>
          {captured ? (
            <View style={styles.got} pointerEvents="none">
              <AppIcon name="check" color={colors.success} size={56} decorative />
              <Text style={styles.gotTitle}>Success</Text>
              <Text style={styles.gotVin}>{captured}</Text>
            </View>
          ) : null}
        </View>
      )}
    </Modal>
  )
}
