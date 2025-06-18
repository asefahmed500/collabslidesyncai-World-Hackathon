
'use server';

import { auth } from '@/lib/firebaseConfig';
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
  getUserByEmailFromMongoDB,
  updateUserTeamAndRoleInMongoDB
} from '@/lib/mongoUserService';
import { createTeamInMongoDB } from '@/lib/mongoTeamService';
import { revalidatePath } from 'next/cache';

export interface AuthResponse {
  success: boolean;
  message: string;
  userId?: string;
  user?: AppUser | null;
  requiresReauth?: boolean;
}

export async function signUpWithEmail(prevState: any, formData: FormData): Promise<AuthResponse> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const teamName = formData.get('teamName') as string;

  if (!name || !email || !password || !teamName) {
    return { success: false, message: 'All fields (Name, Email, Team Name, Password) are required.' };
  }
  if (teamName.length < 3) {
    return { success: false, message: 'Team name must be at least 3 characters.' };
  }


  try {
    const existingMongoUser = await getUserByEmailFromMongoDB(email);
    if (existingMongoUser) {
      return { success: false, message: 'This email address is already associated with an account.' };
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    await firebaseUpdateProfile(firebaseUser, { displayName: name });
    await firebaseSendEmailVerification(firebaseUser);

    // Create AppUser object shell for MongoDB, teamId and role will be set after team creation
    const initialAppUserForMongo: Partial<AppUser> = {
        name,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        profilePictureUrl: firebaseUser.photoURL,
        role: 'owner', // Will be owner of the new team
        isAppAdmin: false, // Default, can be changed manually in DB
    };

    // Create user in MongoDB first without teamId
    let appUser = await createUserInMongoDB(firebaseUser, initialAppUserForMongo);
    if (!appUser) {
      await firebaseDeleteUser(firebaseUser); // Rollback Firebase user
      return { success: false, message: 'Failed to create user profile in database. Firebase user rolled back.' };
    }

    // Create the team, with this user as owner
    const newTeam = await createTeamInMongoDB(teamName, appUser);
    if (!newTeam) {
      await firebaseDeleteUser(firebaseUser); // Rollback Firebase user
      await deleteUserFromMongoDB(appUser.id); // Rollback MongoDB user
      return { success: false, message: 'Failed to create team. User creation rolled back.' };
    }

    // Update the user in MongoDB with teamId and role 'owner'
    const updatedAppUser = await updateUserTeamAndRoleInMongoDB(appUser.id, newTeam.id, 'owner');
     if (!updatedAppUser) {
        // This is a critical failure, try to clean up
        console.error(`Failed to update user ${appUser.id} with teamId ${newTeam.id} after team creation.`);
        // Potentially rollback team creation if desired, though complex
        await firebaseDeleteUser(firebaseUser);
        await deleteUserFromMongoDB(appUser.id);
        // Team might be orphaned, or add logic to delete it too
        return { success: false, message: 'Failed to associate user with new team. Signup rolled back.' };
    }


    return {
      success: true,
      message: `Signup successful! Team "${teamName}" created. A verification email has been sent. Please check your inbox.`,
      userId: firebaseUser.uid,
      user: updatedAppUser
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
        return {
            success: false,
            message: 'Email not verified. Please check your inbox for the verification link.'
        };
    }

    const appUser = await getUserFromMongoDB(firebaseUser.uid);

    if (!appUser) {
        console.warn(`User document not found in MongoDB for UID: ${firebaseUser.uid} after login.`);
        const recoveredUser = await createUserInMongoDB(firebaseUser, {role: 'editor'}); // Attempt recovery
        if (!recoveredUser) {
          return { success: false, message: 'Login successful with Firebase, but failed to load/create user profile from database.' };
        }
        return { success: true, message: 'Login successful! User profile recovered.', userId: firebaseUser.uid, user: recoveredUser };
    }
    // Update lastActive on login
    await updateUserInMongoDB(appUser.id, { lastActive: new Date() });

    return { success: true, message: 'Login successful!', userId: firebaseUser.uid, user: appUser };
  } catch (error: any) {
    console.error('Login error:', error);
     if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-email') {
      return { success: false, message: 'Invalid email or password. Please try again.' };
    }
    return { success: false, message: error.message || 'Login failed. Please check your credentials.' };
  }
}

export async function handleSocialSignIn(firebaseUser: FirebaseUserType): Promise<AuthResponse> {
  if (!firebaseUser?.uid) {
    return { success: false, message: 'Firebase user data is missing for social sign-in.' };
  }
  try {
    let appUser = await getUserFromMongoDB(firebaseUser.uid);
    const socialProfileData: Partial<AppUser> = {
      name: firebaseUser.displayName,
      email: firebaseUser.email,
      profilePictureUrl: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
      lastActive: new Date(),
    };
    const providerId = firebaseUser.providerData[0]?.providerId;
    if (providerId === GoogleAuthProvider.PROVIDER_ID) {
        socialProfileData.googleId = firebaseUser.providerData.find(p => p.providerId === GoogleAuthProvider.PROVIDER_ID)?.uid;
    } else if (providerId === GithubAuthProvider.PROVIDER_ID) {
        socialProfileData.githubId = firebaseUser.providerData.find(p => p.providerId === GithubAuthProvider.PROVIDER_ID)?.uid;
    }

    if (!appUser) {
      // User does not exist in MongoDB, create them with a default role 'editor'
      // They won't be part of a team automatically on social sign-up unless further logic is added
      socialProfileData.role = 'editor';
      appUser = await createUserInMongoDB(firebaseUser, socialProfileData);
      if (!appUser) {
        return { success: false, message: "Failed to create user profile after social sign-in." };
      }
    } else {
      // User exists, update their profile with latest from provider and set lastActive
      appUser = await updateUserInMongoDB(appUser.id, socialProfileData);
       if (!appUser) {
        return { success: false, message: "Failed to update user profile after social sign-in." };
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
  const profilePictureUrl = formData.get('profilePictureUrl') as string;

  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return { success: false, message: 'Unauthorized to update this profile.' };
  }

  const updates: Partial<AppUser> = {};
  if (name) updates.name = name;
  if (profilePictureUrl) updates.profilePictureUrl = profilePictureUrl;

  try {
    if (name || profilePictureUrl) {
        await firebaseUpdateProfile(auth.currentUser, {
        displayName: name || auth.currentUser.displayName,
        photoURL: profilePictureUrl || auth.currentUser.photoURL,
        });
    }

    const updatedUser = await updateUserInMongoDB(userId, updates);
    revalidatePath('/dashboard/profile');
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
    const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
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

export async function setupTwoFactorAuth(userId: string): Promise<AuthResponse> {
  console.log('2FA setup action called for user:', userId);
  return { success: false, message: '2FA setup not yet implemented.' };
}

export async function deleteUserAccountServer(userId: string): Promise<AuthResponse> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return { success: false, message: 'Unauthorized.' };
  }

  try {
    // TODO: Handle team ownership transfer or team deletion if user is an owner.
    // For now, this is a simplified deletion.
    await deleteUserFromMongoDB(userId);
    await firebaseDeleteUser(auth.currentUser);
    revalidatePath('/');
    return { success: true, message: 'Account deleted successfully.' };
  } catch (error: any) {
    console.error('Error deleting account:', error);
     if (error.code === 'auth/requires-recent-login'){
        return { success: false, message: 'This operation is sensitive and requires recent authentication. Please log in again before retrying this request.', requiresReauth: true}
    }
    return { success: false, message: error.message || 'Failed to delete account.' };
  }
}
