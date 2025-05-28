import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

// Automatically create a Firestore user document with role = "end-user" if missing
export const useAuthListener = () => {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return;

      const userDocRef = doc(firestore, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role: "end-user",
          tenantId: "biomarkers-ops",
        });
      }

      // 🪵 Log auth metadata to Sentry for visibility and debugging
      Sentry.setUser({
        id: firebaseUser.uid,
        email: firebaseUser.email || undefined,
      });

      Sentry.setContext("auth", {
        role: userDocSnap.exists() ? userDocSnap.data().role : "end-user",
        tenantId: userDocSnap.exists() ? userDocSnap.data().tenantId : "biomarkers-ops",
        displayName: firebaseUser.displayName || "",
      });
    });

    return () => unsubscribe();
  }, []);
};
