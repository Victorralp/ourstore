import * as firebaseAdmin from 'firebase-admin';

// Mark this file as server-only to prevent client-side importing
export const runtime = 'nodejs';

// Initialize Firebase Admin for server-side operations
export const getFirebaseAdminApp = () => {
  if (!firebaseAdmin.apps.length) {
    return firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 
                     `firebase-adminsdk-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.split('-')[1]}.iam.gserviceaccount.com`,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY ? 
                    process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n') : 
                    undefined,
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  }
  return firebaseAdmin.app();
};

// Whether the service account credentials needed for trusted server-side reads
// and writes (such as confirming payments) are set
export const isFirebaseAdminConfigured = () =>
  !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
  !!process.env.FIREBASE_ADMIN_PRIVATE_KEY

// Firestore with admin privileges; bypasses security rules, so server-side only
export const adminDb = () => firebaseAdmin.firestore(getFirebaseAdminApp())

// Export Firebase Admin auth for server-side auth functions
export const auth = () => {
  const app = getFirebaseAdminApp();
  return firebaseAdmin.auth(app);
};

/**
 * Verify Firebase auth token for protected API routes
 * @param token Firebase ID token
 * @returns User record if token is valid, null otherwise
 */
export const verifyAuth = async (token: string) => {
  try {
    const decodedToken = await auth().verifyIdToken(token);
    if (!decodedToken) return null;
    
    // Optionally fetch more user data
    const userRecord = await auth().getUser(decodedToken.uid);
    return userRecord;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}; 