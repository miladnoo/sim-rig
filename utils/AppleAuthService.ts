import { Platform } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { OAuthProvider, signInWithCredential } from 'firebase/auth'
import { auth } from './firebase'

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  return AppleAuthentication.isAvailableAsync()
}

export async function signInWithApple(): Promise<boolean> {
  if (!(await isAppleSignInAvailable())) return false

  const bytes = await Crypto.getRandomBytesAsync(16)
  const rawNonce = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  )

  const apple = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  })

  if (!apple.identityToken) return false

  const provider = new OAuthProvider('apple.com')
  const credential = provider.credential({
    idToken: apple.identityToken,
    rawNonce,
  })
  await signInWithCredential(auth, credential)
  return true
}
