// Import necessary Firebase Admin modules for app, Firestore, and Storage
import * as admin from "firebase-admin";

// Import Sentry for capturing initialization errors and debugging info
import * as Sentry from "@sentry/nextjs";

import type { Bucket } from "@google-cloud/storage";

// Declare top-level variables to cache initialized instances
let adminApp: admin.app.App;
let _adminDb: admin.firestore.Firestore;
let _adminBucket: Bucket;

/**
 * Lazily initialize the Firebase Admin SDK only once.
 */
function getFirebaseAdmin() {
    // If app is already initialized, return the existing instance
    if (!adminApp) {
        try {
            // Use existing initialized app if present; otherwise initialize it
            adminApp = admin.apps.length
                ? admin.app()
                : admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        // Replace escaped newlines in the private key
                        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
                    }),
                    storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // Set default storage bucket
                });

            // Log successful initialization in Sentry for observability
            Sentry.addBreadcrumb({
                message: "Firebase Admin SDK initialized",
                category: "firebase",
                level: "info",
            });
        } catch (error) {
            // Capture any errors during initialization
            Sentry.captureException(error, {
                extra: { message: "Failed to initialize Firebase Admin SDK" },
            });
            throw error;
        }
    }

    return adminApp;
}

/**
 * Lazily return a Firestore instance.
 */
export function getAdminDb() {
    if (!_adminDb) {
        const app = getFirebaseAdmin(); // Ensure SDK is initialized
        _adminDb = admin.firestore(app); // Initialize Firestore
    }
    return _adminDb;
}

/**
 * Lazily return a Cloud Storage bucket instance.
 */
export function getAdminBucket() {
    if (!_adminBucket) {
        const app = getFirebaseAdmin(); // Ensure SDK is initialized
        _adminBucket = admin.storage(app).bucket(process.env.FIREBASE_STORAGE_BUCKET); // Initialize Storage bucket
    }
    return _adminBucket;
}