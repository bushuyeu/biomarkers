'use client'; // Enables client-side rendering for this component in Next.js App Router

import { useEffect, useState } from 'react'; // Import React hooks for lifecycle and state
import { useRouter } from 'next/navigation'; // Import Next.js router for client-side navigation
import { auth } from '@/lib/firebase'; // Import initialized Firebase app

// Import required Firebase Auth utilities
import {
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

import { Button } from "@/components/ui/button"; // Import styled button from shadcn/ui

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null); // State to track signed-in user
  const router = useRouter(); // Get router instance for navigation

  // Check auth state on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/'); // Redirect to landing page if no user is logged in
      } else {
        setUser(currentUser); // Otherwise set the user state
      }
    });
    return () => unsubscribe(); // Clean up subscription on unmount
  }, [router]);

  // Sign out the user and redirect to landing page
  const handleSignOut = async () => {
    try {
      await signOut(auth); // Sign out with Firebase
      router.push('/'); // Navigate back to root
    } catch (err) {
      console.error('Sign-out error:', err); // Log error if any
    }
  };

  return (
    <div className="flex h-screen"> {/* Full height layout with horizontal flex */}
      
      {/* Sidebar */}
      <div className="w-64 bg-gray-100 p-4 border-r"> {/* Fixed-width left menu panel */}
        <h2 className="text-lg font-semibold mb-4">Menu</h2> {/* Sidebar heading */}
        <h2 className="text-sm text-muted-foreground mb-4">{`Logged in as ${user?.email}`}</h2>
        <ul className="space-y-2"> {/* Vertical list with spacing */}
          <li>
            <Button variant="outline" className="w-full justify-start">
              Upload File
            </Button> {/* File upload menu option */}
          </li>
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm text-gray-500 mt-8"
              onClick={handleSignOut}
            >
              Sign out
            </Button> {/* Sign-out button in sidebar */}
          </li>
        </ul>
      </div>

      {/* Main Dashboard Content */}
      <div className="flex-1 p-8"> {/* Main content area grows to fill space */}
        <h1 className="text-xl font-bold mb-4">Upload a File</h1> {/* Page heading */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg h-60 flex items-center justify-center text-gray-500">
          Drag and drop your .csv file here or click to upload.
        </div> {/* Placeholder drop zone for file uploads */}
      </div>
    </div>
  );
}