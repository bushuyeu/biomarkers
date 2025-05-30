// src/lib/firebase.ts
// Import functions to initialize and configure the Firebase app on the client side
import { initializeApp, getApps } from 'firebase/app'; // Core Firebase app initialization methods

// Import Firebase Authentication methods
import { getAuth } from 'firebase/auth'; // Enables authentication (sign in, sign out, etc.)

// Import Firestore methods for reading and writing documents
import { getFirestore, setDoc, getDoc, doc } from 'firebase/firestore'; // Firestore database functions

// Import Storage methods for file uploads and access
import { getStorage } from 'firebase/storage'; // Firebase Cloud Storage for file handling

// Validate that all required Firebase environment variables are set
if (
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
  !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  !process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
  !process.env.NEXT_PUBLIC_FIREBASE_APP_ID
) {
  // Throw an error if any required environment variable is missing
  throw new Error("Missing required Firebase environment variables");
}

// Define the Firebase configuration object using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!, // Public API key
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!, // Auth domain for Firebase Auth
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!, // Firebase project ID
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!, // Cloud Storage bucket
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!, // Sender ID for FCM
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!, // App ID
};

// Initialize the Firebase app only once to avoid duplication during hot reloads
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]; // Reuse existing app if already initialized

// Export Firebase Authentication instance for client-side use
export const auth = getAuth(app); // Used for managing user sessions

// Export Firestore instance for client-side reads/writes
export const firestore = getFirestore(app); // Used to interact with Firestore database

// Export Cloud Storage instance for file uploads/downloads
export const storage = getStorage(app); // Uses bucket from firebaseConfig

// Ensure a Firestore user document exists for the signed-in user
export async function ensureUserDocument(user: { uid: string, email: string | null }) {
    // Create a reference to the Firestore document at 'users/{uid}'
    const documentRef = doc(firestore, 'users', user.uid);

    // Fetch the document snapshot to check if it already exists
    const snapshot = await getDoc(documentRef);
    
    // If the document doesn't exist, create it with default fields
    if (!snapshot.exists()) {
        await setDoc(documentRef, {
            email: user.email, // User's email address
            role: 'user', // Default role assignment
            tenantId: 'awesome-biomarkers-operator', // Static B2C tenant for all app users
            createdAt: new Date().toISOString(), // Timestamp of document creation
        });
    }
}