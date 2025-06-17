
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
import { createTeam as apiCreateTeam, getUserProfile } from '@/lib/firestoreService'; // To create team

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

    // Create user object for creating team
    const tempUserForTeam: User = {
      id: firebaseUser.uid,
      name: name,
      email: email,
      role: 'owner', // This role is context specific to the team being created
      lastActive: serverTimestamp() as any,
      settings: { darkMode: false, aiFeatures: true, notifications: true },
      profilePictureUrl: `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`,
    };
    
    // Create team
    const teamId = await apiCreateTeam(teamName, tempUserForTeam);

    // Create user document in Firestore
    const userRef = doc(db, 'users', firebaseUser.uid);
    const newUser: User = {
      id: firebaseUser.uid,
      name: name,
      email: email,
      role: 'owner', // User who creates team is owner of that team
      teamId: teamId, // Primary team ID
      lastActive: serverTimestamp() as any, 
      createdAt: serverTimestamp() as any,
      settings: {
        darkMode: false,
        aiFeatures: true,
        notifications: true,
      },
      profilePictureUrl: `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`,
    };
    await setDoc(userRef, newUser, { merge: true });

    return { 
      success: true, 
      message: 'Signup successful! A verification email has been sent. Please check your inbox.', 
      userId: firebaseUser.uid 
    };
  } catch (error: any) {
    console.error('Signup error:', error);
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
        return { 
            success: false, 
            message: 'Email not verified. Please check your inbox for the verification link.'
        };
    }

    // Fetch full AppUser profile after successful Firebase auth
    const appUser = await getUserProfile(firebaseUser.uid);

    if (!appUser) {
        // This case should ideally not happen if signup creates the user doc
        // But handle it as a fallback
        console.warn(`User document not found for UID: ${firebaseUser.uid} after login.`);
        const fallbackAppUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email || "User",
            email: firebaseUser.email || "",
            profilePictureUrl: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(firebaseUser.displayName || firebaseUser.email || 'A').charAt(0).toUpperCase()}`,
            role: 'editor', // Default role
            lastActive: new Date(),
            settings: { darkMode: false, aiFeatures: true, notifications: true },
            // teamId might be missing here if doc wasn't found
        };
        return { success: true, message: 'Login successful! (User profile partially loaded)', userId: firebaseUser.uid, user: fallbackAppUser };
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
  } catch (error: any)
{
    console.error('Password reset error:', error);
    if (error.code === 'auth/user-not-found') {
      return { success: false, message: 'No user found with this email address.' };
    }
    return { success: false, message: error.message || 'Failed to send password reset email.' };
  }
}
