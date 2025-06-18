
import mongoose, { Schema, Document, Model } from 'mongoose';
import type { User as UserType } from '@/types';

export interface UserDocument extends Omit<UserType, 'id' | 'lastActive' | 'createdAt' | 'updatedAt' | 'role' | '_id'>, Document {
  _id: string; // Firebase UID will be used as _id
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'guest';
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
    _id: { type: String, required: true }, // Using Firebase UID as the document _id
    name: { type: String, trim: true },
    email: { type: String, unique: true, lowercase: true, trim: true, sparse: true },
    emailVerified: { type: Boolean, default: false },
    profilePictureUrl: { type: String, trim: true },
    teamId: { type: String, index: true, sparse: true },
    role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer', 'guest'], required: true, default: 'editor' },
    lastActive: { type: Date, default: Date.now },
    settings: { type: UserSettingsSchema, default: () => ({ darkMode: false, aiFeatures: true, notifications: true }) },
    isAppAdmin: { type: Boolean, default: false },
    googleId: { type: String, sparse: true, unique: true, default: null },
    githubId: { type: String, sparse: true, unique: true, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id; // Map _id to id
        delete ret._id;
        delete ret.__v;
      }
    },
    toObject: { 
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id; // Map _id to id
        delete ret._id;
        delete ret.__v;
      }
    },
    _id: false, // Important: Disable Mongoose's default _id generation since we use Firebase UID
  }
);

UserSchema.virtual('id').get(function (this: UserDocument) {
  return this._id;
});

let UserModel: Model<UserDocument>;
if (mongoose.models.User) {
  UserModel = mongoose.model<UserDocument>('User');
} else {
  UserModel = mongoose.model<UserDocument>('User', UserSchema);
}

export default UserModel;
