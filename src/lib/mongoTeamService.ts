
import dbConnect from './mongodb';
import TeamModel, { type TeamDocument, type TeamMemberDocument } from '@/models/Team';
import UserModel from '@/models/User'; 
import TeamActivityModel from '@/models/TeamActivity';
import type { Team, TeamMember, TeamRole, TeamActivity, TeamActivityType, User as AppUser } from '@/types';
import mongoose, { Types } from 'mongoose';
import { updateUserTeamAndRoleInMongoDB } from './mongoUserService';
import { createNotification } from './firestoreService'; 
import { sendEmail, createTeamInviteEmail } from './emailService'; 

const ensureDate = (dateInput: any): Date => {
  if (!dateInput) return new Date(); // Fallback or throw error based on requirements
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'object' && dateInput.toDate && typeof dateInput.toDate === 'function') {
    return dateInput.toDate(); // Firestore Timestamp
  }
  return new Date(dateInput); // String or number
};

function mongoTeamDocToTeam(doc: TeamDocument | null): Team | null {
  if (!doc) return null;
  const teamObject = doc.toObject({ virtuals: true, versionKey: false }); 
  
  const members: { [key: string]: TeamMember } = {};
  if (teamObject.members && (teamObject.members instanceof Map || typeof teamObject.members === 'object')) {
    const memberEntries = teamObject.members instanceof Map ? Array.from(teamObject.members.entries()) : Object.entries(teamObject.members);
    for (const [key, value] of memberEntries) {
      members[key] = {
        ...(typeof value === 'object' && value !== null ? value : {}), // Ensure value is an object
        joinedAt: ensureDate((value as any)?.joinedAt),
      } as TeamMember;
    }
  }
  
  const pendingInvitations: Team['pendingInvitations'] = {};
  if (teamObject.pendingInvitations && (teamObject.pendingInvitations instanceof Map || typeof teamObject.pendingInvitations === 'object')) {
    const inviteEntries = teamObject.pendingInvitations instanceof Map ? Array.from(teamObject.pendingInvitations.entries()) : Object.entries(teamObject.pendingInvitations);
    for (const [key, value] of inviteEntries) {
      if (pendingInvitations) { // Type guard
        pendingInvitations[key] = {
          ...(typeof value === 'object' && value !== null ? value : {}),
          invitedAt: ensureDate((value as any)?.invitedAt),
        } as Team['pendingInvitations'] extends infer P | undefined ? P extends object ? P[string] : never : never;
      }
    }
  }

  const team: Team = {
    id: teamObject.id || doc._id.toString(),
    name: teamObject.name,
    ownerId: teamObject.ownerId,
    members,
    pendingInvitations: Object.keys(pendingInvitations || {}).length > 0 ? pendingInvitations : undefined,
    branding: teamObject.branding || { primaryColor: '#3F51B5', secondaryColor: '#E8EAF6', accentColor: '#9C27B0', fontPrimary: 'Space Grotesk', fontSecondary: 'PT Sans' },
    settings: teamObject.settings || { allowGuestEdits: false, aiFeaturesEnabled: true },
    createdAt: teamObject.createdAt ? ensureDate(teamObject.createdAt) : undefined,
    lastUpdatedAt: teamObject.lastUpdatedAt ? ensureDate(teamObject.lastUpdatedAt) : undefined,
  };
  return team;
}

function mongoActivityDocToActivity(doc: any): TeamActivity {
    const activityObject = typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true, versionKey: false }) : doc;

    return {
        ...activityObject,
        id: activityObject.id || activityObject._id?.toString(),
        createdAt: ensureDate(activityObject.createdAt),
        details: activityObject.details || {},
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
      pendingInvitations: new Map(),
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
    await logTeamActivityInMongoDB(savedTeam.id.toString(), ownerUser.id, 'team_created', { teamName: savedTeam.name });
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

export async function updateTeamInMongoDB(teamId: string, updates: Partial<Omit<Team, 'id' | 'ownerId' | 'members' | 'createdAt' | 'lastUpdatedAt' | 'pendingInvitations'>>): Promise<Team | null> {
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

    const updatedTeamDoc = await TeamModel.findByIdAndUpdate(teamId, { $set: updatePayload, $currentDate: { lastUpdatedAt: true } }, { new: true }).exec();
    return mongoTeamDocToTeam(updatedTeamDoc);
  } catch (error) {
    console.error('Error updating team in MongoDB:', error);
    throw error;
  }
}

