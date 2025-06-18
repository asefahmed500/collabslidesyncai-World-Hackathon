
import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { Team as TeamType, TeamMember as TeamMemberType, TeamRole } from '@/types';

export interface TeamMemberDocument extends Omit<TeamMemberType, 'joinedAt'>, Document {
  joinedAt: Date;
  // _id will be part of the subdocument array if not explicitly disabled
}

const TeamMemberSchema = new Schema<TeamMemberDocument>({
  userId: { type: String, required: true }, // Corresponds to User.id (Firebase UID or Mongoose _id.toString())
  role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], required: true },
  joinedAt: { type: Date, default: Date.now },
  addedBy: { type: String, required: true }, // User.id of who added them
  name: { type: String },
  email: { type: String },
  profilePictureUrl: { type: String },
}, { _id: false }); // _id: false if you don't want Mongoose to add _id to each member

export interface TeamDocument extends Omit<TeamType, 'id' | 'members' | 'createdAt' | 'lastUpdatedAt'>, Document {
  _id: mongoose.Types.ObjectId;
  id?: string; // virtual
  ownerId: string; // User.id (Firebase UID or Mongoose _id.toString())
  members: Types.Map<TeamMemberDocument>; // Using Mongoose Map for { [userId: string]: TeamMember }
  createdAt?: Date;
  lastUpdatedAt?: Date;
}

const TeamBrandingSchema = new Schema({
  logoUrl: String,
  primaryColor: String,
  secondaryColor: String,
  fontPrimary: String,
  fontSecondary: String,
}, { _id: false });

const TeamSettingsSchema = new Schema({
  allowGuestEdits: { type: Boolean, default: false },
  aiFeaturesEnabled: { type: Boolean, default: true },
}, { _id: false });

const TeamSchema = new Schema<TeamDocument>(
  {
    name: { type: String, required: true, trim: true },
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
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
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
