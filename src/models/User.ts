
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
      sparse: true
    },
    emailVerified: { type: Boolean, default: false },
    profilePictureUrl: { type: String, trim: true },
    teamId: { type: String, index: true, sparse: true, default: null },
    role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer', 'guest'], default: 'guest' },
    lastActive: { type: Date, default: Date.now },
    settings: { type: UserSettingsSchema, default: () => ({ darkMode: false, aiFeatures: true, notifications: true }) },
    isAppAdmin: { type: Boolean, default: false },
    googleId: { type: String, sparse: true, unique: true, default: null },
    githubId: { type: String, sparse: true, unique: true, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    // No `_id: false` here, as we define `_id` as a path. Mongoose will use our path.
    // No explicit `UserSchema.virtual('id').get(...)` needed; Mongoose's default 'id' virtual will use this._id (which is a string).
    toJSON: {
      virtuals: true, // Ensure Mongoose's default 'id' virtual (this._id) is included
      transform: function(doc, ret) {
        // 'ret' now includes 'id' from the default virtual.
        // We remove the original '_id' and '__v' for cleaner output.
        delete ret._id;
        delete ret.__v;
      }
    },
    toObject: {
      virtuals: true, // Ensure Mongoose's default 'id' virtual is included
      transform: function(doc, ret) {
        delete ret._id;
        delete ret.__v;
      }
    },
  }
);

// UserModel definition remains the same
let UserModel: Model<UserDocument>;

if (mongoose.models && mongoose.models.User) {
  UserModel = mongoose.models.User as Model<UserDocument>;
} else {
  UserModel = mongoose.model<UserDocument>('User', UserSchema);
}

export default UserModel;
