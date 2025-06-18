
import dbConnect from './mongodb';
import UserModel, { type UserDocument } from '@/models/User';
import type { User as AppUser } from '@/types'; // Your app's user type
import type { User as FirebaseUser } from 'firebase/auth';

// Helper to convert Mongoose document to your AppUser type
function mongoDocToAppUser(doc: UserDocument | null): AppUser | null {
  if (!doc) return null;
  const userObject = doc.toObject({ virtuals: true }) as any; // Use virtuals to get 'id'
  
  // Ensure 'id' field is populated from '_id'
  if (userObject._id && !userObject.id) {
    userObject.id = userObject._id.toString();
  }
  
  // Mongoose already adds _id, we ensure 'id' is the string version.
  // If _id is already a string (as we set in schema), .toString() is idempotent.
  // If it's an ObjectId, it converts.
  delete userObject.__v; // Remove Mongoose version key
  // delete userObject._id; // Optional: remove _id if 'id' is preferred exclusively

  return {
    ...userObject,
    id: userObject.id || userObject._id.toString(), // Defensive: ensure id is present
    // Ensure dates are Date objects, not strings, if they come from serialization
    lastActive: userObject.lastActive instanceof Date ? userObject.lastActive : new Date(userObject.lastActive),
    createdAt: userObject.createdAt instanceof Date ? userObject.createdAt : new Date(userObject.createdAt),
    updatedAt: userObject.updatedAt instanceof Date ? userObject.updatedAt : new Date(userObject.updatedAt),
  } as AppUser;
}


export async function createUserInMongoDB(firebaseUser: FirebaseUser, additionalData: Partial<AppUser> = {}): Promise<AppUser | null> {
  await dbConnect();
  try {
    const existingUser = await UserModel.findById(firebaseUser.uid).exec();
    if (existingUser) {
      console.warn(`User with UID ${firebaseUser.uid} already exists in MongoDB. Returning existing user.`);
      return mongoDocToAppUser(existingUser);
    }

    const newUser = new UserModel({
      _id: firebaseUser.uid, // Use Firebase UID as _id
      name: additionalData.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User',
      email: additionalData.email || firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      profilePictureUrl: additionalData.profilePictureUrl || firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(firebaseUser.displayName || firebaseUser.email || 'A').charAt(0).toUpperCase()}`,
      role: additionalData.role || 'editor', // Default role
      lastActive: new Date(),
      settings: additionalData.settings || { darkMode: false, aiFeatures: true, notifications: true },
      isAppAdmin: additionalData.isAppAdmin || false,
      googleId: firebaseUser.providerData.find(p => p.providerId === 'google.com')?.uid || additionalData.googleId || null,
      githubId: firebaseUser.providerData.find(p => p.providerId === 'github.com')?.uid || additionalData.githubId || null,
      teamId: additionalData.teamId || undefined,
      twoFactorEnabled: additionalData.twoFactorEnabled || false,
      // Spread any other passed additionalData, this allows to override if explicitly passed
      ...additionalData,
    });
    const savedUser = await newUser.save();
    return mongoDocToAppUser(savedUser);
  } catch (error: any) {
    if (error.code === 11000) { // Duplicate key error for fields other than _id (e.g. email if unique)
      console.warn(`MongoDB duplicate key error for user ${firebaseUser.uid} or email ${firebaseUser.email}. Attempting to fetch by UID.`);
      // This means _id might have been created but another unique field conflicted.
      // Or, an entirely different document has the same conflicting unique field.
      const userByUID = await getUserFromMongoDB(firebaseUser.uid);
      if (userByUID) return userByUID;
      const userByEmail = firebaseUser.email ? await getUserByEmailFromMongoDB(firebaseUser.email) : null;
      if (userByEmail) return userByEmail; // This could be problematic if UID is different.
      console.error('MongoDB duplicate key error, and could not resolve existing user:', error);
    } else {
      console.error('Error creating user in MongoDB:', error);
    }
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
    if (!email) return null; // Guard against null/undefined email
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
    // Also, remove createdAt and updatedAt if they were accidentally included
    const { id, _id, createdAt, updatedAt, ...safeUpdates } = updates;
    
    const updatePayload = { ...safeUpdates, lastActive: new Date() };

    const updatedUserDoc = await UserModel.findByIdAndUpdate(
      userId,
      updatePayload,
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

    