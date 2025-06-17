
'use server';

import { auth, db } from '@/lib/firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendEmailVerification,
  updateProfile,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import type { User, Team } from '@/types';
import { createTeam as apiCreateTeam } from '@/lib/firestoreService'; // To create team

export interface AuthResponse {
  success: boolean;
  message: string;
  userId?: string;
  user?: User | null;
}

export async function signUpWithEmail(prevState: any, formData: FormData): Promise<AuthResponse> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const teamName = formData.get('teamName') as string;

  if (!name || !email || !password || !teamName) {
    return { success: false, message: 'All fields (Name, Email, Team Name, Password) are required.' };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    await updateProfile(firebaseUser, { displayName: name });
    
    // Send email verification
    await sendEmailVerification(firebaseUser);

    // Create team
    const teamId = await apiCreateTeam(teamName, firebaseUser.uid, name);

    // Create user document in Firestore
    const userRef = doc(db, 'users', firebaseUser.uid);
    const newUser: User = {
      id: firebaseUser.uid,
      name: name,
      email: email,
      role: 'owner', // User who creates team is owner
      teamId: teamId,
      lastActive: serverTimestamp() as any, 
      createdAt: serverTimestamp() as any,
      settings: {
        darkMode: false,
        aiFeatures: true,
        notifications: true,
      },
      profilePictureUrl: `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`,
    };
    await setDoc(userRef, newUser, { merge: true }); // Use merge:true if user doc might pre-exist from social

    return { 
      success: true, 
      message: 'Signup successful! A verification email has been sent. Please check your inbox.', 
      userId: firebaseUser.uid 
    };
  } catch (error: any) {
    console.error('Signup error:', error);
    // Provide more specific error messages
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, message: 'This email address is already in use. Please try another.' };
    }
    if (error.code === 'auth/weak-password') {
      return { success: false, message: 'The password is too weak. Please choose a stronger password.' };
    }
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

    if (!firebaseUser.emailVerified) {
        // Option: Resend verification email or just inform
        // await sendEmailVerification(firebaseUser); 
        return { 
            success: false, 
            message: 'Email not verified. Please check your inbox for the verification link. If you need a new link, try signing up again or use password reset to confirm ownership.' // Simplified message for now
        };
    }

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
            role: userData.role || 'editor', // Default if somehow role not set
            lastActive: userData.lastActive?.toDate() || new Date(),
            settings: userData.settings || { darkMode: false, aiFeatures: true, notifications: true },
            teamId: userData.teamId,
        };
    } else {
         appUser = { // Fallback, though user doc should exist after signup
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
     if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      return { success: false, message: 'Invalid email or password. Please try again.' };
    }
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

export async function sendPasswordResetEmail(prevState: any, formData: FormData): Promise<AuthResponse> {
  const email = formData.get('email') as string;
  if (!email) {
    return { success: false, message: 'Email address is required.' };
  }

  try {
    await firebaseSendPasswordResetEmail(auth, email);
    return { success: true, message: 'Password reset email sent! Check your inbox.' };
  } catch (error: any) {
    console.error('Password reset error:', error);
    if (error.code === 'auth/user-not-found') {
      return { success: false, message: 'No user found with this email address.' };
    }
    return { success: false, message: error.message || 'Failed to send password reset email.' };
  }
}

// Placeholder for social logins - to be implemented
// export async function signInWithGoogle(): Promise<AuthResponse> { ... }
// export async function signInWithMicrosoft(): Promise<AuthResponse> { ... }
