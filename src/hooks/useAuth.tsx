
"use client";

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseConfig';
import type { User as AppUser } from '@/types';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { mapFirebaseUserToAppUser } from '@/lib/authService'; // Assuming you have this helper

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
        // User is signed in, now fetch their profile from Firestore
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
            });
          } else {
            // No profile yet, create a basic one or use a default
            const basicUser = mapFirebaseUserToAppUser(user);
            setCurrentUser(basicUser);
            // Consider creating a Firestore document here if it's expected
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setCurrentUser(mapFirebaseUserToAppUser(user)); // Fallback to basic mapping
          setLoading(false);
        });
        return () => unsubProfile(); // Unsubscribe from profile listener
      } else {
        // User is signed out
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe(); // Unsubscribe from auth state listener
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
