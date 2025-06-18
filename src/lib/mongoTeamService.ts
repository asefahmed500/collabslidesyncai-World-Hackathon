
import dbConnect from './mongodb';
import TeamModel, { type TeamDocument, type TeamMemberDocument } from '@/models/Team';
import UserModel from '@/models/User'; // To fetch user details for denormalization
import TeamActivityModel from '@/models/TeamActivity';
import type { Team, TeamMember, TeamRole, TeamActivity, TeamActivityType, User as AppUser } from '@/types';
import { Types } from 'mongoose';
import { updateUserTeamAndRoleInMongoDB } from './mongoUserService';
import { createNotification, removeTeamIdFromPresentations as removeTeamIdFromFsPresentations } from './firestoreService'; // Import for notifications & presentation updates

function mongoTeamDocToTeam(doc: TeamDocument | null): Team | null {
  if (!doc) return null;
  const teamObject = doc.toObject({ virtuals: true }) as any; // Use virtuals to get 'id'
  
  // Ensure members map values are plain objects with Date for joinedAt
  if (teamObject.members && teamObject.members instanceof Map) {
    const newMembersObj: { [key: string]: any } = {};
    teamObject.members.forEach((value: any, key: string) => {
      const memberPlain = typeof value.toObject === 'function' ? value.toObject() : value;
      newMembersObj[key] = { ...memberPlain, joinedAt: new Date(memberPlain.joinedAt) };
    });
    teamObject.members = newMembersObj;
  } else if (teamObject.members && typeof teamObject.members === 'object' && !(teamObject.members instanceof Map)) {
    // If it's already an object (e.g. from toObject())
     const newMembersObj: { [key: string]: any } = {};
     Object.entries(teamObject.members).forEach(([key, value]: [string, any]) => {
        newMembersObj[key] = { ...value, joinedAt: new Date(value.joinedAt) };
     });
     teamObject.members = newMembersObj;
  }

  delete teamObject._id; // Use the virtual 'id'
  delete teamObject.__v;
  return {
    ...teamObject,
    id: teamObject.id, // Should be set by virtual
    createdAt: teamObject.createdAt instanceof Date ? teamObject.createdAt : new Date(teamObject.createdAt),
    lastUpdatedAt: teamObject.lastUpdatedAt instanceof Date ? teamObject.lastUpdatedAt : new Date(teamObject.lastUpdatedAt),
  } as Team;
}

function mongoActivityDocToActivity(doc: any): TeamActivity {
    const activityObject = doc.toObject({ virtuals: true });
    return {
        ...activityObject,
        id: activityObject._id.toString(),
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
      members: new Map([[ownerUser.id, ownerMemberInfo as TeamMemberDocument]]), // Cast to Mongoose subdoc type
      branding: { 
        logoUrl: `https://placehold.co/200x100.png?text=${teamName.charAt(0).toUpperCase()}`,
        primaryColor: '#3F51B5',
        secondaryColor: '#FFC107',
        fontPrimary: 'Space Grotesk',
        fontSecondary: 'PT Sans',
      },
      settings: { 
        allowGuestEdits: false,
        aiFeaturesEnabled: true,
      },
    });
    const savedTeam = await newTeam.save();
    await logTeamActivityInMongoDB(savedTeam.id, ownerUser.id, 'team_created', { teamName });
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
    // Ensure updates are structured correctly for nested objects like branding and settings
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
    updatePayload.lastUpdatedAt = new Date();


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
    team.lastUpdatedAt = new Date();
    await team.save();

    // If user doesn't have a teamId or this is their first team, set it.
    if (!userToAdd.teamId) {
        await updateUserTeamAndRoleInMongoDB(userToAdd.id, team.id, role);
    }
    
    // Create notification for the added user
    const actor = await UserModel.findById(addedByUserId).select('name profilePictureUrl').exec();
    await createNotification(
      userToAdd.id,
      'team_invite',
      `Added to Team "${team.name}"`,
      `${actor?.name || 'An admin'} added you to the team "${team.name}" as a ${role}.`,
      `/dashboard/manage-team`, // Or simply /dashboard
      addedByUserId,
      actor?.name || undefined,
      actor?.profilePictureUrl || undefined
    );
    // TODO: Trigger email notification for team invite

    return mongoTeamDocToTeam(team);
  } catch (error) {
    console.error('Error adding member to team in MongoDB:', error);
    throw error;
  }
}

