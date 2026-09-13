import { Platform } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { SymbolView, type SFSymbol } from 'expo-symbols'

export type AppIconName =
  | 'gear'
  | 'plus'
  | 'chevron'
  | 'pencil'
  | 'export'
  | 'car'
  | 'wrench'
  | 'check'
  | 'camera'
  | 'photo'
  | 'more'
  | 'trash'
  | 'search'
  | 'doc'
  | 'download'
  | 'barcode'
  | 'close'

const IOS: Record<AppIconName, SFSymbol> = {
  gear: 'gearshape',
  plus: 'plus',
  chevron: 'chevron.right',
  pencil: 'pencil',
  export: 'square.and.arrow.up',
  car: 'car.fill',
  wrench: 'wrench.fill',
  check: 'checkmark.circle.fill',
  camera: 'camera',
  photo: 'photo',
  more: 'ellipsis.circle',
  trash: 'trash',
  search: 'magnifyingglass',
  doc: 'doc.fill',
  download: 'arrow.down.to.line',
  barcode: 'barcode.viewfinder',
  close: 'xmark.circle.fill',
}

const ANDROID: Record<AppIconName, keyof typeof Ionicons.glyphMap> = {
  gear: 'settings-outline',
  plus: 'add',
  chevron: 'chevron-forward',
  pencil: 'pencil-outline',
  export: 'share-outline',
  car: 'car-sport',
  wrench: 'construct-outline',
  check: 'checkmark-circle',
  camera: 'camera-outline',
  photo: 'image-outline',
  more: 'ellipsis-horizontal-circle-outline',
  trash: 'trash-outline',
  search: 'search-outline',
  doc: 'document-text',
  download: 'download-outline',
  barcode: 'barcode-outline',
  close: 'close-circle',
}

export default function AppIcon({
  name,
  color,
  size = 22,
  decorative = false,
}: {
  name: AppIconName
  color: string
  size?: number
  decorative?: boolean
}) {
  const a11y = decorative
    ? { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const }
    : undefined

  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={IOS[name] as SFSymbol}
        tintColor={color}
        weight="medium"
        size={size}
        style={{ width: size, height: size }}
        {...a11y}
      />
    )
  }

  return <Ionicons name={ANDROID[name]} size={size} color={color} {...a11y} />
}