export async function addMemberToTeamInMongoDB(teamId: string, userToInvite: AppUser, role: TeamRole, invitedByUserId: string): Promise<Team | null> {
  await dbConnect();
  try {
    const team = await TeamModel.findById(teamId).exec();
    if (!team) throw new Error('Team not found.');
    if (team.members.get(userToInvite.id)) throw new Error('User is already a member of this team.');
    if (team.pendingInvitations?.get(userToInvite.id)) throw new Error('User already has a pending invitation to this team.');
    if (userToInvite.teamId && userToInvite.teamId !== teamId) throw new Error (`User ${userToInvite.name || userToInvite.email} is already part of another team.`);
    if (userToInvite.teamId && userToInvite.teamId === teamId) throw new Error (`User ${userToInvite.name || userToInvite.email} is already a member of this team.`);


    const inviter = await UserModel.findById(invitedByUserId).select('name profilePictureUrl').exec();
    
    const inviteId = new Types.ObjectId().toHexString();
    
    await createNotification(
      userToInvite.id,
      'team_invitation', 
      `Invitation to join Team "${team.name}"`,
      `${inviter?.name || 'A team admin'} invited you to join the team "${team.name}" as a ${role}.`,
      `/dashboard`, 
      invitedByUserId,
      inviter?.name || undefined,
      inviter?.profilePictureUrl || undefined,
      team.id.toString(), 
      role      
    );

    team.pendingInvitations = team.pendingInvitations || new Map();
    team.pendingInvitations.set(userToInvite.id, { 
        inviteId,
        email: userToInvite.email || '',
        role,
        invitedBy: invitedByUserId,
        invitedAt: new Date(),
        token: '', 
    });
    team.lastUpdatedAt = new Date();
    const savedTeam = await team.save();

    if (userToInvite.email && inviter) {
        const teamLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/dashboard`;
        let emailContent = createTeamInviteEmail( 
            userToInvite.name || userToInvite.email,
            inviter.name || 'Team Admin',
            team.name,
            teamLink,
            role
        );
        emailContent.subject = `You're invited to join Team "${team.name}" on CollabDeck`;
        emailContent.htmlBody = `
          <p>Hi ${userToInvite.name || userToInvite.email},</p>
          <p>${inviter.name || 'A team admin'} has invited you to join the team "<strong>${team.name}</strong>" as a <strong>${role}</strong> on CollabDeck.</p>
          <p>You can accept or decline this invitation from your CollabDeck dashboard notifications.</p>
          <p>If you don't have an account yet with this email, please sign up first.</p>
          <p>Access your dashboard: <a href="${teamLink}">${teamLink}</a></p>
          <p>The CollabDeck Team</p>
        `;
        try {
            await sendEmail({
                to: userToInvite.email,
                subject: emailContent.subject,
                htmlBody: emailContent.htmlBody,
            });
        } catch (emailError) {
            console.warn("Failed to send team invite email:", emailError);
        }
    }

    await logTeamActivityInMongoDB(teamId, invitedByUserId, 'member_invited', { 
        invitedEmail: userToInvite.email, 
        invitedName: userToInvite.name, 
        roleAssigned: role 
    }, 'invitation', userToInvite.id);

    return mongoTeamDocToTeam(savedTeam);
  } catch (error) {
    console.error('Error inviting member to team in MongoDB:', error);
    throw error;
  }
}


