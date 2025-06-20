
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
  EmailAuthProvider,
  type User as FirebaseUserType 
} from 'firebase/auth';
import type { User as AppUser } from '@/types';
import {
  createUserInMongoDB,
  getUserFromMongoDB,
  updateUserInMongoDB,
  deleteUserFromMongoDB,
  getUserByEmailFromMongoDB,
  updateUserTeamAndRoleInMongoDB
} from '@/lib/mongoUserService';
import { createTeamInMongoDB, removeMemberFromTeamInMongoDB, logTeamActivityInMongoDB } from '@/lib/mongoTeamService';
import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/mongodb'; // Added for direct DB operations in server action

export interface AuthResponse {
  success: boolean;
  message: string;
  userId?: string;
  user?: AppUser | null;
  requiresReauth?: boolean;
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
    
    const initialAppUserForMongo: Partial<AppUser> = {
        name,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        profilePictureUrl: firebaseUser.photoURL,
        role: 'guest', 
        isAppAdmin: false,
    };

    let appUser = await createUserInMongoDB(firebaseUser, initialAppUserForMongo);
    if (!appUser) {
      await firebaseDeleteUser(firebaseUser); 
      return { success: false, message: 'Failed to create user profile in database. Firebase user rolled back.' };
    }

    const newTeam = await createTeamInMongoDB(teamName, appUser);
    if (!newTeam) {
      await firebaseDeleteUser(firebaseUser); 
      await deleteUserFromMongoDB(appUser.id); 
      return { success: false, message: 'Failed to create team. User creation rolled back.' };
    }

    const updatedAppUserWithTeam = await updateUserTeamAndRoleInMongoDB(appUser.id, newTeam.id, 'owner');
     if (!updatedAppUserWithTeam) {
        console.error(`Failed to update user ${appUser.id} with teamId ${newTeam.id} after team creation.`);
        await firebaseDeleteUser(firebaseUser);
        await deleteUserFromMongoDB(appUser.id);
        return { success: false, message: 'Failed to associate user with new team. Signup rolled back.' };
    }
    
    await firebaseSendEmailVerification(firebaseUser);

    return {
      success: true,
      message: `Signup successful! Team "${teamName}" created. A verification email has been sent to ${email}. Please check your inbox.`,
      userId: firebaseUser.uid,
      user: updatedAppUserWithTeam 
    };
  } catch (error: any) {
    console.error('Signup error:', error);
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
    
    let appUser = await getUserFromMongoDB(firebaseUser.uid);
    if (!appUser) {
        console.warn(`User document not found in MongoDB for UID: ${firebaseUser.uid} after login. Attempting to create profile.`);
        const recoveryData: Partial<AppUser> = { 
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            profilePictureUrl: firebaseUser.photoURL,
            role: 'guest', 
        };
        appUser = await createUserInMongoDB(firebaseUser, recoveryData); 
        if (!appUser) {
          return { success: false, message: 'Login successful with Firebase, but failed to load/create user profile from database.' };
        }
    }
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

export async function handleSocialSignIn(firebaseUserAuthType: FirebaseUserType): Promise<AuthResponse> {
  if (!firebaseUserAuthType?.uid) {
    return { success: false, message: 'Firebase user data is missing for social sign-in.' };
  }
  try {
    const appUser = await getOrCreateAppUserFromMongoDB({
        uid: firebaseUserAuthType.uid,
        displayName: firebaseUserAuthType.displayName,
        email: firebaseUserAuthType.email,
        photoURL: firebaseUserAuthType.photoURL,
        emailVerified: firebaseUserAuthType.emailVerified,
        providerData: firebaseUserAuthType.providerData.map(pd => ({ providerId: pd.providerId, uid: pd.uid }))
    });

    if (!appUser) {
      return { success: false, message: "Failed to process user profile after social sign-in." };
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
  } catch (error: any)
{
    console.error('Password reset error:', error);
    if (error.code === 'auth/user-not-found') {
      return { success: false, message: 'No user found with this email address.' };
    }
    return { success: false, message: error.message || 'Failed to send password reset email.' };
  }
}

export async function updateUserProfileServer(userId: string, formData: FormData): Promise<AuthResponse> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return { success: false, message: 'Unauthorized to update this profile.' };
  }

  const name = formData.get('name') as string;
  const profilePictureUrl = formData.get('profilePictureUrl') as string;
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
  return { success: false, message: '2FA setup not yet implemented.' };
}

