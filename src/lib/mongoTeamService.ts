
import dbConnect from './mongodb';
import TeamModel, { type TeamDocument, type TeamMemberDocument } from '@/models/Team';
import UserModel from '@/models/User'; 
import TeamActivityModel from '@/models/TeamActivity';
import type { Team, TeamMember, TeamRole, TeamActivity, TeamActivityType, User as AppUser } from '@/types';
import mongoose, { Types } from 'mongoose'; // Import mongoose for session
import { updateUserTeamAndRoleInMongoDB } from './mongoUserService';
import { createNotification } from './firestoreService'; 

function mongoTeamDocToTeam(doc: TeamDocument | null): Team | null {
  if (!doc) return null;
  const teamObject = doc.toObject({ virtuals: true }) as any; 
  
  if (teamObject.members && teamObject.members instanceof Map) {
    const newMembersObj: { [key: string]: any } = {};
    teamObject.members.forEach((value: any, key: string) => {
      const memberPlain = typeof value.toObject === 'function' ? value.toObject() : value;
      newMembersObj[key] = { ...memberPlain, joinedAt: new Date(memberPlain.joinedAt) };
    });
    teamObject.members = newMembersObj;
  } else if (teamObject.members && typeof teamObject.members === 'object' && !(teamObject.members instanceof Map)) {
     const newMembersObj: { [key: string]: any } = {};
     Object.entries(teamObject.members).forEach(([key, value]: [string, any]) => {
        newMembersObj[key] = { ...value, joinedAt: new Date(value.joinedAt) };
     });
     teamObject.members = newMembersObj;
  }

  delete teamObject._id; 
  delete teamObject.__v;
  return {
    ...teamObject,
    id: teamObject.id, 
    createdAt: teamObject.createdAt instanceof Date ? teamObject.createdAt : new Date(teamObject.createdAt),
    lastUpdatedAt: teamObject.lastUpdatedAt instanceof Date ? teamObject.lastUpdatedAt : new Date(teamObject.lastUpdatedAt),
  } as Team;
}

function mongoActivityDocToActivity(doc: any): TeamActivity {
    const activityObject = doc.toObject({ virtuals: true });
    return {
        ...activityObject,
        id: activityObject._id.toString(), // Use _id from Mongoose doc
        createdAt: new Date(activityObject.createdAt),
    } as TeamActivity;
}


export async function createTeamInMongoDB(teamName: string, ownerUser: AppUser): Promise<Team | null> {
  await dbConnect();
  try {
    if (!ownerUser || !ownerUser.id) {
      throw new Error("Owner user or user ID is undefined for team creation.");
    }
    const ownerMemberInfo: TeamMember = {
      role: 'owner',
      joinedAt: new Date(),
      addedBy: ownerUser.id,
      name: ownerUser.name,
      email: ownerUser.email,
      profilePictureUrl: ownerUser.profilePictureUrl,
    };

    const newTeam = new TeamModel({
      name: teamName,
      ownerId: ownerUser.id,
      members: new Map([[ownerUser.id, ownerMemberInfo as TeamMemberDocument]]),
      branding: { 
        logoUrl: `https://placehold.co/200x100.png?text=${teamName.charAt(0).toUpperCase()}`,
        primaryColor: '#3F51B5',
        secondaryColor: '#E8EAF6',
        accentColor: '#9C27B0',
        fontPrimary: 'Space Grotesk',
        fontSecondary: 'PT Sans',
      },
      settings: { 
        allowGuestEdits: false,
        aiFeaturesEnabled: true,
      },
    });
    const savedTeam = await newTeam.save();
    await logTeamActivityInMongoDB(savedTeam.id, ownerUser.id, 'team_created', { teamName: savedTeam.name }); // Use savedTeam.name
    return mongoTeamDocToTeam(savedTeam);
  } catch (error) {
    console.error('Error creating team in MongoDB:', error);
    throw error;
  }
}

export async function getTeamFromMongoDB(teamId: string): Promise<Team | null> {
  await dbConnect();
  try {
    if (!Types.ObjectId.isValid(teamId)) {
        console.warn(`Invalid teamId format for MongoDB: ${teamId}`);
        return null;
    }
    const teamDoc = await TeamModel.findById(teamId).exec();
    return mongoTeamDocToTeam(teamDoc);
  } catch (error) {
    console.error('Error fetching team from MongoDB:', error);
    return null;
  }
}

