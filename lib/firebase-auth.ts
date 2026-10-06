import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth"
import { doc, setDoc, getDoc, updateDoc, connectFirestoreEmulator } from "firebase/firestore"
import { auth, db } from "./firebase"
// Don't import firebase-admin in this client-side file

// An address the user saved on their profile page
export interface SavedAddress {
  id: number
  type: string
  name: string
  address: string
  city: string
  postalCode: string
  country: string
  isDefault: boolean
}

export interface UserProfile {
  uid: string
  email: string
  name: string
  phone?: string
  address?: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  preferences?: {
    currency: string
    language: string
    notifications: boolean
  }
  savedAddresses?: SavedAddress[]
  role?: "admin" | "user" | "vendor"
  createdAt: Date
  updatedAt: Date
}

// Initialize Firebase Admin for server-side operations
// This should only be used in server components or API routes
// Moving this to a separate file to avoid client-side imports
// export const getFirebaseAdminApp = () => { ... } - REMOVED

// Authentication functions
export const signUp = async (email: string, password: string, name: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Update the user's display name
    await updateProfile(user, { displayName: name })

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      name,
      preferences: {
        currency: "GBP",
        language: "en",
        notifications: true,
      },
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(doc(db, "users", user.uid), userProfile)

    return { user, profile: userProfile }
  } catch (error: any) {
    throw new Error(error.message)
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error: any) {
    throw new Error(error.message)
  }
}

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider()
    const userCredential = await signInWithPopup(auth, provider)
    const user = userCredential.user

    // Check if user profile exists, if not create one
    const userDoc = await getDoc(doc(db, "users", user.uid))
    if (!userDoc.exists()) {
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        name: user.displayName || "User",
        preferences: {
          currency: "GBP",
          language: "en",
          notifications: true,
        },
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await setDoc(doc(db, "users", user.uid), userProfile)
    }

    return user
  } catch (error: any) {
    throw new Error(error.message)
  }
}

export const logOut = async () => {
  try {
    await signOut(auth)
  } catch (error: any) {
    throw new Error(error.message)
  }
}

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error: any) {
    throw new Error(error.message)
  }
}

export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    const user = auth.currentUser
    if (!user || !user.email) throw new Error("No authenticated user")

    // Re-authenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)

    // Update password
    await updatePassword(user, newPassword)
  } catch (error: any) {
    throw new Error(error.message)
  }
}

// User profile functions
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    console.log(`firebase-auth: Starting profile fetch for user ${uid}`)
    const startTime = Date.now()
    
    const userDoc = await getDoc(doc(db, "users", uid))
    const fetchTime = Date.now() - startTime
    
    console.log(`firebase-auth: Profile fetch completed in ${fetchTime}ms for user ${uid}`)
    
    if (userDoc.exists()) {
      const data = userDoc.data() as UserProfile
      console.log(`firebase-auth: Profile found for user ${uid}, role: ${data.role || 'undefined'}`)
      // Older documents may lack the uid field; callers rely on it to match the profile to the user
      return { ...data, uid }
    } else {
      console.warn(`firebase-auth: No profile document found for user ${uid}`)
      return null
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error'
    const errorCode = error?.code || 'unknown'
    
    console.error(`firebase-auth: Error getting user profile for ${uid}:`, {
      message: errorMessage,
      code: errorCode,
      name: error?.name,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n') // First 3 lines of stack
    })
    
    // Re-throw with more context
    throw new Error(`Failed to fetch user profile: ${errorMessage} (${errorCode})`)
  }
}

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
  // Roles are never changed from the client
  const safeUpdates = { ...updates }
  delete safeUpdates.role
  delete safeUpdates.uid

  try {
    await updateDoc(doc(db, "users", uid), {
      ...safeUpdates,
      updatedAt: new Date(),
    })
  } catch (error: any) {
    throw new Error(error.message)
  }
}

// Firebase connectivity and health check functions
export const checkFirebaseConnectivity = async (): Promise<{ connected: boolean; latency?: number; error?: string }> => {
  try {
    console.log('firebase-auth: Testing Firebase connectivity...')
    const startTime = Date.now()
    
    // Try to read a small test document
    const testDoc = await getDoc(doc(db, '_health', 'test'))
    const latency = Date.now() - startTime
    
    console.log(`firebase-auth: Firebase connectivity test completed in ${latency}ms`)
    return { connected: true, latency }
  } catch (error: any) {
    console.error('firebase-auth: Firebase connectivity test failed:', error)
    return { 
      connected: false, 
      error: `${error.code || 'unknown'}: ${error.message || 'Unknown error'}` 
    }
  }
}

export const diagnoseProfileFetchIssue = async (uid: string) => {
  console.log(`firebase-auth: Diagnosing profile fetch issue for user ${uid}`)
  
  // Check Firebase connectivity
  const connectivity = await checkFirebaseConnectivity()
  console.log('firebase-auth: Connectivity test result:', connectivity)
  
  if (!connectivity.connected) {
    return {
      issue: 'Firebase connectivity problem',
      details: connectivity.error,
      recommendations: [
        'Check internet connection',
        'Verify Firebase configuration',
        'Check Firebase console for service status'
      ]
    }
  }
  
  if (connectivity.latency && connectivity.latency > 5000) {
    return {
      issue: 'High network latency',
      details: `Firebase responded in ${connectivity.latency}ms`,
      recommendations: [
        'Check internet connection speed',
        'Consider using a different network',
        'Try again later if this is temporary'
      ]
    }
  }
  
  // Try to check if user document exists
  try {
    const userRef = doc(db, 'users', uid)
    const userDoc = await getDoc(userRef)
    
    if (!userDoc.exists()) {
      return {
        issue: 'User profile does not exist',
        details: `No document found at users/${uid}`,
        recommendations: [
          'Check if user registration completed successfully',
          'Verify user UID is correct',
          'Consider creating a new profile'
        ]
      }
    }
    
    return {
      issue: 'Unknown',
      details: 'User document exists and Firebase is responsive',
      recommendations: [
        'This might be a temporary issue',
        'Try refreshing the page',
        'Check browser console for additional errors'
      ]
    }
  } catch (error: any) {
    return {
      issue: 'Firestore access error',
      details: `${error.code}: ${error.message}`,
      recommendations: [
        'Check Firestore security rules',
        'Verify user authentication',
        'Check Firebase project permissions'
      ]
    }
  }
}