export async function processTeamInvitation(
  teamId: string, 
  invitedUserId: string, 
  roleToAssign: TeamRole, 
  accepted: boolean,
  actorWhoInvitedId: string, 
  actorWhoInvitedName?: string
): Promise<Team | null> {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const team = await TeamModel.findById(teamId).session(session);
    if (!team) throw new Error('Team not found.');
    
    const pendingInvite = team.pendingInvitations?.get(invitedUserId);
    if (!pendingInvite) {
      if (team.members.get(invitedUserId)) {
        console.warn(`User ${invitedUserId} is already a member of team ${teamId}. Invitation processing skipped.`);
        await session.abortTransaction(); session.endSession();
        return mongoTeamDocToTeam(team);
      }
      throw new Error('No pending invitation found for this user or invitation already processed.');
    }

    const invitedUser = await UserModel.findById(invitedUserId).session(session);
    if (!invitedUser) throw new Error('Invited user not found.');

    if (accepted) {
      if (invitedUser.teamId && invitedUser.teamId.toString() !== team.id.toString()) {
        throw new Error(`User ${invitedUser.name || invitedUser.email} is already part of another team. Please leave your current team to join this one.`);
      }
      if (invitedUser.teamId && invitedUser.teamId.toString() === team.id.toString()) {
         console.warn(`User ${invitedUserId} is already a member of team ${teamId}. Accepting again.`);
      }

      const newMember: TeamMember = {
        role: roleToAssign,
        joinedAt: new Date(),
        addedBy: pendingInvite.invitedBy, 
        name: invitedUser.name,
        email: invitedUser.email,
        profilePictureUrl: invitedUser.profilePictureUrl,
      };
      team.members.set(invitedUserId, newMember as TeamMemberDocument);
      
      invitedUser.teamId = team.id.toString(); 
      invitedUser.role = roleToAssign;
      await invitedUser.save({ session });

      await logTeamActivityInMongoDB(teamId, invitedUserId, 'member_added', { 
        memberName: invitedUser.name || invitedUser.email, 
        roleAssigned: roleToAssign,
        method: 'invitation_accepted'
      }, 'user', invitedUserId, session);
      
      await createNotification(
        pendingInvite.invitedBy, 
        'generic_info',
        `Invitation Accepted: ${invitedUser.name || invitedUser.email}`,
        `${invitedUser.name || invitedUser.email} accepted your invitation to join Team "${team.name}" as a ${roleToAssign}.`,
        `/dashboard/manage-team?teamId=${team.id.toString()}`,
        invitedUserId, invitedUser.name, invitedUser.profilePictureUrl
      );

    } else { 
      await logTeamActivityInMongoDB(teamId, invitedUserId, 'invitation_declined', { 
          declinedByEmail: invitedUser.email, 
          declinedByName: invitedUser.name 
      }, 'invitation', invitedUserId, session);
       await createNotification(
        pendingInvite.invitedBy, 
        'generic_info',
        `Invitation Declined: ${invitedUser.name || invitedUser.email}`,
        `${invitedUser.name || invitedUser.email} declined your invitation to join Team "${team.name}".`,
        undefined, 
        invitedUserId, invitedUser.name, invitedUser.profilePictureUrl
      );
    }

    team.pendingInvitations?.delete(invitedUserId);
    team.lastUpdatedAt = new Date();
    const savedTeam = await team.save({ session });
    await session.commitTransaction();
    return mongoTeamDocToTeam(savedTeam);

  } catch (error) {
    await session.abortTransaction();
    console.error('Error processing team invitation in MongoDB:', error);
    throw error;
  } finally {
    session.endSession();
  }
}


