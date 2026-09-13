import { Platform } from 'react-native'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { auth } from './firebase'

const WEB_CLIENT_ID = '47244320371-205bm6hlclkqu1rko53jrg3q0gn1rf1o.apps.googleusercontent.com'
const IOS_CLIENT_ID = '47244320371-26iavacqibm5i1m7qlk7jrcr6tbu5ppl.apps.googleusercontent.com'

function googleNative(): typeof import('@react-native-google-signin/google-signin') {
  return require('@react-native-google-signin/google-signin')
}

export function configureGoogleSignIn(): void {
  try {
    googleNative().GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      iosClientId: Platform.OS === 'ios' ? IOS_CLIENT_ID : undefined,
      offlineAccess: false,
    })
  } catch {}
}

export async function signInWithGoogle(): Promise<boolean> {
  let GoogleSignin: ReturnType<typeof googleNative>['GoogleSignin']
  let statusCodes: ReturnType<typeof googleNative>['statusCodes']
  let isErrorWithCode: ReturnType<typeof googleNative>['isErrorWithCode']
  let isSuccessResponse: ReturnType<typeof googleNative>['isSuccessResponse']
  try {
    const native = googleNative()
    GoogleSignin = native.GoogleSignin
    statusCodes = native.statusCodes
    isErrorWithCode = native.isErrorWithCode
    isSuccessResponse = native.isSuccessResponse
  } catch {
    throw new Error('Google Sign-In needs the Classic Garage development build, not Expo Go.')
  }

  configureGoogleSignIn()

  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    }
    const response = await GoogleSignin.signIn()

    if (!isSuccessResponse(response)) {
      return false
    }

    const idToken = response.data?.idToken
    if (!idToken) {
      throw new Error('Google did not return a sign-in token. Use the Classic Garage development build.')
    }

    const credential = GoogleAuthProvider.credential(idToken)
    await signInWithCredential(auth, credential)
    return true
  } catch (error: any) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.IN_PROGRESS:
        case statusCodes.SIGN_IN_CANCELLED:
          return false
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error('Google Play services are not available.')
        default:
          if (String(error.code) === '10') {
            throw new Error('Google Sign-In is not registered for this install. Use a Classic Garage development build.')
          }
      }
    }
    throw error
  }
}

export async function signOutFromGoogle(): Promise<void> {
  try {
    await googleNative().GoogleSignin.signOut()
  } catch {}
}
