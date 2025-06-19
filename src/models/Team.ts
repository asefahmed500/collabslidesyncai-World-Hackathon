
import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { Team as TeamType, TeamMember as TeamMemberType, TeamRole } from '@/types';

// TeamMember subdocument schema
export interface TeamMemberDocument extends TeamMemberType, Document {}

const TeamMemberSchema = new Schema<TeamMemberDocument>({
  // userId is the key of the Map, so not defined here as a field
  role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], required: true },
  joinedAt: { type: Date, default: Date.now },
  addedBy: { type: String, required: true }, // Firebase UID of the user who added this member
  name: { type: String, trim: true }, // Denormalized from User model
  email: { type: String, lowercase: true, trim: true }, // Denormalized
  profilePictureUrl: { type: String, trim: true }, // Denormalized
}, { _id: false }); // No _id for subdocuments if userId is the map key

// Schema for pending invitations
const PendingInvitationSchema = new Schema({
  inviteId: { type: String, required: true, unique: true }, // A unique ID for the invitation itself
  email: { type: String, required: true, lowercase: true, trim: true }, // Email of the invited user
  role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], required: true },
  invitedBy: { type: String, required: true }, // Firebase UID of the inviter
  invitedAt: { type: Date, default: Date.now },
  token: { type: String }, // Optional: for one-time use email links
}, { _id: false });


export interface TeamDocument extends Omit<TeamType, 'id' | 'members' | 'pendingInvitations' | 'createdAt' | 'lastUpdatedAt'>, Document {
  _id: Types.ObjectId;
  id?: string; // virtual getter
  ownerId: string; // Firebase UID of the owner
  members: Types.Map<TeamMemberDocument>;
  pendingInvitations?: Types.Map<typeof PendingInvitationSchema>; // Map of userId (once known) or inviteId to invitation details
  createdAt?: Date;
  lastUpdatedAt?: Date;
}

const TeamBrandingSchema = new Schema({
  logoUrl: { type: String, trim: true, default: '' },
  primaryColor: { type: String, trim: true, default: '#3F51B5' }, // Deep blue
  secondaryColor: { type: String, trim: true, default: '#E8EAF6' }, // Light blue-gray
  accentColor: { type: String, trim: true, default: '#9C27B0' }, // Vibrant purple
  fontPrimary: { type: String, trim: true, default: 'Space Grotesk' },
  fontSecondary: { type: String, trim: true, default: 'PT Sans' },
}, { _id: false });

const TeamSettingsSchema = new Schema({
  allowGuestEdits: { type: Boolean, default: false },
  aiFeaturesEnabled: { type: Boolean, default: true },
}, { _id: false });

const TeamSchema = new Schema<TeamDocument>(
  {
    name: { type: String, required: true, trim: true, index: true },
    ownerId: { type: String, required: true, index: true }, // Firebase UID
    members: {
      type: Map,
      of: TeamMemberSchema,
      default: () => new Map(),
    },
    pendingInvitations: { // Using invited User's ID as key if they exist, otherwise a unique invite ID.
      type: Map,
      of: PendingInvitationSchema,
      default: () => new Map(),
    },
    branding: { type: TeamBrandingSchema, default: () => ({ 
        primaryColor: '#3F51B5', 
        secondaryColor: '#E8EAF6', 
        accentColor: '#9C27B0', 
        fontPrimary: 'Space Grotesk', 
        fontSecondary: 'PT Sans' 
    }) },
    settings: { type: TeamSettingsSchema, default: () => ({ allowGuestEdits: false, aiFeaturesEnabled: true }) },
  },
  {
    timestamps: true, // Automatically add createdAt and lastUpdatedAt
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        delete ret._id; // Remove _id
        delete ret.__v; // Remove __v
      }
    },
    toObject: {
      virtuals: true,
      transform: function(doc, ret) {
        delete ret._id;
        delete ret.__v;
      }
    },
  }
);

TeamSchema.virtual('id').get(function (this: TeamDocument) {
  return this._id.toHexString();
});

let TeamModel: Model<TeamDocument>;
if (mongoose.models.Team) {
  TeamModel = mongoose.model<TeamDocument>('Team');
} else {
  TeamModel = mongoose.model<TeamDocument>('Team', TeamSchema);
}

export default TeamModel;
