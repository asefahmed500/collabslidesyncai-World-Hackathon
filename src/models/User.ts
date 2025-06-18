
import mongoose, { Schema, Document, Model } from 'mongoose';
import type { User as UserType, TeamRole } from '@/types';

export interface UserDocument extends Omit<UserType, 'id' | 'lastActive' | 'createdAt' | 'updatedAt' | '_id'>, Document {
  _id: string; // Firebase UID will be used as _id
  role: TeamRole | 'guest'; // Role within their primary team, or 'guest' if no team
  lastActive: Date;
  createdAt?: Date;
  updatedAt?: Date;
  googleId?: string | null;
  githubId?: string | null;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  disabled?: boolean; 
  teamId?: string | null;
}

const UserSettingsSchema = new Schema({
  darkMode: { type: Boolean, default: false },
  aiFeatures: { type: Boolean, default: true },
  notifications: { type: Boolean, default: true },
}, { _id: false });

const UserSchema = new Schema<UserDocument>(
  {
    _id: { type: String, required: true }, // Firebase UID
    name: { type: String, trim: true, index: true },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true // Allows multiple null/undefined emails if not set, but unique if set
    },
    emailVerified: { type: Boolean, default: false },
    profilePictureUrl: { type: String, trim: true },
    teamId: { type: String, index: true, sparse: true, default: null },
    role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer', 'guest'], default: 'guest' },
    lastActive: { type: Date, default: Date.now },
    settings: { type: UserSettingsSchema, default: () => ({ darkMode: false, aiFeatures: true, notifications: true }) },
    isAppAdmin: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    googleId: { type: String, sparse: true, unique: true, default: null }, // Unique if present
    githubId: { type: String, sparse: true, unique: true, default: null }, // Unique if present
    twoFactorEnabled: { type: Boolean, default: false },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: {
      virtuals: true, 
      // Customize toJSON to ensure 'id' (from virtual) is present and '_id' is removed
      transform: function(doc, ret) {
        ret.id = ret._id; // Ensure 'id' virtual is included
        delete ret._id;
        delete ret.__v;
      }
    },
    toObject: {
      virtuals: true, 
      // Customize toObject similarly
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      }
    },
  }
);

// Virtual for 'id' to match Firebase UID convention (_id is already the Firebase UID)
UserSchema.virtual('id').get(function (this: UserDocument) {
  return this._id;
});


let UserModel: Model<UserDocument>;

if (mongoose.models && mongoose.models.User) {
  UserModel = mongoose.models.User as Model<UserDocument>;
} else {
  UserModel = mongoose.model<UserDocument>('User', UserSchema);
}

export default UserModel;

