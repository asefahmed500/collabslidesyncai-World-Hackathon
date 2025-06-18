
'use server';

import { auth } from '@/lib/firebaseConfig'; // Firebase app, auth
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendEmailVerification as firebaseSendEmailVerification,
  updateProfile as firebaseUpdateProfile,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  deleteUser as firebaseDeleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import type { User as FirebaseUserType } from 'firebase/auth';
import type { User as AppUser } from '@/types';
import { 
  createUserInMongoDB, 
  getUserFromMongoDB, 
  updateUserInMongoDB,
  deleteUserFromMongoDB,
  getUserByEmailFromMongoDB
} from '@/lib/mongoUserService';
import { revalidatePath } from 'next/cache';
// TODO: Remove createTeam and getUserProfile from firestoreService if teams also move to MongoDB
// For now, team creation on signup is removed to simplify this step.
// import { createTeam, getUserProfile as getFirestoreUserProfile } from '@/lib/firestoreService'; 

export interface AuthResponse {
  success: boolean;
  message: string;
  userId?: string;
  user?: AppUser | null; // Changed from User to AppUser
  requiresReauth?: boolean;
}

export async function signUpWithEmail(prevState: any, formData: FormData): Promise<AuthResponse> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  // const teamName = formData.get('teamName') as string; // Team creation removed for now

  // if (!name || !email || !password || !teamName) {
  if (!name || !email || !password) {
    return { success: false, message: 'All fields (Name, Email, Password) are required.' };
  }

  try {
    // 1. Check if user already exists in MongoDB by email (optional, Firebase handles this for auth)
    const existingMongoUser = await getUserByEmailFromMongoDB(email);
    if (existingMongoUser) {
      return { success: false, message: 'This email address is already associated with an account.' };
    }

    // 2. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // 3. Update Firebase Auth profile (optional, but good practice)
    await firebaseUpdateProfile(firebaseUser, { displayName: name });
    
    // 4. Send email verification
    await firebaseSendEmailVerification(firebaseUser);

    // 5. Create user document in MongoDB
    const appUser = await createUserInMongoDB(firebaseUser, { name, role: 'editor' }); // Default role 'editor'
    if (!appUser) {
        // This case should ideally be handled by createUserInMongoDB's error handling
        // but as a fallback:
        await firebaseDeleteUser(firebaseUser); // Rollback Firebase user creation
        return { success: false, message: 'Failed to create user profile in database. Firebase user rolled back.' };
    }
    
    // Team creation logic removed for now. User will not be assigned to a team on signup.
    // const teamId = await createTeam(teamName, appUser); // This would need to use appUser
    // await updateUserInMongoDB(appUser.id, { teamId, role: 'owner' }); // Update user with team info

    return { 
      success: true, 
      message: 'Signup successful! A verification email has been sent. Please check your inbox.', 
      userId: firebaseUser.uid,
      user: appUser
    };
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, message: 'This email address is already in use by Firebase Auth. Please try another or login.' };
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
        // Optionally, resend verification email
        // await firebaseSendEmailVerification(firebaseUser);
        return { 
            success: false, 
            message: 'Email not verified. Please check your inbox for the verification link.'
        };
    }

    // Fetch full AppUser profile from MongoDB
    const appUser = await getUserFromMongoDB(firebaseUser.uid);

    if (!appUser) {
        // This might happen if user was created in Firebase but not in MongoDB (e.g. migration issue)
        // Or if they signed up with social and record creation failed.
        // For now, treat as error. Could create a MongoDB profile here as a fallback.
        console.warn(`User document not found in MongoDB for UID: ${firebaseUser.uid} after login.`);
        // Attempt to create user in MongoDB as a recovery step
        const recoveredUser = await createUserInMongoDB(firebaseUser);
        if (!recoveredUser) {
          return { success: false, message: 'Login successful with Firebase, but failed to load/create user profile from database.' };
        }
        return { success: true, message: 'Login successful! User profile recovered.', userId: firebaseUser.uid, user: recoveredUser };
    }

    return { success: true, message: 'Login successful!', userId: firebaseUser.uid, user: appUser };
  } catch (error: any) {
    console.error('Login error:', error);
     if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-email') {
      return { success: false, message: 'Invalid email or password. Please try again.' };
    }
    return { success: false, message: error.message || 'Login failed. Please check your credentials.' };
  }
}

// Server action to handle profile creation/update after social sign-in (called from client after Firebase SDK handles popup)
export async function handleSocialSignIn(firebaseUser: FirebaseUserType): Promise<AuthResponse> {
  if (!firebaseUser?.uid) {
    return { success: false, message: 'Firebase user data is missing for social sign-in.' };
  }
  try {
    let appUser = await getUserFromMongoDB(firebaseUser.uid);
    if (!appUser) {
      // User does not exist in MongoDB, create them
      const providerId = firebaseUser.providerData[0]?.providerId;
      const socialProfileData: Partial<AppUser> = {
        name: firebaseUser.displayName,
        email: firebaseUser.email,
        profilePictureUrl: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        role: 'editor', // Default role for new social sign-ups
      };
      if (providerId === GoogleAuthProvider.PROVIDER_ID) {
        socialProfileData.googleId = firebaseUser.providerData.find(p => p.providerId === GoogleAuthProvider.PROVIDER_ID)?.uid;
      } else if (providerId === GithubAuthProvider.PROVIDER_ID) {
        socialProfileData.githubId = firebaseUser.providerData.find(p => p.providerId === GithubAuthProvider.PROVIDER_ID)?.uid;
      }
      
      appUser = await createUserInMongoDB(firebaseUser, socialProfileData);
      if (!appUser) {
        return { success: false, message: "Failed to create user profile after social sign-in." };
      }
    } else {
      // User exists, potentially update their profile with latest from provider if changed (e.g. profile picture)
      const updates: Partial<AppUser> = { lastActive: new Date() };
      if (firebaseUser.displayName && appUser.name !== firebaseUser.displayName) {
        updates.name = firebaseUser.displayName;
      }
      if (firebaseUser.photoURL && appUser.profilePictureUrl !== firebaseUser.photoURL) {
        updates.profilePictureUrl = firebaseUser.photoURL;
      }
      if (Object.keys(updates).length > 1) { // Only update if more than just lastActive changed
        await updateUserInMongoDB(appUser.id, updates);
        appUser = {...appUser, ...updates}; // Reflect updates locally
      }
    }
    return { success: true, message: "Social sign-in successful.", userId: appUser.id, user: appUser };
  } catch (error: any) {
    console.error("Error handling social sign in on server:", error);
    return { success: false, message: error.message || "Failed to process social sign-in." };
  }
}


