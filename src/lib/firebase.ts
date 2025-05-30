// src/lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setDoc, getDoc, doc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

if (
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
  !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  !process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
  !process.env.NEXT_PUBLIC_FIREBASE_APP_ID
) {
  throw new Error("Missing required Firebase environment variables");
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app); // Uses bucket from firebaseConfig

export async function ensureUserDocument(user: { uid: string, email: string | null }) {
    // Construct a reference to the user's document in Firestore
    const documentRef = doc(firestore, 'users', user.uid);

    // Check if the document already exists
    const snapshot = await getDoc(documentRef);
    if (!snapshot.exists()) {
        // If it doesn't exist, create it with default fields
        await setDoc(documentRef, {
            email: user.email,
            role: 'user', // Default role for end users
            tenantId: 'awesome-biomarkers-operator', // B2C tenant ID
            createdAt: new Date().toISOString(),
        });
    }
}