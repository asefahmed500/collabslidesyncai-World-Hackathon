
import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { TeamActivity as TeamActivityType, TeamActivityType as ActivityTypeEnum, TeamRole, PresentationAccessRole } from '@/types';

export interface TeamActivityDocument extends Omit<TeamActivityType, 'id' | 'createdAt'>, Document {
  _id: Types.ObjectId;
  id?: string; // virtual getter
  createdAt: Date;
}

// Removed TeamActivityDetailsSchema as it's simplified below

const TeamActivitySchema = new Schema<TeamActivityDocument>(
  {
    teamId: { type: String, required: true, index: true },
    actorId: { type: String, required: true, index: true },
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
    details: { type: Schema.Types.Mixed, default: () => ({}) }, // Simplified definition
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

