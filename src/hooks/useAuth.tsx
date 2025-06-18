
"use client";

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import type { User as AppUser } from '@/types';
// Removed direct imports from mongoUserService
import { getOrCreateAppUserFromMongoDB } from '@/app/(auth)/actions'; // Import the new server action
import { GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';


interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  firebaseUser: FirebaseUser | null;
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

const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true, firebaseUser: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setLoading(true);
        try {
          // Prepare minimal data for server action
          const fbUserMinimal: FirebaseUserMinimal = {
            uid: fbUser.uid,
            displayName: fbUser.displayName,
            email: fbUser.email,
            photoURL: fbUser.photoURL,
            emailVerified: fbUser.emailVerified,
            providerData: fbUser.providerData.map(pd => ({ // Ensure providerData is mapped correctly
                providerId: pd.providerId,
                uid: pd.uid // Make sure uid is included from providerData if it exists
            }))
          };
          
          // Call the server action to get or create the AppUser from MongoDB
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
