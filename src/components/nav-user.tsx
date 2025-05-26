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

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // UI components for user avatar

/**
 * NavUser component for displaying the logged-in user's avatar and name in the sidebar
 */
export function NavUser() {
    const user = useAuthUser(); // Get the currently authenticated user

    if (!user) {
        return null; // If no user is logged in, render nothing
    }

    return (
        <div className="flex items-center gap-4 px-4 py-2">
            <Avatar>
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} /> {/* Show profile photo */}
                <AvatarFallback>
                    {user.displayName?.[0] || "U"} {/* Fallback to first letter of name or 'U' */}
                </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <p className="text-sm font-medium leading-none">{user.displayName || "Anonymous"}</p> {/* Show name */}
                <p className="text-xs text-muted-foreground">{user.email || "No email"}</p> {/* Show email or fallback */}
            </div>
        </div>
    );
}
