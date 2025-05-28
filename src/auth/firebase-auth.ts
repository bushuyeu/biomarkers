import * as Sentry from "@sentry/nextjs";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Google login
export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    Sentry.captureException(e);
    throw e;
  }
};

// Logout
export const logout = async () => {
  try {
    return await signOut(auth);
  } catch (e) {
    Sentry.captureException(e);
    throw e;
  }
};
