
"use client";

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import type { User as AppUser } from '@/types';
import { getUserFromMongoDB, createUserInMongoDB } from '@/lib/mongoUserService';
import { GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';


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
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setLoading(true); 
        try {
          let appUser = await getUserFromMongoDB(fbUser.uid);
          
          if (!appUser) {
            console.log(`User ${fbUser.uid} not found in MongoDB, creating profile...`);
            const providerId = fbUser.providerData[0]?.providerId;
            const socialProfileData: Partial<AppUser> = {
              name: fbUser.displayName,
              email: fbUser.email,
              profilePictureUrl: fbUser.photoURL,
              emailVerified: fbUser.emailVerified,
              role: 'guest', // Default to 'guest' if no team, actual role depends on team membership
              teamId: null, // No team by default for new social signups
            };
            if (providerId === GoogleAuthProvider.PROVIDER_ID) {
              socialProfileData.googleId = fbUser.providerData.find(p => p.providerId === GoogleAuthProvider.PROVIDER_ID)?.uid;
            } else if (providerId === GithubAuthProvider.PROVIDER_ID) {
              socialProfileData.githubId = fbUser.providerData.find(p => p.providerId === GithubAuthProvider.PROVIDER_ID)?.uid;
            }
             if (!socialProfileData.name && socialProfileData.email) {
                socialProfileData.name = socialProfileData.email.split('@')[0];
            } else if (!socialProfileData.name) {
                socialProfileData.name = 'Anonymous User';
            }
            if (!socialProfileData.profilePictureUrl) {
                socialProfileData.profilePictureUrl = `https://placehold.co/100x100.png?text=${(socialProfileData.name || 'A').charAt(0).toUpperCase()}`;
            }

            appUser = await createUserInMongoDB(fbUser, socialProfileData);
            if (!appUser) {
                 console.error("Failed to create MongoDB user profile for Firebase user:", fbUser.uid);
                 setCurrentUser(null);
            }
          }
          setCurrentUser(appUser);
        } catch (error) {
            console.error("Error fetching or creating user profile from MongoDB:", error);
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

    