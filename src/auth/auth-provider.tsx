"use client";

import { createContext, useEffect, useState, useContext } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
import * as Sentry from "@sentry/nextjs";
import { createUserIfNotExists } from "@/lib/createUserIfNotExists";

// Auth user context type
export interface AuthUserContext {
  user: User | null;
  role: string | null;
  tenantId: string | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthUserContext>({
  user: null,
  role: null,
  tenantId: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthUserContext>({
    user: null,
    role: null,
    tenantId: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await createUserIfNotExists(firebaseUser);
          const userDocRef = doc(
            firestore,
            "tenants",
            "Awesome Biomarkers Operator",
            "users",
            firebaseUser.uid
          );
          const userDocSnap = await getDoc(userDocRef);
          let role: string | null = null;
          let tenantId: string | null = null;
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            role = typeof data.role === "string" ? data.role : null;
            tenantId = typeof data.tenantId === "string" ? data.tenantId : null;
          }
          setAuthState({
            user: firebaseUser,
            role,
            tenantId,
            loading: false,
          });

          Sentry.setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || undefined,
          });

          Sentry.setContext("auth", {
            role,
            tenantId,
            displayName: firebaseUser.displayName || "",
          });
        } catch (e) {
          Sentry.captureException(e); // ✅ Send error to Sentry for observability
          setAuthState({
            user: firebaseUser,
            role: null,
            tenantId: null,
            loading: false,
          });
        }
      } else {
        setAuthState({
          user: null,
          role: null,
          tenantId: null,
          loading: false,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);