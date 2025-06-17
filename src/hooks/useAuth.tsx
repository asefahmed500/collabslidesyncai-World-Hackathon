
"use client";

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseConfig';
import type { User as AppUser } from '@/types';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { mapFirebaseUserToAppUser } from '@/lib/authService';

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  firebaseUser: FirebaseUser | null;
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true, firebaseUser: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setCurrentUser({
              id: user.uid,
              name: userData.name || user.displayName || 'User',
              email: userData.email || user.email || '',
              profilePictureUrl: userData.profilePictureUrl || user.photoURL || `https://placehold.co/100x100.png?text=${(userData.name || user.displayName || 'U').charAt(0).toUpperCase()}`,
              role: userData.role || 'editor',
              lastActive: userData.lastActive?.toDate() || new Date(),
              settings: userData.settings || { darkMode: false, aiFeatures: true, notifications: true },
              teamId: userData.teamId,
              isAppAdmin: userData.isAppAdmin || false, // Fetch isAppAdmin
            });
          } else {
            const basicUser = mapFirebaseUserToAppUser(user);
            setCurrentUser({...basicUser, isAppAdmin: false });
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          const basicUser = mapFirebaseUserToAppUser(user);
          setCurrentUser({...basicUser, isAppAdmin: false });
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