export async function removeMemberFromTeamInMongoDB(teamId: string, memberIdToRemove: string, actorId: string): Promise<Team | null> {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const team = await TeamModel.findById(teamId).session(session);
    if (!team) throw new Error('Team not found.');
    const memberBeingRemovedData = team.members.get(memberIdToRemove);
    if (!memberBeingRemovedData) throw new Error('Member not found in team.');
    if (team.ownerId === memberIdToRemove) throw new Error('Cannot remove the team owner.');

    team.members.delete(memberIdToRemove);
    team.lastUpdatedAt = new Date();
    const savedTeam = await team.save({ session });

    const user = await UserModel.findById(memberIdToRemove).session(session);
    if(user && user.teamId && user.teamId.toString() === team.id.toString()) {
        user.teamId = null;
        user.role = 'guest';
        await user.save({ session });
    }
    await session.commitTransaction();
    await logTeamActivityInMongoDB(teamId, actorId, 'member_removed', { memberName: memberBeingRemovedData.name || memberBeingRemovedData.email }, 'user', memberIdToRemove);
    return mongoTeamDocToTeam(savedTeam);
  } catch (error) {
    await session.abortTransaction();
    console.error('Error removing member from team in MongoDB:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

export async function updateMemberRoleInMongoDB(teamId: string, memberId: string, newRole: TeamRole, actorId: string): Promise<Team | null> {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const team = await TeamModel.findById(teamId).session(session);
    if (!team) throw new Error('Team not found.');
    const member = team.members.get(memberId);
    if (!member) throw new Error('Member not found in team.');
    if (team.ownerId === memberId && newRole !== 'owner') throw new Error('Cannot change role of the team owner. Use transfer ownership.');
    if (newRole === 'owner' && team.ownerId !== memberId) throw new Error('To make a new owner, use transfer ownership.');

    const oldRole = member.role;
    member.role = newRole;
    team.members.set(memberId, member);
    team.lastUpdatedAt = new Date();
    const savedTeam = await team.save({ session });

    const user = await UserModel.findById(memberId).session(session);
    if (user && user.teamId && user.teamId.toString() === team.id.toString()) {
        user.role = newRole;
        await user.save({ session });
    }
    await session.commitTransaction();
    await logTeamActivityInMongoDB(teamId, actorId, 'member_role_changed', { memberName: member.name || member.email, oldRole, newRole }, 'user', memberId);
    return mongoTeamDocToTeam(savedTeam);
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating member role in MongoDB:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

export async function logTeamActivityInMongoDB(
  teamId: string,
  actorId: string, 
  actionType: TeamActivityType,
  details?: object,
  targetType?: TeamActivity['targetType'],
  targetId?: string,
  session?: mongoose.ClientSession
): Promise<string> {
  await dbConnect();
  try {
    const actor = await UserModel.findById(actorId).select('name email').session(session || null).exec();
    
    let targetNameResolved: string | undefined;
    if (targetType === 'user' && targetId) {
        const targetUser = await UserModel.findById(targetId).select('name email').session(session || null).exec();
        targetNameResolved = targetUser?.name || targetUser?.email || targetId;
        if (details && targetUser?.email && actionType === 'member_added') (details as any).memberEmail = targetUser.email;
        if (details && targetUser?.name && (actionType === 'member_added' || actionType === 'member_role_changed' || actionType === 'member_removed')) (details as any).memberName = targetUser.name;
    } else if (targetType === 'presentation' && details && (details as any).presentationTitle) {
        targetNameResolved = (details as any).presentationTitle;
    } else if (targetType === 'asset' && details && (details as any).fileName) {
        targetNameResolved = (details as any).fileName;
    } else if (targetType === 'invitation' && details && (details as any).invitedEmail) {
        targetNameResolved = (details as any).invitedEmail;
    }


    const activityData: Partial<Omit<TeamActivity, 'id'>> = { // Omit 'id' as it's auto-generated by Mongo
      teamId,
      actorId,
      actorName: actor?.name || actor?.email || actorId, 
      actionType,
      targetType,
      targetId,
      targetName: targetNameResolved,
      details,
    };

    const activity = new TeamActivityModel(activityData);
    const savedActivity = await activity.save({ session });
    return savedActivity.id.toString(); // Return string ID
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
    // Mongoose's .map already processes documents if not using .lean()
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

    const memberIds = Array.from(team.members.keys());
    for (const memberId of memberIds) {
        const user = await UserModel.findById(memberId).session(session);
        if (user && user.teamId && user.teamId.toString() === team.id.toString()) { 
            user.teamId = null;
            user.role = 'guest';
            await user.save({ session });
        }
    }
    
    await TeamActivityModel.deleteMany({ teamId }).session(session);
    const deletionResult = await TeamModel.findByIdAndDelete(teamId).session(session);
    
    await session.commitTransaction();
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

export async function getPendingTeamInvitationsForUserById(userId: string): Promise<Team[]> {
    await dbConnect();
    try {
        const teamsWithPendingInvites = await TeamModel.find({
            [`pendingInvitations.${userId}`]: { $exists: true }
        }).exec();

        return teamsWithPendingInvites
            .map(mongoTeamDocToTeam)
            .filter(t => t !== null && t.pendingInvitations && t.pendingInvitations[userId]) as Team[];
    } catch (error) {
        console.error(`Error fetching pending team invitations for user ID ${userId}:`, error);
        return [];
    }
}

export async function getPendingTeamInvitationsForUserByEmail(email: string): Promise<Team[]> {
    await dbConnect();
    try {
        const teamsWithPendingInvites = await TeamModel.find({}).exec();
        
        const userInvites: Team[] = [];
        for (const teamDoc of teamsWithPendingInvites) {
            if (teamDoc.pendingInvitations) {
                // Mongoose Map uses .get() to retrieve values by key
                // but here pendingInvitations is likely already a plain object after toObject
                const invitesMap = teamDoc.pendingInvitations;
                for (const inviteDetails of invitesMap.values()) { // Iterate over values of the Map
                    if (inviteDetails.email === email) {
                        const team = mongoTeamDocToTeam(teamDoc);
                        if(team) userInvites.push(team);
                        break; 
                    }
                }
            }
        }
        return userInvites;
    } catch (error) {
        console.error('Error fetching pending team invitations for user by email:', error);
        return [];
    }
}

export async function getGlobalPendingInvitationsCount(): Promise<number> {
    await dbConnect();
    try {
        const teams = await TeamModel.find({ 'pendingInvitations': { $exists: true, $ne: null } }).select('pendingInvitations').exec();
        let totalCount = 0;
        teams.forEach(team => {
            if (team.pendingInvitations) {
                totalCount += team.pendingInvitations.size;
            }
        });
        return totalCount;
    } catch (error) {
        console.error('Error fetching global pending invitations count:', error);
        return 0; // Return 0 on error or if none found
    }
}
