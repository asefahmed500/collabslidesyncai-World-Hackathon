'use server';

import { auth, db } from '@/lib/firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import type { User } from '@/types';

export interface AuthResponse {
  success: boolean;
  message: string;
  userId?: string;
  user?: User | null; // For returning user data on success
}

export async function signUpWithEmail(prevState: any, formData: FormData): Promise<AuthResponse> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!name || !email || !password) {
    return { success: false, message: 'All fields are required.' };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    await updateProfile(firebaseUser, { displayName: name });
    
    // Send email verification
    // await sendEmailVerification(firebaseUser);

    // Create user document in Firestore
    const userRef = doc(db, 'users', firebaseUser.uid);
    const newUser: Partial<User> = {
      id: firebaseUser.uid,
      name: name,
      email: email,
      role: 'editor', // Default role
      lastActive: serverTimestamp() as any, // Firestore will convert this
      createdAt: serverTimestamp() as any, // Firestore will convert this
      settings: {
        darkMode: false,
        aiFeatures: true,
        notifications: true,
      },
      profilePictureUrl: `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`,
    };
    await setDoc(userRef, newUser);

    return { success: true, message: 'Signup successful! Please check your email to verify your account.' , userId: firebaseUser.uid };
  } catch (error: any) {
    console.error('Signup error:', error);
    return { success: false, message: error.message || 'Signup failed. Please try again.' };
  }
}

export async function signInWithEmail(prevState: any, formData: FormData): Promise<AuthResponse> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, message: 'Email and password are required.' };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Optional: Fetch user profile from Firestore if you store additional details
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    let appUser: User | null = null;
    if (userDoc.exists()) {
        const userData = userDoc.data();
        appUser = {
            id: firebaseUser.uid,
            name: userData.name || firebaseUser.displayName || firebaseUser.email,
            email: userData.email || firebaseUser.email,
            profilePictureUrl: userData.profilePictureUrl || firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(userData.name || firebaseUser.displayName || firebaseUser.email || 'A').charAt(0).toUpperCase()}`,
            role: userData.role || 'editor',
            lastActive: userData.lastActive?.toDate() || new Date(), // Convert Timestamp to Date
            settings: userData.settings || { darkMode: false, aiFeatures: true, notifications: true },
            teamId: userData.teamId,
        };
    } else {
        // Fallback if no Firestore doc (should ideally exist)
         appUser = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email,
            email: firebaseUser.email,
            profilePictureUrl: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(firebaseUser.displayName || firebaseUser.email || 'A').charAt(0).toUpperCase()}`,
            role: 'editor',
            lastActive: new Date(),
            settings: { darkMode: false, aiFeatures: true, notifications: true },
        };
    }


    return { success: true, message: 'Login successful!', userId: firebaseUser.uid, user: appUser };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, message: error.message || 'Login failed. Please check your credentials.' };
  }
}

export async function signOut(): Promise<AuthResponse> {
  try {
    await firebaseSignOut(auth);
    return { success: true, message: 'Signed out successfully.' };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { success: false, message: error.message || 'Sign out failed.' };
  }
}
