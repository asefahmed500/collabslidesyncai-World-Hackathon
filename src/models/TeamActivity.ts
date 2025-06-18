
import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { TeamActivity as TeamActivityType, TeamActivityType as ActivityTypeEnum, TeamRole } from '@/types';

export interface TeamActivityDocument extends Omit<TeamActivityType, 'id' | 'createdAt'>, Document {
  _id: Types.ObjectId;
  id?: string; // virtual getter
  createdAt: Date; // Mongoose timestamp
}

const TeamActivityDetailsSchema = new Schema({
  oldRole: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'] },
  newRole: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'] },
  changedFields: [String],
  teamName: String,
  memberName: String,
  memberEmail: String,
  presentationTitle: String,
  fileName: String,
  assetType: String,
  // Add any other specific detail fields you anticipate
}, { _id: false, strict: false }); // strict: false to allow arbitrary details

const TeamActivitySchema = new Schema<TeamActivityDocument>(
  {
    teamId: { type: String, required: true, index: true }, // Corresponds to Team.id (Mongoose _id.toHexString())
    actorId: { type: String, required: true, index: true }, // User.id (Firebase UID)
    actorName: { type: String },
    actionType: {
      type: String,
      enum: [
        'team_created', 'member_added', 'member_removed', 'member_role_changed',
        'team_profile_updated', 'presentation_created', 'presentation_deleted',
        'asset_uploaded', 'asset_deleted'
      ],
      required: true,
    },
    targetType: { type: String, enum: ['user', 'presentation', 'team_profile', 'asset'] },
    targetId: { type: String, index: true, sparse: true },
    targetName: { type: String },
    details: { type: TeamActivityDetailsSchema, default: () => ({}) },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only use createdAt for activities
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

TeamActivitySchema.virtual('id').get(function (this: TeamActivityDocument) {
  return this._id.toHexString();
});

let TeamActivityModel: Model<TeamActivityDocument>;

if (mongoose.models.TeamActivity) {
  TeamActivityModel = mongoose.model<TeamActivityDocument>('TeamActivity');
} else {
  TeamActivityModel = mongoose.model<TeamActivityDocument>('TeamActivity', TeamActivitySchema);
}

export default TeamActivityModel;