export async function signOut(): Promise<AuthResponse> {
  try {
    await firebaseSignOut(auth);
    // Client-side useAuth hook will clear local state
    return { success: true, message: 'Signed out successfully.' };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { success: false, message: error.message || 'Sign out failed.' };
  }
}

export async function sendPasswordReset(prevState: any, formData: FormData): Promise<AuthResponse> {
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

export async function updateUserProfileServer(userId: string, formData: FormData): Promise<AuthResponse> {
  const name = formData.get('name') as string;
  const profilePictureUrl = formData.get('profilePictureUrl') as string; // Assuming URL is provided for now

  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return { success: false, message: 'Unauthorized to update this profile.' };
  }

  const updates: Partial<AppUser> = {};
  if (name) updates.name = name;
  if (profilePictureUrl) updates.profilePictureUrl = profilePictureUrl; // In a real app, handle file upload here

  try {
    // Update Firebase Auth profile
    if (name || profilePictureUrl) {
        await firebaseUpdateProfile(auth.currentUser, {
        displayName: name || auth.currentUser.displayName,
        photoURL: profilePictureUrl || auth.currentUser.photoURL,
        });
    }

    // Update MongoDB profile
    const updatedUser = await updateUserInMongoDB(userId, updates);
    revalidatePath('/dashboard/profile'); // Revalidate if you have a profile page showing this
    return { success: true, message: 'Profile updated successfully.', user: updatedUser };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { success: false, message: error.message || 'Failed to update profile.' };
  }
}

export async function changePasswordServer(userId: string, formData: FormData): Promise<AuthResponse> {
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return { success: false, message: 'Unauthorized.' };
  }
  if (!currentPassword || !newPassword) {
    return { success: false, message: 'Current and new passwords are required.' };
  }
  if (newPassword.length < 8) {
     return { success: false, message: 'New password must be at least 8 characters.' };
  }

  try {
    // Re-authenticate user
    const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    
    // Update password
    await firebaseUpdatePassword(auth.currentUser, newPassword);
    return { success: true, message: 'Password updated successfully.' };
  } catch (error: any) {
    console.error('Error changing password:', error);
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      return { success: false, message: 'Incorrect current password.' };
    }
    if (error.code === 'auth/requires-recent-login'){
        return { success: false, message: 'This operation is sensitive and requires recent authentication. Please log in again before retrying this request.', requiresReauth: true}
    }
    return { success: false, message: error.message || 'Failed to change password.' };
  }
}

// TODO: Implement 2FA setup/verification/disable actions
export async function setupTwoFactorAuth(userId: string): Promise<AuthResponse> {
  // This would involve generating a secret, QR code, etc.
  // Placeholder for now.
  console.log('2FA setup action called for user:', userId);
  return { success: false, message: '2FA setup not yet implemented.' };
}

export async function deleteUserAccountServer(userId: string): Promise<AuthResponse> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return { success: false, message: 'Unauthorized.' };
  }
  
  // IMPORTANT: For actual account deletion, re-authentication is critical.
  // The current implementation is simplified. A real app would pass a currentPassword
  // or trigger a re-authentication flow on the client.
  // const currentPassword = formData.get('currentPassword') as string; // Example
  // if (!currentPassword) return { success: false, message: 'Password required to delete account.' };
  // try {
  //   const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
  //   await reauthenticateWithCredential(auth.currentUser, credential);
  // } catch (error: any) {
  //   return { success: false, message: 'Re-authentication failed. Cannot delete account.', requiresReauth: true };
  // }

  try {
    // Delete from MongoDB FIRST
    await deleteUserFromMongoDB(userId);
    
    // THEN Delete from Firebase Auth (this is the irreversible step for auth)
    await firebaseDeleteUser(auth.currentUser);
    
    // Revalidate relevant paths (e.g., home, admin users list if applicable)
    revalidatePath('/'); 
    return { success: true, message: 'Account deleted successfully.' };
  } catch (error: any)
   {
    console.error('Error deleting account:', error);
     if (error.code === 'auth/requires-recent-login'){
        // This error from firebaseDeleteUser means re-authentication is needed.
        // You'd typically redirect the user to log in again.
        return { success: false, message: 'This operation is sensitive and requires recent authentication. Please log in again before retrying this request.', requiresReauth: true}
    }
    // If MongoDB deletion failed but Firebase succeeded, or vice-versa, you might have an orphaned record.
    // Consider more robust transaction handling or cleanup jobs for production.
    return { success: false, message: error.message || 'Failed to delete account.' };
  }
}

    