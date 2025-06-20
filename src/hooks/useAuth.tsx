
"use client";

import { useState, useEffect, useContext, createContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import type { User as AppUser } from '@/types';
import { getOrCreateAppUserFromMongoDB } from '@/app/(auth)/actions';
import { GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';


interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  firebaseUser: FirebaseUser | null;
  refreshCurrentUser: () => Promise<void>; // New function
}

// Helper type for passing minimal Firebase user data to server actions
interface FirebaseUserMinimal {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerData: { providerId: string; uid?: string | undefined }[];
}

const AuthContext = createContext<AuthContextType>({ 
    currentUser: null, 
    loading: true, 
    firebaseUser: null,
    refreshCurrentUser: async () => {}, // Default empty async function
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAndSetAppUser = useCallback(async (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      setLoading(true);
      try {
        const fbUserMinimal: FirebaseUserMinimal = {
          uid: fbUser.uid,
          displayName: fbUser.displayName,
          email: fbUser.email,
          photoURL: fbUser.photoURL,
          emailVerified: fbUser.emailVerified,
          providerData: fbUser.providerData.map(pd => ({
            providerId: pd.providerId,
            uid: pd.uid
          }))
        };
        const appUserFromMongo = await getOrCreateAppUserFromMongoDB(fbUserMinimal);
        setCurrentUser(appUserFromMongo);
      } catch (error) {
        console.error("Error fetching or creating user profile via server action:", error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentUser(null);
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUserInstance) => {
      setFirebaseUser(fbUserInstance);
      fetchAndSetAppUser(fbUserInstance);
    });
    return () => unsubscribe();
  }, [fetchAndSetAppUser]);

  const refreshCurrentUser = useCallback(async () => {
    const currentFbUser = auth.currentUser; // Get the most recent Firebase user
    if (currentFbUser) {
      await fetchAndSetAppUser(currentFbUser);
    } else {
      // If Firebase user is null (e.g., after logout), ensure app user is also null
      setCurrentUser(null);
    }
  }, [fetchAndSetAppUser]);


  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, loading, refreshCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

