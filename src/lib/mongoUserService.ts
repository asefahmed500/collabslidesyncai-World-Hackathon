
import dbConnect from './mongodb';
import UserModel, { type UserDocument } from '@/models/User';
import type { User as AppUser, TeamRole } from '@/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';

function mongoDocToAppUser(doc: UserDocument | null): AppUser | null {
  if (!doc) return null;
  // Using .toObject() with virtuals: true should handle 'id' correctly.
  const userObject = doc.toObject({ virtuals: true }) as AppUser & { _id?: any, __v?: any };
  
  // Ensure 'id' is the Firebase UID from _id
  userObject.id = doc._id; // Directly use _id as it's the Firebase UID

  delete userObject._id; // Remove MongoDB specific _id if toObject didn't map it to id correctly
  delete userObject.__v;

  // Ensure dates are Date objects
  return {
    ...userObject,
    lastActive: userObject.lastActive instanceof Date ? userObject.lastActive : new Date(userObject.lastActive),
    createdAt: userObject.createdAt instanceof Date ? userObject.createdAt : new Date(userObject.createdAt as any),
    updatedAt: userObject.updatedAt instanceof Date ? userObject.updatedAt : new Date(userObject.updatedAt as any),
  } as AppUser;
}

export async function createUserInMongoDB(firebaseUser: FirebaseUser, additionalData: Partial<AppUser> = {}): Promise<AppUser | null> {
  await dbConnect();
  try {
    const existingUser = await UserModel.findById(firebaseUser.uid).exec();
    if (existingUser) {
      const updatesToApply: Partial<AppUser> = {
        name: firebaseUser.displayName || additionalData.name || existingUser.name,
        email: firebaseUser.email || additionalData.email || existingUser.email,
        profilePictureUrl: firebaseUser.photoURL || additionalData.profilePictureUrl || existingUser.profilePictureUrl,
        emailVerified: firebaseUser.emailVerified,
        lastActive: new Date(),
        ...additionalData, 
      };
      if (firebaseUser.providerData.find(p => p.providerId === GoogleAuthProvider.PROVIDER_ID)) {
        updatesToApply.googleId = firebaseUser.providerData.find(p => p.providerId === GoogleAuthProvider.PROVIDER_ID)?.uid;
      }
      if (firebaseUser.providerData.find(p => p.providerId === GithubAuthProvider.PROVIDER_ID)) {
        updatesToApply.githubId = firebaseUser.providerData.find(p => p.providerId === GithubAuthProvider.PROVIDER_ID)?.uid;
      }

      const updatedUser = await UserModel.findByIdAndUpdate(firebaseUser.uid, updatesToApply, { new: true }).exec();
      return mongoDocToAppUser(updatedUser);
    }

    const newUser = new UserModel({
      _id: firebaseUser.uid, 
      name: additionalData.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User',
      email: additionalData.email || firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      profilePictureUrl: additionalData.profilePictureUrl || firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(additionalData.name || firebaseUser.displayName || firebaseUser.email || 'A').charAt(0).toUpperCase()}`,
      role: additionalData.role || 'guest',
      teamId: additionalData.teamId || null,
      lastActive: new Date(),
      settings: additionalData.settings || { darkMode: false, aiFeatures: true, notifications: true },
      isAppAdmin: additionalData.isAppAdmin || false,
      disabled: additionalData.disabled || false,
      googleId: firebaseUser.providerData.find(p => p.providerId === GoogleAuthProvider.PROVIDER_ID)?.uid || additionalData.googleId || null,
      githubId: firebaseUser.providerData.find(p => p.providerId === GithubAuthProvider.PROVIDER_ID)?.uid || additionalData.githubId || null,
      twoFactorEnabled: additionalData.twoFactorEnabled || false,
      // Spread additionalData last to ensure it overrides defaults if provided
      ...additionalData,
    });
    const savedUser = await newUser.save();
    return mongoDocToAppUser(savedUser);
  } catch (error: any) {
    if (error.code === 11000) { 
      console.warn(`MongoDB duplicate key error for user ${firebaseUser.uid} or email ${firebaseUser.email}. Attempting to fetch existing.`);
      const userByUID = await getUserFromMongoDB(firebaseUser.uid);
      if (userByUID) return userByUID;
      const userByEmail = firebaseUser.email ? await getUserByEmailFromMongoDB(firebaseUser.email) : null;
      if (userByEmail) return userByEmail; 
      console.error('MongoDB duplicate key error, and could not resolve existing user:', error);
    } else {
      console.error('Error creating/updating user in MongoDB:', error);
    }
    throw error; 
  }
}

export async function getUserFromMongoDB(userId: string): Promise<AppUser | null> {
  await dbConnect();
  try {
    const userDoc = await UserModel.findById(userId).exec();
    return mongoDocToAppUser(userDoc);
  } catch (error) {
    console.error('Error fetching user from MongoDB by ID:', error);
    return null;
  }
}

export async function getUserByEmailFromMongoDB(email: string): Promise<AppUser | null> {
  await dbConnect();
  try {
    if (!email) return null;
    const userDoc = await UserModel.findOne({ email }).exec();
    return mongoDocToAppUser(userDoc);
  } catch (error) {
    console.error('Error fetching user by email from MongoDB:', error);
    return null;
  }
}

export async function updateUserInMongoDB(userId: string, updates: Partial<AppUser>): Promise<AppUser | null> {
  await dbConnect();
  try {
    // Prevent changing _id, and ensure dates like createdAt/updatedAt are handled by Mongoose
    const { id, _id, createdAt, updatedAt, ...safeUpdates } = updates;
    const updatePayload = { ...safeUpdates, lastActive: new Date() };
    
    const updatedUserDoc = await UserModel.findByIdAndUpdate(
      userId, // Use Firebase UID as _id for querying
      updatePayload,
      { new: true, runValidators: true }
    ).exec();
    return mongoDocToAppUser(updatedUserDoc);
  } catch (error) {
    console.error('Error updating user in MongoDB:', error);
    throw error;
  }
}

export async function updateUserTeamAndRoleInMongoDB(userId: string, teamId: string | null, role: TeamRole | 'guest'): Promise<AppUser | null> {
  // If teamId is null, role should probably default to 'guest' or be handled as per app logic
  const effectiveRole = teamId ? role : 'guest';
  return updateUserInMongoDB(userId, { teamId, role: effectiveRole });
}


export async function deleteUserFromMongoDB(userId: string): Promise<boolean> {
  await dbConnect();
  try {
    // Before deleting user, consider if they are an owner of any teams.
    // This logic is now handled in the API route that calls this.
    const result = await UserModel.findByIdAndDelete(userId).exec();
    return !!result;
  } catch (error) {
    console.error('Error deleting user from MongoDB:', error);
    throw error;
  }
}

export async function getAllUsersFromMongoDB(): Promise<AppUser[]> {
  await dbConnect();
  try {
    const users = await UserModel.find({}).sort({ createdAt: -1 }).exec();
    return users.map(userDoc => mongoDocToAppUser(userDoc)).filter(u => u !== null) as AppUser[];
  } catch (error) {
    console.error('Error fetching all users from MongoDB:', error);
    return [];
  }
}
