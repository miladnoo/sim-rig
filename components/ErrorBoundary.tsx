import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'

interface State {
  error: Error | null
}

/** Top-level crash net: a render error anywhere shows this screen instead of a
 *  white screen. "Try again" remounts the whole app tree (key change). */
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('App crashed:', error.message, info.componentStack?.split('\n').slice(0, 6).join('\n'))
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          The garage hit an unexpected error. Your records are safe on this phone.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Restart the app"
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
          onPress={() => this.setState({ error: null })}
        >
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { color: '#F5F5F7', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  body: { color: '#A1A1AA', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  btn: { backgroundColor: '#FF453A', borderRadius: 14, paddingHorizontal: 32, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 17 },
})