export async function deleteUserAccountServer(userId: string): Promise<AuthResponse> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return { success: false, message: 'Unauthorized.' };
  }

  try {
    const appUser = await getUserFromMongoDB(userId);
    if (appUser && appUser.teamId && appUser.role === 'owner') {
        return { success: false, message: 'Cannot delete account: You are the owner of a team. Please transfer ownership or delete the team first.' };
    }
    
    if (appUser && appUser.teamId) {
        await removeMemberFromTeamInMongoDB(appUser.teamId, userId); // Removed actorId, should be handled by service if needed
        await logTeamActivityInMongoDB(appUser.teamId, 'system', 'member_removed', { memberName: appUser.name || userId, reason: 'Account Deletion' }, 'user', userId);
    }

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

export async function getOrCreateAppUserFromMongoDB(fbUserMinimal: FirebaseUserMinimal): Promise<AppUser | null> {
  if (!fbUserMinimal?.uid) {
    console.error("getOrCreateAppUserFromMongoDB called with invalid fbUserMinimal (missing UID)");
    return null;
  }

  await dbConnect(); // Ensure DB connection
  let appUser = await getUserFromMongoDB(fbUserMinimal.uid);

  if (!appUser) {
    console.log(`User ${fbUserMinimal.uid} not found in MongoDB, creating profile...`);
    // Construct a FirebaseUser-like object for createUserInMongoDB
    const firebaseUserForCreate: Partial<FirebaseUserType> & { uid: string, providerData: any[] } = {
      uid: fbUserMinimal.uid,
      displayName: fbUserMinimal.displayName,
      email: fbUserMinimal.email,
      photoURL: fbUserMinimal.photoURL,
      emailVerified: fbUserMinimal.emailVerified,
      providerData: fbUserMinimal.providerData,
    };

    const additionalData: Partial<AppUser> = {
        name: fbUserMinimal.displayName,
        email: fbUserMinimal.email,
        profilePictureUrl: fbUserMinimal.photoURL,
        emailVerified: fbUserMinimal.emailVerified,
        role: 'guest', // Default for users not yet in a team (social sign-up)
        isAppAdmin: false, // Default platform role is standard user
        teamId: null, // Social sign-in users start without a team
    };
    
    const googleProvider = fbUserMinimal.providerData.find(p => p.providerId === GoogleAuthProvider.PROVIDER_ID);
    if (googleProvider?.uid) additionalData.googleId = googleProvider.uid;
    
    const githubProvider = fbUserMinimal.providerData.find(p => p.providerId === GithubAuthProvider.PROVIDER_ID);
    if (githubProvider?.uid) additionalData.githubId = githubProvider.uid;
    
    appUser = await createUserInMongoDB(firebaseUserForCreate as FirebaseUserType, additionalData);
  } else {
    console.log(`User ${fbUserMinimal.uid} found in MongoDB. Checking for updates...`);
    const updatesForExistingUser: Partial<AppUser> = { lastActive: new Date() };

    if (fbUserMinimal.displayName && fbUserMinimal.displayName !== appUser.name) {
        updatesForExistingUser.name = fbUserMinimal.displayName;
    }
    if (fbUserMinimal.email && (fbUserMinimal.email !== appUser.email || fbUserMinimal.emailVerified !== appUser.emailVerified)) {
        updatesForExistingUser.email = fbUserMinimal.email;
        updatesForExistingUser.emailVerified = fbUserMinimal.emailVerified; // Sync verification status
    } else if (fbUserMinimal.emailVerified !== appUser.emailVerified) { // Sync if only verification status changed
        updatesForExistingUser.emailVerified = fbUserMinimal.emailVerified;
    }
    if (fbUserMinimal.photoURL && fbUserMinimal.photoURL !== appUser.profilePictureUrl) {
        updatesForExistingUser.profilePictureUrl = fbUserMinimal.photoURL;
    }

    const googleProvider = fbUserMinimal.providerData.find(p => p.providerId === GoogleAuthProvider.PROVIDER_ID);
    if (googleProvider?.uid && googleProvider.uid !== appUser.googleId) {
      updatesForExistingUser.googleId = googleProvider.uid;
    }
    
    const githubProvider = fbUserMinimal.providerData.find(p => p.providerId === GithubAuthProvider.PROVIDER_ID);
    if (githubProvider?.uid && githubProvider.uid !== appUser.githubId) {
      updatesForExistingUser.githubId = githubProvider.uid;
    }

    if (Object.keys(updatesForExistingUser).length > 1) { 
        console.log(`Updating existing user ${appUser.id} with data:`, updatesForExistingUser);
        appUser = await updateUserInMongoDB(appUser.id, updatesForExistingUser);
    } else if (updatesForExistingUser.lastActive) { 
        appUser = await updateUserInMongoDB(appUser.id, { lastActive: updatesForExistingUser.lastActive });
    }
  }
  return appUser;
}