export async function removeMemberFromTeamInMongoDB(teamId: string, memberIdToRemove: string): Promise<Team | null> {
  await dbConnect();
  try {
    const team = await TeamModel.findById(teamId).exec();
    if (!team) throw new Error('Team not found.');
    const memberBeingRemoved = team.members.get(memberIdToRemove);
    if (!memberBeingRemoved) throw new Error('Member not found in team.');
    if (team.ownerId === memberIdToRemove) throw new Error('Cannot remove the team owner.');

    team.members.delete(memberIdToRemove);
    team.lastUpdatedAt = new Date();
    await team.save();

    // Update the user's record to remove teamId and set role to guest if this was their primary team
    const user = await UserModel.findById(memberIdToRemove).exec();
    if(user && user.teamId === teamId) {
        await updateUserTeamAndRoleInMongoDB(memberIdToRemove, null, 'guest');
    }
    // TODO: Consider sending a notification to the removed user (optional)

    return mongoTeamDocToTeam(team);
  } catch (error) {
    console.error('Error removing member from team in MongoDB:', error);
    throw error;
  }
}

export async function updateMemberRoleInMongoDB(teamId: string, memberId: string, newRole: TeamRole): Promise<Team | null> {
  await dbConnect();
  try {
    const team = await TeamModel.findById(teamId).exec();
    if (!team) throw new Error('Team not found.');
    const member = team.members.get(memberId);
    if (!member) throw new Error('Member not found in team.');
    if (team.ownerId === memberId && newRole !== 'owner') throw new Error('Cannot change role of the team owner. Use transfer ownership.');
    if (newRole === 'owner' && team.ownerId !== memberId) throw new Error('To make a new owner, use transfer ownership.');


    member.role = newRole;
    team.members.set(memberId, member);
    team.lastUpdatedAt = new Date();
    await team.save();

    // Update user's primary role if this team is their primary team
    const user = await UserModel.findById(memberId).exec();
    if (user && user.teamId === teamId) {
        await updateUserTeamAndRoleInMongoDB(memberId, teamId, newRole);
    }
    // TODO: Create notification for the user whose role changed

    return mongoTeamDocToTeam(team);
  } catch (error) {
    console.error('Error updating member role in MongoDB:', error);
    throw error;
  }
}

export async function logTeamActivityInMongoDB(
  teamId: string,
  actorId: string,
  actionType: TeamActivityType,
  details?: object,
  targetType?: TeamActivity['targetType'],
  targetId?: string
): Promise<string> {
  await dbConnect();
  try {
    const actor = await UserModel.findById(actorId).select('name email').exec();
    
    let targetNameResolved: string | undefined;
    if (targetType === 'user' && targetId) {
        const targetUser = await UserModel.findById(targetId).select('name email').exec();
        targetNameResolved = targetUser?.name || targetUser?.email || targetId;
        // Augment details if specific to user actions
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
      actorName: actor?.name || actor?.email || 'Unknown User',
      actionType,
      targetType,
      targetId,
      targetName: targetNameResolved,
      details,
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
    await UserModel.updateMany(
      { _id: { $in: memberIds }, teamId: teamId }, // only update if this was their primary team
      { $set: { teamId: null, role: 'guest' } }
    ).session(session);

    // 2. Disassociate presentations from this team in Firestore
    // This requires a call to a firestoreService function.
    // For simplicity, this interaction isn't directly in this transaction,
    // but should be called by the API route handler.
    // await removeTeamIdFromFsPresentations(teamId); // Called from API route

    // 3. Delete team activities
    await TeamActivityModel.deleteMany({ teamId }).session(session);

    // 4. Delete the team itself
    const deletionResult = await TeamModel.findByIdAndDelete(teamId).session(session);
    
    await session.commitTransaction();
    
    // Log the deletion after successful commit
    await logTeamActivityInMongoDB(teamId, actorId, 'team_deleted', { teamName: team.name });

    return !!deletionResult;
  } catch (error) {
    await session.abortTransaction();
    console.error('Error deleting team from MongoDB and cascading:', error);
    throw error;
  } finally {
    session.endSession();
  }
}
