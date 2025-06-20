
import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { TeamActivity as TeamActivityType, TeamActivityType as ActivityTypeEnum } from '@/types';

export interface TeamActivityDocument extends Omit<TeamActivityType, 'id' | 'createdAt'>, Document {
  _id: Types.ObjectId;
  id?: string; 
  createdAt: Date; 
}

const TeamActivitySchema = new Schema<TeamActivityDocument>(
  {
    teamId: { type: String, required: true, index: true }, 
    actorId: { type: String, required: true, index: true }, 
    actorName: { type: String }, 
    actionType: {
      type: String,
      enum: [
        'team_created', 'member_invited', 'invitation_declined', 'member_added', 
        'member_removed', 'member_role_changed', 'team_profile_updated', 
        'presentation_created', 'presentation_deleted', 'presentation_restored', 
        'presentation_permanently_deleted', 'presentation_status_changed',
        'asset_uploaded', 'asset_deleted', 'team_deleted'
      ],
      required: true,
    },
    targetType: { type: String, enum: ['user', 'presentation', 'team_profile', 'asset', 'invitation'] },
    targetId: { type: String, index: true, sparse: true }, 
    targetName: { type: String }, 
    details: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, 
    toJSON: {
      virtuals: true,
      versionKey: false, 
      transform: function(doc, ret) {
        // ret.id = ret._id.toString();
        // delete ret._id;
      }
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: function(doc, ret) {
        // ret.id = ret._id.toString();
        // delete ret._id;
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
