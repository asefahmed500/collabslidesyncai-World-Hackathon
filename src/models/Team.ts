
import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { Team as TeamType, TeamMember as TeamMemberType, TeamRole } from '@/types';

// TeamMember subdocument schema
export interface TeamMemberDocument extends TeamMemberType, Document {}

const TeamMemberSchema = new Schema<TeamMemberDocument>({
  role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], required: true },
  joinedAt: { type: Date, default: Date.now },
  addedBy: { type: String, required: true },
  name: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  profilePictureUrl: { type: String, trim: true },
}, { _id: false });

export interface TeamDocument extends Omit<TeamType, 'id' | 'members' | 'createdAt' | 'lastUpdatedAt'>, Document {
  _id: Types.ObjectId;
  id?: string; // virtual getter
  ownerId: string;
  members: Types.Map<TeamMemberDocument>;
  createdAt?: Date;
  lastUpdatedAt?: Date;
}

const TeamBrandingSchema = new Schema({
  logoUrl: { type: String, trim: true, default: '' },
  primaryColor: { type: String, trim: true, default: '#3F51B5' },
  secondaryColor: { type: String, trim: true, default: '#FFC107' },
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
    branding: { type: TeamBrandingSchema, default: () => ({}) },
    settings: { type: TeamSettingsSchema, default: () => ({}) },
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