export async function updateTeamInMongoDB(teamId: string, updates: Partial<Omit<Team, 'id' | 'ownerId' | 'members' | 'createdAt' | 'lastUpdatedAt'>>): Promise<Team | null> {
  await dbConnect();
  try {
    const updatePayload: any = {};
    if (updates.name) updatePayload.name = updates.name;
    if (updates.branding) {
        for (const key in updates.branding) {
            updatePayload[`branding.${key}`] = (updates.branding as any)[key];
        }
    }
    if (updates.settings) {
        for (const key in updates.settings) {
            updatePayload[`settings.${key}`] = (updates.settings as any)[key];
        }
    }
    // lastUpdatedAt is handled by Mongoose timestamps: true

    const updatedTeamDoc = await TeamModel.findByIdAndUpdate(teamId, updatePayload, { new: true }).exec();
    return mongoTeamDocToTeam(updatedTeamDoc);
  } catch (error) {
    console.error('Error updating team in MongoDB:', error);
    throw error;
  }
}

export async function addMemberToTeamInMongoDB(teamId: string, userToAdd: AppUser, role: TeamRole, addedByUserId: string): Promise<Team | null> {
  await dbConnect();
  try {
    const team = await TeamModel.findById(teamId).exec();
    if (!team) throw new Error('Team not found.');
    if (team.members.get(userToAdd.id)) throw new Error('User is already a member of this team.');

    const newMember: TeamMember = {
      role,
      joinedAt: new Date(),
      addedBy: addedByUserId,
      name: userToAdd.name,
      email: userToAdd.email,
      profilePictureUrl: userToAdd.profilePictureUrl,
    };
    team.members.set(userToAdd.id, newMember as TeamMemberDocument);
    // team.lastUpdatedAt = new Date(); // Handled by Mongoose timestamps
    const savedTeam = await team.save();

    if (!userToAdd.teamId) { // If user is not part of any team, or to set this as their primary
        await updateUserTeamAndRoleInMongoDB(userToAdd.id, team.id, role);
    }
    
    const actor = await UserModel.findById(addedByUserId).select('name profilePictureUrl').exec();
    await createNotification(
      userToAdd.id,
      'team_invite',
      `Added to Team "${team.name}"`,
      `${actor?.name || 'An admin'} added you to the team "${team.name}" as a ${role}.`,
      `/dashboard/manage-team`, 
      addedByUserId,
      actor?.name || undefined,
      actor?.profilePictureUrl || undefined
    );
    await logTeamActivityInMongoDB(teamId, addedByUserId, 'member_added', { memberName: userToAdd.name || userToAdd.email, memberEmail: userToAdd.email, newRole: role }, 'user', userToAdd.id);

    return mongoTeamDocToTeam(savedTeam);
  } catch (error) {
    console.error('Error adding member to team in MongoDB:', error);
    throw error;
  }
}

export async function removeMemberFromTeamInMongoDB(teamId: string, memberIdToRemove: string, actorId: string): Promise<Team | null> {
  await dbConnect();
  try {
    const team = await TeamModel.findById(teamId).exec();
    if (!team) throw new Error('Team not found.');
    const memberBeingRemoved = team.members.get(memberIdToRemove);
    if (!memberBeingRemoved) throw new Error('Member not found in team.');
    if (team.ownerId === memberIdToRemove) throw new Error('Cannot remove the team owner.');

    team.members.delete(memberIdToRemove);
    // team.lastUpdatedAt = new Date(); // Handled by Mongoose timestamps
    const savedTeam = await team.save();

    const user = await UserModel.findById(memberIdToRemove).exec();
    if(user && user.teamId === teamId) {
        await updateUserTeamAndRoleInMongoDB(memberIdToRemove, null, 'guest');
    }
    await logTeamActivityInMongoDB(teamId, actorId, 'member_removed', { memberName: memberBeingRemoved.name || memberBeingRemoved.email }, 'user', memberIdToRemove);

    return mongoTeamDocToTeam(savedTeam);
  } catch (error) {
    console.error('Error removing member from team in MongoDB:', error);
    throw error;
  }
}

export async function updateMemberRoleInMongoDB(teamId: string, memberId: string, newRole: TeamRole, actorId: string): Promise<Team | null> {
  await dbConnect();
  try {
    const team = await TeamModel.findById(teamId).exec();
    if (!team) throw new Error('Team not found.');
    const member = team.members.get(memberId);
    if (!member) throw new Error('Member not found in team.');
    if (team.ownerId === memberId && newRole !== 'owner') throw new Error('Cannot change role of the team owner. Use transfer ownership.');
    if (newRole === 'owner' && team.ownerId !== memberId) throw new Error('To make a new owner, use transfer ownership.');

    const oldRole = member.role;
    member.role = newRole;
    team.members.set(memberId, member);
    // team.lastUpdatedAt = new Date(); // Handled by Mongoose timestamps
    const savedTeam = await team.save();

    const user = await UserModel.findById(memberId).exec();
    if (user && user.teamId === teamId) {
        await updateUserTeamAndRoleInMongoDB(memberId, teamId, newRole);
    }
    await logTeamActivityInMongoDB(teamId, actorId, 'member_role_changed', { memberName: member.name || member.email, oldRole, newRole }, 'user', memberId);
    
    return mongoTeamDocToTeam(savedTeam);
  } catch (error) {
    console.error('Error updating member role in MongoDB:', error);
    throw error;
  }
}

