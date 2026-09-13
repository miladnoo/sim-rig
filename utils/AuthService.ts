import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  deleteUser,
  User,
} from 'firebase/auth'
import { auth } from './firebase'

const ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/too-many-requests': 'Too many attempts. Try again later.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Invalid email or password.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/operation-not-allowed': 'That sign-in method is not enabled yet.',
  'auth/account-exists-with-different-credential': 'This email is already used with another sign-in method.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
}

function getErrorMessage(error: any): string {
  const code = error?.code || ''
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
  const msg = typeof error?.message === 'string' ? error.message : ''
  if (msg && !msg.startsWith('Firebase:') && !msg.startsWith('[')) return msg
  return 'Something went wrong. Please try again.'
}

export async function signUp(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signIn(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export function getCurrentUser(): User | null {
  return auth.currentUser
}

export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  try {
    await deleteUser(user)
  } catch (error: any) {
    if (error?.code === 'auth/requires-recent-login') {
      throw new Error('Sign in again, then delete the account.')
    }
    throw error
  }
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

export { getErrorMessage }
