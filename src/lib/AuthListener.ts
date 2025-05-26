'use client';

import { useEffect, useState } from 'react'; // React hooks
import { onAuthStateChanged, User } from 'firebase/auth'; // Firebase Auth types and listener
import { auth } from '@/lib/firebase'; // Firebase auth instance

/**
 * A simple hook that tracks the currently authenticated user
 */
export function useAuthUser(): User | null {
    const [user, setUser] = useState<User | null>(null); // Track user state

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser); // Set the user on login or null on logout
        });

        return () => unsubscribe(); // Clean up listener on unmount
    }, []);

    return user; // Return the current user object or null
}