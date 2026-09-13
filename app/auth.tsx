import { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography, spacing, borderRadius } from '../theme'
import { useTheme } from '../utils/ThemeContext'
import { useLargeText } from '../utils/LargeTextContext'
import { useAuth } from '../utils/AuthContext'
import { signInWithGoogle } from '../utils/GoogleAuthService'
import { isAppleSignInAvailable, signInWithApple } from '../utils/AppleAuthService'
import * as AppleAuthentication from 'expo-apple-authentication'
import SimpleAlert from '../components/SimpleAlert'

const GoogleNative = (() => {
  if (Platform.OS === 'web') return null
  try {
    return require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin')
  } catch {
    return null
  }
})()

type AuthMode = 'signIn' | 'signUp' | 'resetPassword'

export default function AuthScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const { scale } = useLargeText()
  const { signIn, signUp, resetPassword, getErrorMessage } = useAuth()

  const [mode, setMode] = useState<AuthMode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appleReady, setAppleReady] = useState(false)
  const [resetAlert, setResetAlert] = useState(false)

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleReady)
  }, [])

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: 48 + insets.bottom },
    title: { fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
    subtitle: { color: colors.textSecondary, marginBottom: spacing.lg },
    label: { fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.md },
    input: { backgroundColor: colors.surface, borderRadius: borderRadius.sm, padding: spacing.md, minHeight: 48, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderCurve: 'continuous' },
    errorText: { color: colors.error, fontSize: typography.bodySmall, marginTop: spacing.sm },
    primaryBtn: { backgroundColor: colors.primary, borderRadius: 999, padding: spacing.md, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg, borderCurve: 'continuous' },
    primaryBtnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 19 },
    linkBtn: { padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
    linkText: { color: colors.primary, fontWeight: '600' },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { marginHorizontal: spacing.md, color: colors.textMuted, fontSize: typography.bodySmall },
    googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginTop: spacing.sm, borderCurve: 'continuous' },
    googleNative: { width: '100%', height: 52, marginTop: spacing.sm },
    googleText: { fontWeight: '600', color: colors.textPrimary },
    appleBtn: { width: '100%', height: 52, marginBottom: spacing.sm },
  }), [colors, insets.bottom])

  const handleSubmit = async () => {
    if (loading) return
    setError('')

    if (!email.trim()) { setError('Please enter your email.'); return }
    if (mode === 'signUp' && password.length < 6) { setError('Password should be at least 6 characters.'); return }
    if (mode === 'signUp' && password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (mode !== 'resetPassword' && !password) { setError('Please enter your password.'); return }

    setLoading(true)
    try {
      if (mode === 'signUp') {
        await signUp(email.trim(), password)
        router.back()
      } else if (mode === 'signIn') {
        await signIn(email.trim(), password)
        router.back()
      } else {
        await resetPassword(email.trim())
        setResetAlert(true)
        setMode('signIn')
      }
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const success = await signInWithGoogle()
      if (success) router.back()
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleApple = async () => {
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const success = await signInWithApple()
      if (success) router.back()
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED' || err?.code === 'ERR_CANCELED') return
      setError(getErrorMessage(err) || 'Apple sign-in did not complete.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: mode === 'signIn' ? 'Sign In' : mode === 'signUp' ? 'Create Account' : 'Reset Password' }} />
        <Text style={[styles.title, { fontSize: scale(typography.header) }]}>
          {mode === 'signIn' ? 'Sign In' : mode === 'signUp' ? 'Create Account' : 'Reset Password'}
        </Text>
        <Text style={[styles.subtitle, { fontSize: scale(typography.body) }]}>
          {mode === 'signIn'
            ? 'Optional. Sign in if you want cloud backup. The garage works offline without an account.'
            : mode === 'signUp'
              ? 'Create an account if you want cloud backup.'
              : 'Enter your email and we will send a reset link.'}
        </Text>

        {mode !== 'resetPassword' && (
          <>
            {appleReady && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={mode === 'signUp'
                  ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                  : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={isDark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={borderRadius.sm}
                style={[styles.appleBtn, loading && { opacity: 0.6 }]}
                onPress={handleApple}
                pointerEvents={loading ? 'none' : 'auto'}
              />
            )}
            {GoogleNative?.GoogleSigninButton ? (
              <GoogleNative.GoogleSigninButton
                style={styles.googleNative}
                size={GoogleNative.GoogleSigninButton.Size.Wide}
                color={isDark ? GoogleNative.GoogleSigninButton.Color.Dark : GoogleNative.GoogleSigninButton.Color.Light}
                onPress={handleGoogle}
                disabled={loading}
              />
            ) : Platform.OS !== 'web' ? (
              <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle} disabled={loading}>
              <Text style={[styles.googleText, { fontSize: scale(typography.body) }]}>
                  Continue with Google
                </Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        )}

        <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Email</Text>
        <TextInput
          style={[styles.input, { fontSize: scale(typography.body) }]}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType={mode === 'resetPassword' ? 'go' : 'next'}
          onSubmitEditing={mode === 'resetPassword' ? handleSubmit : undefined}
        />

        {mode !== 'resetPassword' && (
          <>
            <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Password</Text>
            <TextInput
              style={[styles.input, { fontSize: scale(typography.body) }]}
              placeholder="Your password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
              autoComplete={mode === 'signUp' ? 'password-new' : 'password'}
              returnKeyType={mode === 'signUp' ? 'next' : 'go'}
              onSubmitEditing={mode === 'signUp' ? undefined : handleSubmit}
            />
          </>
        )}

        {mode === 'signUp' && (
          <>
            <Text style={[styles.label, { fontSize: scale(typography.body) }]}>Confirm Password</Text>
            <TextInput
              style={[styles.input, { fontSize: scale(typography.body) }]}
              placeholder="Re-enter your password"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="password-new"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
          </>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={[styles.primaryBtnText, { fontSize: scale(typography.body) }]}>
              {mode === 'signIn' ? 'Sign In' : mode === 'signUp' ? 'Create Account' : 'Send Reset Link'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError('') }}
        >
          <Text style={[styles.linkText, { fontSize: scale(typography.body) }]}>
            {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>

        {mode === 'signIn' && (
          <TouchableOpacity style={styles.linkBtn} onPress={() => { setMode('resetPassword'); setError('') }}>
            <Text style={[styles.linkText, { fontSize: scale(typography.bodySmall) }]}>Forgot password?</Text>
          </TouchableOpacity>
        )}
        {mode === 'resetPassword' && (
          <TouchableOpacity style={styles.linkBtn} onPress={() => { setMode('signIn'); setError('') }}>
            <Text style={[styles.linkText, { fontSize: scale(typography.bodySmall) }]}>Back to sign in</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <SimpleAlert
        visible={resetAlert}
        title="Email sent"
        message="Check your inbox for a password reset link."
        onDismiss={() => setResetAlert(false)}
      />
    </KeyboardAvoidingView>
  )
}
