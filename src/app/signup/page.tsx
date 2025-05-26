// signup/page.tsx

'use client'; // Ensures this file runs on the client side in Next.js App Router

// Import core dependencies
import { useState } from 'react';
import { Button } from '@/components/ui/button'; // shadcn/ui Button component
import { useRouter } from 'next/navigation'; // Next.js router for programmatic navigation
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'; // Firebase sign-in functions
import { auth } from '@/lib/firebase'; // Firebase app instance

export default function LandingPage() { // Define the main landing page component
  const router = useRouter(); // Initialize the router
  const [loading, setLoading] = useState(false); // Track sign-in loading state

  // Handle Google Sign-In flow
  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider(); // Create Google auth provider
    try {
      setLoading(true); // Activate loading state
      await signInWithPopup(auth, provider); // Sign in with Google
      router.push('/dashboard'); // Redirect to dashboard
    } catch (err) {
      console.error('Sign-in error:', err); // Log any error
    } finally {
      setLoading(false); // Always turn off loading
    }
  };

  return (
    <div className="relative min-h-screen w-full flex-col items-center justify-center md:grid lg:grid-cols-2">
      {/* Left panel with branding and testimonial */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-zinc-900" /> {/* Background color overlay */}
        
        {/* App logo and name */}
        <div className="relative z-20 flex items-center text-lg font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="mr-2 h-6 w-6">
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          Biomarkers
        </div>

        {/* Testimonial content at bottom of panel */}
        <div className="relative z-20 mt-auto">
            <h2 className="text-2xl font-semibold tracking-tight">Upload your lab tests, track your health, and see trends over time</h2>
        </div>
      </div>

      {/* Right panel with sign-in UI */}
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          
          {/* Headings */}
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to your account</h1>
            <p className="text-sm text-muted-foreground">Use Google to get started</p>
          </div>

          {/* Sign-in button */}
          <Button onClick={handleSignIn} className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in with Google'}
          </Button>

          {/* Terms and Privacy links */}
          <p className="px-8 text-center text-sm text-muted-foreground">
            By signing in, you agree to our{' '}
            <a className="underline underline-offset-4 hover:text-primary" href="/terms">Terms</a> and{' '}
            <a className="underline underline-offset-4 hover:text-primary" href="/privacy">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}