
import mongoose, { Schema, Document, Model } from 'mongoose';
import type { User as UserType, TeamRole } from '@/types';

export interface UserDocument extends Omit<UserType, 'id' | 'lastActive' | 'createdAt' | 'updatedAt' | '_id'>, Document {
  _id: string; // Firebase UID will be used as _id
  role: TeamRole | 'guest'; 
  lastActive: Date;
  createdAt?: Date;
  updatedAt?: Date;
  googleId?: string | null;
  githubId?: string | null;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  disabled?: boolean; 
  teamId?: string | null;

  isPremium?: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionPlan?: 'premium_monthly' | 'premium_yearly' | null;
  subscriptionStartDate?: Date | null;
  subscriptionEndDate?: Date | null;
}

const UserSettingsSchema = new Schema({
  darkMode: { type: Boolean, default: false },
  aiFeatures: { type: Boolean, default: true },
  notifications: { type: Boolean, default: true },
}, { _id: false });

const UserSchema = new Schema<UserDocument>(
  {
    _id: { type: String, required: true }, 
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
    disabled: { type: Boolean, default: false },
    googleId: { type: String, sparse: true, unique: true, default: null }, 
    githubId: { type: String, sparse: true, unique: true, default: null }, 
    twoFactorEnabled: { type: Boolean, default: false },

    isPremium: { type: Boolean, default: false },
    stripeCustomerId: { type: String, default: null, index: true, sparse: true },
    stripeSubscriptionId: { type: String, default: null, index: true, sparse: true },
    subscriptionPlan: { type: String, enum: ['premium_monthly', 'premium_yearly', null], default: null },
    subscriptionStartDate: { type: Date, default: null },
    subscriptionEndDate: { type: Date, default: null },
  },
  {
    timestamps: true, 
    toJSON: {
      virtuals: true, 
      transform: function(doc, ret) {
        // ret.id = ret._id; // Ensure 'id' virtual is included via virtuals:true
        delete ret._id; // _id is still present after toObject if not explicitly deleted by transform
        // delete ret.__v; // versionKey:false in toObject below handles this
      }
    },
    toObject: { // Ensure toObject also applies transformations
      virtuals: true, 
      versionKey: false, // Removes __v
      transform: function(doc, ret) {
        // delete ret._id; // _id is used for the virtual 'id'
      }
    },
  }
);

UserSchema.virtual('id').get(function (this: UserDocument) {
  return this._id.toString(); // Ensure it's a string
});


let UserModel: Model<UserDocument>;

if (mongoose.models && mongoose.models.User) {
  UserModel = mongoose.models.User as Model<UserDocument>;
} else {
  UserModel = mongoose.model<UserDocument>('User', UserSchema);
}

export default UserModel;
