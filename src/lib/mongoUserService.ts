
import dbConnect from './mongodb';
import UserModel, { type UserDocument } from '@/models/User';
import type { User as AppUser } from '@/types'; // Your app's user type
import type { User as FirebaseUser } from 'firebase/auth';

// Helper to convert Mongoose document to your AppUser type
function mongoDocToAppUser(doc: UserDocument | null): AppUser | null {
  if (!doc) return null;
  const userObject = doc.toObject({ virtuals: true }) as any;
  return {
    ...userObject,
    id: userObject._id.toString(), // Ensure id is string from _id
    lastActive: userObject.lastActive instanceof Date ? userObject.lastActive : new Date(userObject.lastActive),
    createdAt: userObject.createdAt instanceof Date ? userObject.createdAt : new Date(userObject.createdAt),
    updatedAt: userObject.updatedAt instanceof Date ? userObject.updatedAt : new Date(userObject.updatedAt),
  } as AppUser;
}


export async function createUserInMongoDB(firebaseUser: FirebaseUser, additionalData: Partial<AppUser> = {}): Promise<AppUser | null> {
  await dbConnect();
  try {
    const newUser = new UserModel({
      _id: firebaseUser.uid, // Use Firebase UID as _id
      name: firebaseUser.displayName || additionalData.name || firebaseUser.email?.split('@')[0] || 'Anonymous',
      email: firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      profilePictureUrl: firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(firebaseUser.displayName || firebaseUser.email || 'A').charAt(0).toUpperCase()}`,
      role: additionalData.role || 'editor', // Default role
      lastActive: new Date(),
      settings: additionalData.settings || { darkMode: false, aiFeatures: true, notifications: true },
      isAppAdmin: additionalData.isAppAdmin || false,
      googleId: firebaseUser.providerData.find(p => p.providerId === 'google.com')?.uid || null,
      githubId: firebaseUser.providerData.find(p => p.providerId === 'github.com')?.uid || null,
      ...additionalData, // Allow overriding defaults
    });
    const savedUser = await newUser.save();
    return mongoDocToAppUser(savedUser);
  } catch (error: any) {
    if (error.code === 11000) { // Duplicate key error
      console.warn(`User with UID ${firebaseUser.uid} or email ${firebaseUser.email} likely already exists. Attempting to fetch.`);
      return getUserFromMongoDB(firebaseUser.uid);
    }
    console.error('Error creating user in MongoDB:', error);
    throw error; // Re-throw to be caught by calling action
  }
}

export async function getUserFromMongoDB(userId: string): Promise<AppUser | null> {
  await dbConnect();
  try {
    const userDoc = await UserModel.findById(userId).exec();
    return mongoDocToAppUser(userDoc);
  } catch (error) {
    console.error('Error fetching user from MongoDB:', error);
    return null;
  }
}

export async function getUserByEmailFromMongoDB(email: string): Promise<AppUser | null> {
  await dbConnect();
  try {
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
    // Ensure not to update _id or id directly via updates object
    const { id, _id, ...safeUpdates } = updates;
    
    const updatedUserDoc = await UserModel.findByIdAndUpdate(
      userId,
      { ...safeUpdates, lastActive: new Date() },
      { new: true, runValidators: true }
    ).exec();
    return mongoDocToAppUser(updatedUserDoc);
  } catch (error) {
    console.error('Error updating user in MongoDB:', error);
    throw error;
  }
}

export async function deleteUserFromMongoDB(userId: string): Promise<boolean> {
  await dbConnect();
  try {
    const result = await UserModel.findByIdAndDelete(userId).exec();
    return !!result;
  } catch (error) {
    console.error('Error deleting user from MongoDB:', error);
    throw error;
  }
}
