
import dbConnect from './mongodb';
import TeamModel, { type TeamDocument, type TeamMemberDocument } from '@/models/Team';
import UserModel from '@/models/User'; 
import TeamActivityModel from '@/models/TeamActivity';
import type { Team, TeamMember, TeamRole, TeamActivity, TeamActivityType, User as AppUser } from '@/types';
import mongoose, { Types } from 'mongoose'; // Import mongoose for session
import { updateUserTeamAndRoleInMongoDB } from './mongoUserService';
import { createNotification } from './firestoreService'; 
import { sendEmail, createTeamInviteEmail } from './emailService'; // Import email service

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
    // lastUpdatedAt is handled by Mongoose timestamps: true

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
    
    // Create an in-app notification for the invited user
    await createNotification(
      userToInvite.id,
      'team_invitation',
      `Invitation to join Team "${team.name}"`,
      `${inviter?.name || 'A team admin'} invited you to join the team "${team.name}" as a ${role}.`,
      `/dashboard?tab=invitations`, // Link to a dashboard tab or page where invites can be managed
      invitedByUserId,
      inviter?.name || undefined,
      inviter?.profilePictureUrl || undefined,
      team.id, // teamIdForAction
      role      // roleForAction
    );

    // Store pending invitation (using userId as key for simplicity if user exists)
    // If we were handling non-existent users, email could be a key.
    const inviteId = new Types.ObjectId().toHexString(); // Or uuid
    team.pendingInvitations = team.pendingInvitations || new Map();
    team.pendingInvitations.set(userToInvite.id, { // Key by userToInvite.id
        inviteId,
        email: userToInvite.email || '',
        role,
        invitedBy: invitedByUserId,
        invitedAt: new Date(),
        token: '', // Token could be added for email link verification later
    });

    const savedTeam = await team.save();

    // Send email notification for team invite
    if (userToInvite.email && inviter) {
        // For now, the email link will be generic; a token-based link is for more advanced email verification
        const teamLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/dashboard`;
        const emailContent = createTeamInviteEmail(
            userToInvite.name || userToInvite.email,
            inviter.name || 'Team Admin',
            team.name,
            teamLink,
            role
        );
        emailContent.htmlBody = emailContent.htmlBody.replace("added you to the team", "invited you to join the team");
        emailContent.htmlBody += `<p>You can accept or decline this invitation from your dashboard notifications.</p>`;
        try {
            await sendEmail({
                to: userToInvite.email,
                subject: `You're invited to join Team "${team.name}"`,
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
  actorWhoInvitedId: string, // The original inviter
  actorWhoInvitedName?: string
): Promise<Team | null> {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const team = await TeamModel.findById(teamId).session(session);
    if (!team) throw new Error('Team not found.');
    
    // Check if invitation exists for this user in pendingInvitations
    // Assuming pendingInvitations keys by userId after we confirmed user exists
    const pendingInvite = team.pendingInvitations?.get(invitedUserId);
    if (!pendingInvite) {
      // Check if already a member (e.g., if action was somehow duplicated)
      if (team.members.get(invitedUserId)) {
        console.warn(`User ${invitedUserId} is already a member of team ${teamId}. Invitation processing skipped.`);
        await session.abortTransaction();
        session.endSession();
        return mongoTeamDocToTeam(team); // Return current team state
      }
      throw new Error('No pending invitation found for this user or invitation already processed.');
    }

    const invitedUser = await UserModel.findById(invitedUserId).session(session);
    if (!invitedUser) throw new Error('Invited user not found.');

    if (accepted) {
      if (invitedUser.teamId && invitedUser.teamId !== team.id) {
        throw new Error(`User ${invitedUser.name || invitedUser.email} is already part of another team.`);
      }
      if (invitedUser.teamId === team.id) { // Should not happen if pending invite exists, but good check
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
      
      invitedUser.teamId = team.id;
      invitedUser.role = roleToAssign;
      await invitedUser.save({ session });

      await logTeamActivityInMongoDB(teamId, invitedUserId, 'member_added', { 
        memberName: invitedUser.name || invitedUser.email, 
        roleAssigned: roleToAssign,
        method: 'invitation_accepted'
      }, 'user', invitedUserId);
      
      // Notify original inviter or team admins
      await createNotification(
        pendingInvite.invitedBy, // Notify the person who invited
        'generic_info',
        `Invitation Accepted: ${invitedUser.name || invitedUser.email}`,
        `${invitedUser.name || invitedUser.email} accepted your invitation to join Team "${team.name}" as a ${roleToAssign}.`,
        `/dashboard/manage-team?teamId=${team.id}`,
        invitedUserId, invitedUser.name, invitedUser.profilePictureUrl
      );

    } else { // Declined
      await logTeamActivityInMongoDB(teamId, invitedUserId, 'invitation_declined', { 
          declinedByEmail: invitedUser.email, 
          declinedByName: invitedUser.name 
      }, 'invitation', invitedUserId);
       // Notify original inviter or team admins
       await createNotification(
        pendingInvite.invitedBy, 
        'generic_info',
        `Invitation Declined: ${invitedUser.name || invitedUser.email}`,
        `${invitedUser.name || invitedUser.email} declined your invitation to join Team "${team.name}".`,
        undefined, // No specific link needed for decline
        invitedUserId, invitedUser.name, invitedUser.profilePictureUrl
      );
    }

    // Remove from pending invitations
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
  try {
    const team = await TeamModel.findById(teamId).exec();
    if (!team) throw new Error('Team not found.');
    const memberBeingRemoved = team.members.get(memberIdToRemove);
    if (!memberBeingRemoved) throw new Error('Member not found in team.');
    if (team.ownerId === memberIdToRemove) throw new Error('Cannot remove the team owner.');

    team.members.delete(memberIdToRemove);
    const savedTeam = await team.save();

    const user = await UserModel.findById(memberIdToRemove).exec();
    if(user && user.teamId && user.teamId.toString() === team.id.toString()) {
        await updateUserTeamAndRoleInMongoDB(memberIdToRemove, null, 'guest');
    }
    await logTeamActivityInMongoDB(teamId, actorId, 'member_removed', { memberName: memberBeingRemoved.name || memberBeingRemoved.email }, 'user', memberIdToRemove);
    // TODO: Optionally send email notification to the removed member
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
    const savedTeam = await team.save();

    const user = await UserModel.findById(memberId).exec();
    if (user && user.teamId && user.teamId.toString() === team.id.toString()) {
        await updateUserTeamAndRoleInMongoDB(memberId, teamId, newRole);
    }
    await logTeamActivityInMongoDB(teamId, actorId, 'member_role_changed', { memberName: member.name || member.email, oldRole, newRole }, 'user', memberId);
    // TODO: Optionally send email notification about role change
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
    } else if (targetType === 'invitation' && details && (details as any).invitedEmail) {
        targetNameResolved = (details as any).invitedEmail;
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

// New function to get pending invitations for a user by their email
// This could be used on user dashboard or after signup to check for pending invites
export async function getPendingTeamInvitationsForUserByEmail(email: string): Promise<Team[]> {
    await dbConnect();
    try {
        // Find teams where this email exists as a key in pendingInvitations
        const teamsWithPendingInvites = await TeamModel.find({
            [`pendingInvitations.${email.replace(/\./g, '_')}`]: { $exists: true } // Handle dot in email for Map keys if necessary, or use a different keying strategy
        }).exec();
        // This query is a bit tricky with Map keys. A better schema for pendingInvitations might be an array of objects.
        // For now, this is a conceptual query. A more robust way would be to iterate or use a proper invitation collection.
        // For now, let's assume this works or filter in application code if Map keys are complex
        return teamsWithPendingInvites
            .filter(teamDoc => teamDoc.pendingInvitations?.has(email)) // Ensure the invite actually exists for this email
            .map(mongoTeamDocToTeam)
            .filter(t => t !== null) as Team[];
    } catch (error) {
        console.error('Error fetching pending team invitations for user by email:', error);
        return [];
    }
}

export async function getPendingTeamInvitationsForUserById(userId: string): Promise<Team[]> {
    await dbConnect();
    try {
        // Find teams where this userId exists as a key in pendingInvitations
        const teamsWithPendingInvites = await TeamModel.find({
            [`pendingInvitations.${userId}`]: { $exists: true }
        }).exec();

        return teamsWithPendingInvites
            .map(mongoTeamDocToTeam)
            .filter(t => t !== null) as Team[];
    } catch (error) {
        console.error(`Error fetching pending team invitations for user ID ${userId}:`, error);
        return [];
    }
}
