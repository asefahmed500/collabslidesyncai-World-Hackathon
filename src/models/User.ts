
import mongoose, { Schema, Document, Model } from 'mongoose';
import type { User as UserType } from '@/types'; // Using existing TypeScript type

// Interface for Mongoose Document (extends your existing UserType)
export interface UserDocument extends Omit<UserType, 'id' | 'lastActive' | 'createdAt' | 'role'>, Document {
  _id: mongoose.Types.ObjectId; // Mongoose uses _id
  id?: string; // Keep id for virtual getter
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest'; // Ensure role is one of these strings
  lastActive: Date;
  createdAt?: Date;
}

const UserSettingsSchema = new Schema({
  darkMode: { type: Boolean, default: false },
  aiFeatures: { type: Boolean, default: true },
  notifications: { type: Boolean, default: true },
}, { _id: false });

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, trim: true },
    email: { type: String, unique: true, lowercase: true, trim: true, sparse: true }, // sparse for optional unique
    profilePictureUrl: { type: String, trim: true },
    teamId: { type: String, index: true, sparse: true }, // Mongoose ObjectId could be used if Team is also a Mongoose model
    role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer', 'guest'], required: true },
    lastActive: { type: Date, default: Date.now },
    settings: { type: UserSettingsSchema, default: () => ({}) },
    isAppAdmin: { type: Boolean, default: false },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true }, // Ensure virtuals are included in toJSON
    toObject: { virtuals: true }, // Ensure virtuals are included in toObject
  }
);

// Firebase UID is often stored as the primary key in User collection,
// or you can map it to _id. Here we assume _id is the Mongoose primary key.
// If you want to query by Firebase UID and it's not _id, add an index for it.

// Virtual for 'id' to match TypeScript type if needed (maps to _id.toString())
UserSchema.virtual('id').get(function (this: UserDocument) {
  return this._id.toHexString();
});

// Check if the model already exists before compiling it
let UserModel: Model<UserDocument>;
if (mongoose.models.User) {
  UserModel = mongoose.model<UserDocument>('User');
} else {
  UserModel = mongoose.model<UserDocument>('User', UserSchema);
}

export default UserModel;
