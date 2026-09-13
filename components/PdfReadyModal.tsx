import { useMemo, useState, useEffect } from 'react'
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { typography, spacing, borderRadius, motion } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { downloadPdf, sharePdfFile, type PreparedPdf } from '../utils/exportManager'
import AppIcon from './AppIcon'

export default function PdfReadyModal({
  pdf,
  onClose,
  onError,
}: {
  pdf: PreparedPdf | null
  onClose: () => void
  onError: (message: string) => void
}) {
  const { colors } = useTheme()
  const [busy, setBusy] = useState<'download' | 'share' | null>(null)

  useEffect(() => {
    setBusy(null)
  }, [pdf?.path])

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 320,
      backgroundColor: colors.surface,
      borderRadius: 28,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      borderCurve: 'continuous',
      boxShadow: '0px 18px 40px rgba(15,23,42,0.28)',
    },
    page: {
      width: 108,
      height: 138,
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    fold: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 22,
      height: 22,
      backgroundColor: colors.fill,
      borderBottomLeftRadius: 6,
    },
    lines: {
      width: 64,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.fill,
      marginTop: 8,
    },
    title: {
      fontWeight: '700',
      color: colors.textPrimary,
      fontSize: typography.body,
      letterSpacing: -0.2,
      textAlign: 'center',
    },
    filename: {
      marginTop: 6,
      marginBottom: spacing.md,
      color: colors.textSecondary,
      fontSize: typography.caption,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: 8,
      width: '100%',
      marginBottom: 4,
    },
    chip: {
      flex: 1,
      minHeight: 40,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderCurve: 'continuous',
    },
    download: { backgroundColor: colors.primary },
    share: { backgroundColor: colors.fill },
    chipText: { fontWeight: '600', fontSize: typography.bodySmall },
    done: {
      minHeight: 40,
      paddingHorizontal: spacing.md,
      justifyContent: 'center',
    },
    doneText: { color: colors.textMuted, fontWeight: '600', fontSize: typography.bodySmall },
  }), [colors])

  const runDownload = async () => {
    if (!pdf || busy) return
    setBusy('download')
    try {
      await downloadPdf(pdf.path, pdf.filename)
    } catch (err: any) {
      if (err?.message !== 'Save cancelled') {
        onError(typeof err?.message === 'string' ? err.message : 'Could not download the PDF.')
      }
    } finally {
      setBusy(null)
    }
  }

  const runShare = async () => {
    if (!pdf || busy) return
    setBusy('share')
    try {
      await sharePdfFile(pdf.path, pdf.filename)
    } catch (err: any) {
      onError(typeof err?.message === 'string' ? err.message : 'Could not share the PDF.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal visible={pdf !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.page} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.fold} />
            <AppIcon name="doc" color={colors.primary} size={36} decorative />
            <View style={styles.lines} />
            <View style={[styles.lines, { width: 48, opacity: 0.7 }]} />
            <View style={[styles.lines, { width: 56, opacity: 0.45 }]} />
          </View>

          <Text style={styles.title}>{pdf?.title ?? 'PDF'}</Text>
          <Text style={styles.filename} selectable numberOfLines={3}>
            {pdf?.filename ?? ''}
          </Text>

          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Download PDF"
              disabled={busy !== null}
              onPress={runDownload}
              style={({ pressed }) => [
                styles.chip,
                styles.download,
                pressed && { transform: [{ scale: motion.pressScale }] },
                busy !== null && { opacity: 0.7 },
              ]}
            >
              {busy === 'download' ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <>
                  <AppIcon name="download" color={colors.onPrimary} size={16} decorative />
                  <Text style={[styles.chipText, { color: colors.onPrimary }]}>Download</Text>
                </>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share PDF"
              disabled={busy !== null}
              onPress={runShare}
              style={({ pressed }) => [
                styles.chip,
                styles.share,
                pressed && { transform: [{ scale: motion.pressScale }] },
                busy !== null && { opacity: 0.7 },
              ]}
            >
              {busy === 'share' ? (
                <ActivityIndicator color={colors.textPrimary} size="small" />
              ) : (
                <>
                  <AppIcon name="export" color={colors.textPrimary} size={16} decorative />
                  <Text style={[styles.chipText, { color: colors.textPrimary }]}>Share</Text>
                </>
              )}
            </Pressable>
          </View>

          <Pressable style={styles.done} onPress={onClose} accessibilityRole="button" accessibilityLabel="Done">
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
