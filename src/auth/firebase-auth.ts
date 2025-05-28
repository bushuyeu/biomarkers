import * as Sentry from "@sentry/nextjs";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Google login
export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

// Logout
export const logout = async () => {
  return await signOut(auth);
};
