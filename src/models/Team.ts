
import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { Team as TeamType, TeamMember as TeamMemberType, TeamRole } from '@/types';

// TeamMember subdocument schema
// We store userId (which is Firebase UID) directly, not as a ref to User model in this subdoc
// for easier querying if needed and to keep team document somewhat self-contained for members list.
const TeamMemberSchema = new Schema<TeamMemberType & Document>({
  // userId is the key in the Map, so not needed as a field in the subdocument itself.
  role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], required: true },
  joinedAt: { type: Date, default: Date.now },
  addedBy: { type: String, required: true }, // User.id (Firebase UID) of who added them
  name: { type: String }, // Denormalized
  email: { type: String }, // Denormalized
  profilePictureUrl: { type: String }, // Denormalized
}, { _id: false }); // No separate _id for subdocuments in the map values

export interface TeamDocument extends Omit<TeamType, 'id' | 'members' | 'createdAt' | 'lastUpdatedAt'>, Document {
  _id: Types.ObjectId; // Mongoose will auto-generate this
  id?: string; // virtual getter
  ownerId: string; // User.id (Firebase UID)
  members: Types.Map<TeamMemberType>; // Key is User.id (Firebase UID), value is TeamMemberType
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
    ownerId: { type: String, required: true, index: true }, // Firebase UID of the owner
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
