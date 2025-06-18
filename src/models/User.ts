
import mongoose, { Schema, Document, Model } from 'mongoose';
import type { User as UserType } from '@/types';

// This interface represents the Mongoose document structure.
// It uses Firebase UID (_id: string) as the primary key.
export interface UserDocument extends Omit<UserType, 'id' | 'lastActive' | 'createdAt' | 'updatedAt' | 'role' | '_id'>, Document {
  _id: string; // Firebase UID will be used as _id. Mongoose will not auto-generate its ObjectId.
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest'; // Ensure role has a default
  lastActive: Date;
  createdAt?: Date; // Mongoose timestamp
  updatedAt?: Date; // Mongoose timestamp
  googleId?: string | null;
  githubId?: string | null;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}

const UserSettingsSchema = new Schema({
  darkMode: { type: Boolean, default: false },
  aiFeatures: { type: Boolean, default: true },
  notifications: { type: Boolean, default: true },
}, { _id: false });

const UserSchema = new Schema<UserDocument>(
  {
    _id: { type: String, required: true }, // Explicitly define _id as String for Firebase UID
    name: { type: String, trim: true, index: true },
    email: { 
      type: String, 
      unique: true, // Emails should be unique
      lowercase: true, 
      trim: true, 
      // sparse: true ensures uniqueness constraint only applies to documents that have this field.
      // Useful if email can be null/undefined initially for some auth methods, though Firebase usually provides it.
      sparse: true 
    },
    emailVerified: { type: Boolean, default: false },
    profilePictureUrl: { type: String, trim: true },
    teamId: { type: String, index: true, sparse: true }, // For primary team reference
    role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer', 'guest'], default: 'editor' },
    lastActive: { type: Date, default: Date.now },
    settings: { type: UserSettingsSchema, default: () => ({ darkMode: false, aiFeatures: true, notifications: true }) },
    isAppAdmin: { type: Boolean, default: false },
    googleId: { type: String, sparse: true, unique: true, default: null }, // Unique if present
    githubId: { type: String, sparse: true, unique: true, default: null }, // Unique if present
    twoFactorEnabled: { type: Boolean, default: false },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    _id: false, // Important: Disable Mongoose's default ObjectId generation for _id since we use Firebase UID.
    toJSON: { 
      virtuals: true, // Ensure virtuals like 'id' are included in toJSON output
      transform: function(doc, ret) {
        ret.id = ret._id; // Map _id (Firebase UID string) to id field for consistency with AppUser type
        delete ret._id;   // Remove the original _id if 'id' is preferred
        delete ret.__v;   // Remove Mongoose version key
      }
    },
    toObject: { 
      virtuals: true, // Ensure virtuals like 'id' are included in toObject output
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      }
    },
  }
);

// Virtual 'id' getter that returns the string representation of _id (which is Firebase UID)
UserSchema.virtual('id').get(function (this: UserDocument) {
  return this._id;
});


let UserModel: Model<UserDocument>;

// Check if the model already exists to prevent OverwriteModelError in HMR scenarios
if (mongoose.models && mongoose.models.User) {
  UserModel = mongoose.models.User as Model<UserDocument>;
} else {
  UserModel = mongoose.model<UserDocument>('User', UserSchema);
}

export default UserModel;

    