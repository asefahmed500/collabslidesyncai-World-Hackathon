
import dbConnect from './mongodb';
import TeamModel, { type TeamDocument, type TeamMemberDocument } from '@/models/Team';
import UserModel from '@/models/User'; // To fetch user details for denormalization
import TeamActivityModel from '@/models/TeamActivity';
import type { Team, TeamMember, TeamRole, TeamActivity, TeamActivityType, User as AppUser } from '@/types';
import { Types } from 'mongoose';

function mongoTeamDocToTeam(doc: TeamDocument | null): Team | null {
  if (!doc) return null;
  const teamObject = doc.toObject({ virtuals: true }) as any;
  if (teamObject._id && !teamObject.id) {
    teamObject.id = teamObject._id.toString();
  }
  // Convert members map values if they are Mongoose documents
  if (teamObject.members && typeof teamObject.members.toObject === 'function') {
    const membersPlain = teamObject.members.toObject();
    teamObject.members = Object.fromEntries(
        Object.entries(membersPlain).map(([key, value]: [string, any]) => [
            key,
            { ...value, joinedAt: new Date(value.joinedAt) }
        ])
    );
  } else if (teamObject.members instanceof Map) {
     const newMembersObj: { [key: string]: any } = {};
      teamObject.members.forEach((value: any, key: string) => {
        newMembersObj[key] = { ...value, joinedAt: new Date(value.joinedAt) };
      });
      teamObject.members = newMembersObj;
  }


  delete teamObject.__v;
  return {
    ...teamObject,
    id: teamObject.id || teamObject._id.toString(),
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
      throw new Error("Owner user or user ID is undefined");
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
      members: new Map([[ownerUser.id, ownerMemberInfo]]),
      branding: { // Default branding
        logoUrl: `https://placehold.co/200x100.png?text=${teamName.charAt(0).toUpperCase()}`,
        primaryColor: '#3F51B5',
        secondaryColor: '#FFC107',
        fontPrimary: 'Space Grotesk',
        fontSecondary: 'PT Sans',
      },
      settings: { // Default settings
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
    const { id, ownerId, members, createdAt, lastUpdatedAt, ...safeUpdates } = updates as any;
    const updatedTeamDoc = await TeamModel.findByIdAndUpdate(teamId, safeUpdates, { new: true }).exec();
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
    team.members.set(userToAdd.id, newMember as TeamMemberDocument); // Cast to Mongoose subdoc type
    team.lastUpdatedAt = new Date();
    await team.save();
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
    if (!team.members.get(memberIdToRemove)) throw new Error('Member not found in team.');
    if (team.ownerId === memberIdToRemove) throw new Error('Cannot remove the team owner.');

    team.members.delete(memberIdToRemove);
    team.lastUpdatedAt = new Date();
    await team.save();
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
  details?: object, // More generic for now
  targetType?: TeamActivity['targetType'],
  targetId?: string
): Promise<string> {
  await dbConnect();
  try {
    const actor = await UserModel.findById(actorId).select('name').exec();
    
    let targetName;
    if (targetType === 'user' && targetId) {
        const targetUser = await UserModel.findById(targetId).select('name email').exec();
        targetName = targetUser?.name || targetId;
        if (details && targetUser?.email) (details as any).memberEmail = targetUser.email;
    }
    // For presentation or asset, name might be passed in details already or fetched if needed.

    const activityData: Partial<TeamActivity> = {
      teamId,
      actorId,
      actorName: actor?.name || 'Unknown User',
      actionType,
      targetType,
      targetId,
      targetName,
      details,
      // createdAt will be set by Mongoose timestamps
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
