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


import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import data from "./data.json"

export default function Page() {
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
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={data} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
