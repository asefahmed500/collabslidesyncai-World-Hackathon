
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
import { createTeamInMongoDB, removeMemberFromTeamInMongoDB, logTeamActivityInMongoDB } from '@/lib/mongoTeamService'; // Added logTeamActivity
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
    const existingMongoUserByEmail = await getUserByEmailFromMongoDB(email);
    if (existingMongoUserByEmail) {
      return { success: false, message: 'This email address is already associated with an account.' };
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    await firebaseUpdateProfile(firebaseUser, { displayName: name });
    
    // Create AppUser object shell for MongoDB. TeamId and role will be set after team creation.
    const initialAppUserForMongo: Partial<AppUser> = {
        name,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        profilePictureUrl: firebaseUser.photoURL,
        role: 'guest', // Temporarily guest until team is formed
        isAppAdmin: false,
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
      await firebaseDeleteUser(firebaseUser); 
      await deleteUserFromMongoDB(appUser.id); 
      return { success: false, message: 'Failed to create team. User creation rolled back.' };
    }

    // Update the user in MongoDB with teamId and role 'owner'
    const updatedAppUserWithTeam = await updateUserTeamAndRoleInMongoDB(appUser.id, newTeam.id, 'owner');
     if (!updatedAppUserWithTeam) {
        console.error(`Failed to update user ${appUser.id} with teamId ${newTeam.id} after team creation.`);
        await firebaseDeleteUser(firebaseUser);
        await deleteUserFromMongoDB(appUser.id);
        // TODO: Consider deleting the created team if user update fails
        return { success: false, message: 'Failed to associate user with new team. Signup rolled back.' };
    }
    
    // Now send verification email
    await firebaseSendEmailVerification(firebaseUser);

    return {
      success: true,
      message: `Signup successful! Team "${teamName}" created. A verification email has been sent to ${email}. Please check your inbox.`,
      userId: firebaseUser.uid,
      user: updatedAppUserWithTeam 
    };
  } catch (error: any) {
    console.error('Signup error:', error);
    // Attempt to clean up Firebase user if MongoDB operations failed mid-way
    // This is tricky because we don't know at what stage it failed without more specific error handling
    if (auth.currentUser && auth.currentUser.email === email && error.message.includes('database')) {
       try { await firebaseDeleteUser(auth.currentUser); console.log("Rolled back Firebase user due to DB error during signup.");}
       catch (rbError) { console.error("Error rolling back Firebase user:", rbError);}
    }

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
        // Allow login, but remind them to verify. Or block, depending on desired strictness.
        // For now, allow login but show message
        // await firebaseSignOut(auth); // Optional: sign out if email not verified
        // return { success: false, message: 'Email not verified. Please check your inbox.' };
    }

    let appUser = await getUserFromMongoDB(firebaseUser.uid);
    if (!appUser) {
        console.warn(`User document not found in MongoDB for UID: ${firebaseUser.uid} after login. Recovering profile...`);
        // Attempt to recover/create profile if missing (e.g. first login after manual DB clear)
        const recoveryData: Partial<AppUser> = { 
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            profilePictureUrl: firebaseUser.photoURL,
            role: 'guest', // Default role, user might need to be re-added to a team if applicable
        };
        appUser = await createUserInMongoDB(firebaseUser, recoveryData);
        if (!appUser) {
          return { success: false, message: 'Login successful with Firebase, but failed to load/create user profile from database.' };
        }
    }
    // Update lastActive on login
    const updatedUser = await updateUserInMongoDB(appUser.id, { lastActive: new Date() });

    return { success: true, message: 'Login successful!', userId: firebaseUser.uid, user: updatedUser || appUser };
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
      // User does not exist in MongoDB, create them with a default role 'guest' as they don't have a team yet.
      socialProfileData.role = 'guest'; 
      socialProfileData.teamId = null; // Explicitly no team on initial social sign-up
      appUser = await createUserInMongoDB(firebaseUser, socialProfileData);
      if (!appUser) {
        return { success: false, message: "Failed to create user profile after social sign-in." };
      }
    } else {
      // User exists, update their profile with latest from provider and set lastActive
      // Only update if not already set or different, avoid overwriting existing data unnecessarily
      const updatesForExistingUser: Partial<AppUser> = { lastActive: new Date() };
      if (firebaseUser.displayName && firebaseUser.displayName !== appUser.name) updatesForExistingUser.name = firebaseUser.displayName;
      if (firebaseUser.photoURL && firebaseUser.photoURL !== appUser.profilePictureUrl) updatesForExistingUser.profilePictureUrl = firebaseUser.photoURL;
      if (socialProfileData.googleId && socialProfileData.googleId !== appUser.googleId) updatesForExistingUser.googleId = socialProfileData.googleId;
      if (socialProfileData.githubId && socialProfileData.githubId !== appUser.githubId) updatesForExistingUser.githubId = socialProfileData.githubId;
      
      appUser = await updateUserInMongoDB(appUser.id, updatesForExistingUser);
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
    revalidatePath('/dashboard/profile'); // Revalidate to reflect changes
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
    if (!auth.currentUser.email) {
      return { success: false, message: 'User email not found, cannot reauthenticate for password change.' };
    }
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
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
  // TODO: Implement 2FA setup logic (e.g., using Firebase Phone Auth or a third-party authenticator app)
  // This will involve generating secrets, QR codes, verifying codes, etc.
  // And updating the user's profile in MongoDB (e.g., twoFactorEnabled: true, twoFactorSecret: '...')
  return { success: false, message: '2FA setup not yet implemented.' };
}

export async function deleteUserAccountServer(userId: string): Promise<AuthResponse> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return { success: false, message: 'Unauthorized.' };
  }

  try {
    const appUser = await getUserFromMongoDB(userId);
    if (appUser && appUser.teamId && appUser.role === 'owner') {
        // More complex logic needed: transfer ownership or delete team
        // For now, just prevent deletion if owner of a team.
        // In a real scenario, you'd prompt for ownership transfer or confirm team deletion.
        return { success: false, message: 'Cannot delete account: You are the owner of a team. Please transfer ownership or delete the team first.' };
    }
    
    // If user is part of a team but not owner, remove them from team members list
    if (appUser && appUser.teamId) {
        await removeMemberFromTeamInMongoDB(appUser.teamId, userId);
        await logTeamActivityInMongoDB(appUser.teamId, 'system', 'member_removed', { memberName: appUser.name || userId, reason: 'Account Deletion' }, 'user', userId);
    }

    await deleteUserFromMongoDB(userId); // Delete from MongoDB
    await firebaseDeleteUser(auth.currentUser); // Delete from Firebase Auth
    
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

    