export async function logTeamActivityInMongoDB(
  teamId: string,
  actorId: string, // Firebase UID
  actionType: TeamActivityType,
  details?: object,
  targetType?: TeamActivity['targetType'],
  targetId?: string // Could be User UID, Presentation ID, Asset ID
): Promise<string> {
  await dbConnect();
  try {
    const actor = await UserModel.findById(actorId).select('name email').exec();
    
    let targetNameResolved: string | undefined;
    if (targetType === 'user' && targetId) {
        const targetUser = await UserModel.findById(targetId).select('name email').exec();
        targetNameResolved = targetUser?.name || targetUser?.email || targetId;
        if (details && targetUser?.email && actionType === 'member_added') (details as any).memberEmail = targetUser.email;
        if (details && targetUser?.name && (actionType === 'member_added' || actionType === 'member_role_changed' || actionType === 'member_removed')) (details as any).memberName = targetUser.name;
    } else if (targetType === 'presentation' && details && (details as any).presentationTitle) {
        targetNameResolved = (details as any).presentationTitle;
    } else if (targetType === 'asset' && details && (details as any).fileName) {
        targetNameResolved = (details as any).fileName;
    }


    const activityData: Partial<TeamActivity> = {
      teamId,
      actorId,
      actorName: actor?.name || actor?.email || actorId, // Use actorId as fallback
      actionType,
      targetType,
      targetId,
      targetName: targetNameResolved,
      details,
      // createdAt is handled by Mongoose timestamps
    };

    const activity = new TeamActivityModel(activityData);
    const savedActivity = await activity.save();
    return savedActivity.id;
  } catch (error) {
    console.error('Error logging team activity in MongoDB:', error);
    throw error;
  }
}

export async function getTeamActivitiesFromMongoDB(teamId: string, limitCount = 20): Promise<TeamActivity[]> {
  await dbConnect();
  try {
    const activities = await TeamActivityModel.find({ teamId })
      .sort({ createdAt: -1 })
      .limit(limitCount)
      .exec();
    return activities.map(mongoActivityDocToActivity);
  } catch (error) {
    console.error('Error fetching team activities from MongoDB:', error);
    return [];
  }
}

export async function getAllTeamsFromMongoDB(): Promise<Team[]> {
  await dbConnect();
  try {
    const teams = await TeamModel.find({}).sort({ createdAt: -1 }).exec();
    return teams.map(mongoTeamDocToTeam).filter(t => t !== null) as Team[];
  } catch (error) {
    console.error('Error fetching all teams from MongoDB:', error);
    return [];
  }
}

// Deletes a team and handles disassociation of members.
// Presentation disassociation should be handled by the calling API route via firestoreService.
export async function deleteTeamFromMongoDB(teamId: string, actorId: string): Promise<boolean> {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const team = await TeamModel.findById(teamId).session(session);
    if (!team) {
      throw new Error('Team not found for deletion.');
    }

    // 1. Disassociate members from this team
    const memberIds = Array.from(team.members.keys());
    for (const memberId of memberIds) {
        const user = await UserModel.findById(memberId).session(session);
        if (user && user.teamId && user.teamId.toString() === team.id.toString()) { // Ensure it's this team
            user.teamId = null;
            user.role = 'guest';
            await user.save({ session });
        }
    }
    
    // 2. Delete team activities
    await TeamActivityModel.deleteMany({ teamId }).session(session);

    // 3. Delete the team itself
    const deletionResult = await TeamModel.findByIdAndDelete(teamId).session(session);
    
    await session.commitTransaction();
    
    // Log the deletion after successful commit
    // Note: team.id might not be accessible if team is fully deleted, team.name should be fine.
    await logTeamActivityInMongoDB(teamId, actorId, 'team_deleted', { teamName: team.name });

    return !!deletionResult;
  } catch (error) {
    await session.abortTransaction();
    console.error('Error deleting team from MongoDB and cascading member updates:', error);
    throw error;
  } finally {
    session.endSession();
  }
}
