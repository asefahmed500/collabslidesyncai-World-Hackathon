
import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { TeamActivity as TeamActivityType, TeamActivityType as ActivityTypeEnum } from '@/types'; // Removed unused Role imports

export interface TeamActivityDocument extends Omit<TeamActivityType, 'id' | 'createdAt'>, Document {
  _id: Types.ObjectId;
  id?: string; // virtual getter for consistency if used, though _id.toString() is standard
  createdAt: Date; // Mongoose timestamp
}

const TeamActivitySchema = new Schema<TeamActivityDocument>(
  {
    teamId: { type: String, required: true, index: true }, // Changed from ObjectId to String if teamId is a Mongoose ObjectId string
    actorId: { type: String, required: true, index: true }, // Firebase UID
    actorName: { type: String }, // Denormalized from User model
    actionType: {
      type: String,
      enum: [
        'team_created', 'member_added', 'member_removed', 'member_role_changed',
        'team_profile_updated', 'presentation_created', 'presentation_deleted',
        'presentation_restored', 'presentation_permanently_deleted', 'presentation_status_changed',
        'asset_uploaded', 'asset_deleted', 'team_deleted' // Added team_deleted
      ],
      required: true,
    },
    targetType: { type: String, enum: ['user', 'presentation', 'team_profile', 'asset'] },
    targetId: { type: String, index: true, sparse: true }, // Can be User UID, Presentation ID (Firestore), Asset ID (Firestore)
    targetName: { type: String }, // Denormalized name of the target
    details: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only manage createdAt
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
