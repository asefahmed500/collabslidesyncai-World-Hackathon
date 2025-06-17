
// This file can be expanded with more auth-related utility functions if needed.
// For now, it serves as a placeholder or for simple helper functions
// that might not fit directly into components or server actions.

import { auth } from './firebaseConfig';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User as AppUser } from '@/types'; // Your app's user type

export function mapFirebaseUserToAppUser(firebaseUser: FirebaseUser | null): AppUser | null {
  if (!firebaseUser) return null;
  
  // This is a basic mapping. You might want to fetch additional user profile data
  // from Firestore here if you store it separately (e.g., custom roles, preferences).
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email || 'Anonymous',
    email: firebaseUser.email || '',
    profilePictureUrl: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(firebaseUser.displayName || firebaseUser.email || 'A').charAt(0).toUpperCase()}`,
    // These are defaults or placeholders; fetch from your DB if needed
    role: 'editor', // Default role, adjust as per your logic
    lastActive: new Date(), 
    settings: {
      darkMode: false,
      aiFeatures: true,
      notifications: true,
    },
  };
}
