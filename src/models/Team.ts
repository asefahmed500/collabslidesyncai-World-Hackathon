
import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { Team as TeamType, TeamMember as TeamMemberType, TeamRole } from '@/types';

export interface TeamMemberDocument extends TeamMemberType, Document {}

const TeamMemberSchema = new Schema<TeamMemberDocument>({
  role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], required: true },
  joinedAt: { type: Date, default: Date.now },
  addedBy: { type: String, required: true }, 
  name: { type: String, trim: true }, 
  email: { type: String, lowercase: true, trim: true }, 
  profilePictureUrl: { type: String, trim: true }, 
}, { _id: false }); 

const PendingInvitationSchema = new Schema({
  inviteId: { type: String, required: true, unique: true, index: true }, 
  email: { type: String, required: true, lowercase: true, trim: true }, 
  role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], required: true },
  invitedBy: { type: String, required: true }, 
  invitedAt: { type: Date, default: Date.now },
  token: { type: String }, 
}, { _id: false });


export interface TeamDocument extends Omit<TeamType, 'id' | 'members' | 'pendingInvitations' | 'createdAt' | 'lastUpdatedAt'>, Document {
  _id: Types.ObjectId;
  id?: string; 
  ownerId: string; 
  members: Types.Map<TeamMemberDocument>;
  pendingInvitations?: Types.Map<typeof PendingInvitationSchema>; 
  createdAt?: Date;
  lastUpdatedAt?: Date;
}

const TeamBrandingSchema = new Schema({
  logoUrl: { type: String, trim: true, default: '' },
  primaryColor: { type: String, trim: true, default: '#3F51B5' }, 
  secondaryColor: { type: String, trim: true, default: '#E8EAF6' }, 
  accentColor: { type: String, trim: true, default: '#9C27B0' }, 
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
    ownerId: { type: String, required: true, index: true }, 
    members: {
      type: Map,
      of: TeamMemberSchema,
      default: () => new Map(),
    },
    pendingInvitations: { 
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
    timestamps: true, 
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        delete ret._id; 
        delete ret.__v; 
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
