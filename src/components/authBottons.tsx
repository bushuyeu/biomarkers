'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

import { Button } from "@/components/ui/button";

export default function AuthButtons() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const router = useRouter();

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (err) {
      console.error('Sign-in error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {user ? (
        <div className="text-center">
          <p className="mb-2 text-sm text-gray-600">Signed in as {user.email}</p>
          <Button onClick={handleSignOut}>Sign out</Button>
        </div>
      ) : (
        <Button onClick={handleSignIn}>Sign in with Google</Button>
      )}
    </div>
  );
}