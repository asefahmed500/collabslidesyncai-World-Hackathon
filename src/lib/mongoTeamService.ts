
import dbConnect from './mongodb';
import TeamModel, { type TeamDocument, type TeamMemberDocument } from '@/models/Team';
import UserModel from '@/models/User'; 
import TeamActivityModel from '@/models/TeamActivity';
import type { Team, TeamMember, TeamRole, TeamActivity, TeamActivityType, User as AppUser } from '@/types';
import mongoose, { Types } from 'mongoose'; // Import mongoose for session
import { updateUserTeamAndRoleInMongoDB } from './mongoUserService';
import { createNotification } from './firestoreService'; 
import { sendEmail, createTeamInviteEmail } from './emailService'; 

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
  
  // Handle pendingInvitations if it exists
  if (teamObject.pendingInvitations && teamObject.pendingInvitations instanceof Map) {
    const newPendingInvitesObj: { [key: string]: any } = {};
    teamObject.pendingInvitations.forEach((value: any, key: string) => {
        const invitePlain = typeof value.toObject === 'function' ? value.toObject() : value;
        newPendingInvitesObj[key] = { ...invitePlain, invitedAt: new Date(invitePlain.invitedAt) };
    });
    teamObject.pendingInvitations = newPendingInvitesObj;
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
    await logTeamActivityInMongoDB(savedTeam.id, ownerUser.id, 'team_created', { teamName: savedTeam.name });
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

    const updatedTeamDoc = await TeamModel.findByIdAndUpdate(teamId, updatePayload, { new: true }).exec();
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
      team.id, 
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
      
      // Update user document
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
        `/dashboard/manage-team?teamId=${team.id}`,
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
    const memberBeingRemoved = team.members.get(memberIdToRemove);
    if (!memberBeingRemoved) throw new Error('Member not found in team.');
    if (team.ownerId === memberIdToRemove) throw new Error('Cannot remove the team owner.');

    team.members.delete(memberIdToRemove);
    const savedTeam = await team.save({ session });

    const user = await UserModel.findById(memberIdToRemove).session(session);
    if(user && user.teamId && user.teamId.toString() === team.id.toString()) {
        user.teamId = null;
        user.role = 'guest';
        await user.save({ session });
    }
    await session.commitTransaction();
    await logTeamActivityInMongoDB(teamId, actorId, 'member_removed', { memberName: memberBeingRemoved.name || memberBeingRemoved.email }, 'user', memberIdToRemove);
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
  session?: mongoose.ClientSession // Optional session for transactions
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


    const activityData: Partial<TeamActivity> = {
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
                for (const [_inviteId, inviteDetails] of teamDoc.pendingInvitations.entries()) {
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
