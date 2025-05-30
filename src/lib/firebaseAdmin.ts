// src/lib/firebaseAdmin.ts
// This file sets up Firebase Admin SDK for server-side usage, including Firestore and Storage.

// Import necessary functions from the Firebase Admin SDK.
import { initializeApp, cert, getApps } from "firebase-admin/app"; // For initializing the admin app and managing credentials
import { getFirestore } from "firebase-admin/firestore"; // For accessing Firestore database
import { getStorage } from "firebase-admin/storage"; // For accessing Cloud Storage

// Parse the service account credentials from an environment variable.
// This variable should contain the JSON string of the Firebase service account.
// The exclamation mark tells TypeScript that this environment variable is always defined.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

// Initialize the Firebase Admin app only if it hasn't been initialized already.
// getApps() returns an array of initialized apps; if empty, we need to initialize.
if (!getApps().length) {
  initializeApp({
    // Provide the service account credentials for admin privileges.
    credential: cert(serviceAccount),
    // Specify the default Cloud Storage bucket name for this app.
    storageBucket: "awesome-biomarkers.appspot.com", // Replace with your bucket name if necessary.
  });
}

// Export Firestore and Storage Bucket for server-side use in the application.
// adminDb provides access to the Firestore database with admin privileges.
export const adminDb = getFirestore();
// adminBucket provides access to the default Cloud Storage bucket with admin privileges.
export const adminBucket = getStorage().bucket();