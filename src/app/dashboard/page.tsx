'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/');
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {user && (
        <>
          <p className="mb-2 text-sm text-gray-600">Welcome back, {user.email}</p>
          <Button onClick={handleSignOut}>Sign out</Button>
        </>
      )}
    </div>
  );
}