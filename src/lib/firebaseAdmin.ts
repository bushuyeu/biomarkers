// Import functions to initialize and configure the Firebase Admin app
import { initializeApp, cert, getApps } from "firebase-admin/app"; // Used for app initialization and authentication

// Import Firestore functions to interact with the Firebase Firestore database
import { getFirestore } from "firebase-admin/firestore"; // Provides access to Firestore database

// Import Storage functions to interact with Firebase Cloud Storage
import { getStorage } from "firebase-admin/storage"; // Provides access to Cloud Storage

// Parse the service account credentials from the FIREBASE_SERVICE_ACCOUNT environment variable
// This variable should contain a stringified JSON object of the service account credentials
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

// Initialize the Firebase Admin app only if it hasn't been initialized already
// This check avoids duplicate initialization errors when running in server environments
if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount), // Authenticate using the service account credentials
        storageBucket: "awesome-biomarkers.appspot.com", // Set default Cloud Storage bucket for file operations
    });
}

// Export a Firestore instance with admin privileges for accessing the Firestore database
export const adminDb = getFirestore();

// Export a Cloud Storage bucket instance with admin privileges for file read/write access
export const adminBucket = getStorage().bucket();