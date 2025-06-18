
'use server';

import { auth } from '@/lib/firebaseConfig';
import { 
    getTeamFromMongoDB, 
    updateTeamInMongoDB,
    addMemberToTeamInMongoDB,
    removeMemberFromTeamInMongoDB,
    updateMemberRoleInMongoDB,
    logTeamActivityInMongoDB
} from '@/lib/mongoTeamService';
import { getUserByEmailFromMongoDB, getUserFromMongoDB, updateUserTeamAndRoleInMongoDB } from '@/lib/mongoUserService';
import type { Team, TeamRole, TeamMember, User as AppUser } from '@/types';
import { revalidatePath } from 'next/cache';

interface TeamActionResponse {
  success: boolean;
  message: string;
  updatedTeam?: Team | null;
  updatedTeamMembers?: { [userId: string]: TeamMember } | null;
}

// Helper to check if the current user is an owner or admin of the team
async function canManageTeam(teamId: string, userId: string): Promise<boolean> {
  const team = await getTeamFromMongoDB(teamId);
  if (!team || !team.members[userId]) return false;
  return team.members[userId].role === 'owner' || team.members[userId].role === 'admin';
}

async function isTeamOwner(teamId: string, userId: string): Promise<boolean> {
  const team = await getTeamFromMongoDB(teamId);
  if (!team || !team.members[userId]) return false;
  return team.members[userId].role === 'owner';
}

export async function updateTeamProfile(prevState: any, formData: FormData): Promise<TeamActionResponse> {
  const teamId = formData.get('teamId') as string;
  const currentUserId = auth.currentUser?.uid;

  if (!currentUserId) {
    return { success: false, message: 'You must be logged in.' };
  }
  if (!teamId) {
    return { success: false, message: 'Team ID is missing.' };
  }

  const hasPermission = await canManageTeam(teamId, currentUserId);
  if (!hasPermission) {
    return { success: false, message: 'You do not have permission to update this team.' };
  }
  
  const teamName = formData.get('teamName') as string;
  const logoUrl = formData.get('logoUrl') as string;
  const primaryColor = formData.get('primaryColor') as string;
  const secondaryColor = formData.get('secondaryColor') as string;
  const fontPrimary = formData.get('fontPrimary') as string;
  const fontSecondary = formData.get('fontSecondary') as string;
  const allowGuestEdits = formData.get('allowGuestEdits') === 'on';
  const aiFeaturesEnabled = formData.get('aiFeaturesEnabled') === 'on';

  if (!teamName || teamName.length < 3) {
    return { success: false, message: 'Team name must be at least 3 characters.' };
  }

  try {
    const updateData: Partial<Omit<Team, 'id' | 'ownerId' | 'members' | 'createdAt' | 'lastUpdatedAt'>> = {
        name: teamName,
        branding: {
            logoUrl: logoUrl || undefined, // Allow empty string to clear
            primaryColor: primaryColor || undefined,
            secondaryColor: secondaryColor || undefined,
            fontPrimary: fontPrimary || undefined,
            fontSecondary: fontSecondary || undefined,
        },
        settings: {
            allowGuestEdits: allowGuestEdits,
            aiFeaturesEnabled: aiFeaturesEnabled,
        },
    };
    
    const updatedTeam = await updateTeamInMongoDB(teamId, updateData);
    if (!updatedTeam) {
        return { success: false, message: 'Failed to update team in database.' };
    }

    await logTeamActivityInMongoDB(teamId, currentUserId, 'team_profile_updated', { changedFields: Object.keys(updateData) });
    
    revalidatePath(`/dashboard/manage-team`);
    return { success: true, message: 'Team profile updated successfully.', updatedTeam };
  } catch (error: any) {
    console.error("Error updating team profile:", error);
    return { success: false, message: error.message || 'Failed to update team profile.' };
  }
}

export async function addTeamMemberByEmailAction(teamId: string, email: string, role: TeamRole): Promise<TeamActionResponse> {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) {
    return { success: false, message: 'Authentication required.' };
  }

  const hasPermission = await canManageTeam(teamId, currentUserId);
  if (!hasPermission) {
    return { success: false, message: 'You do not have permission to add members to this team.' };
  }
  if (role === 'owner') { // Prevent assigning owner role directly
      return { success: false, message: 'Cannot assign owner role directly. Transfer ownership instead.'}
  }
  if (role === 'admin' && !(await isTeamOwner(teamId, currentUserId))) {
    return { success: false, message: 'Only team owners can assign the admin role.' };
  }


  try {
    const userToAdd = await getUserByEmailFromMongoDB(email);
    if (!userToAdd) {
      return { success: false, message: `User with email ${email} not found. Users must have an existing CollabSlideSyncAI account.` };
    }
    if (userToAdd.teamId && userToAdd.teamId !== teamId) {
      // Handle case where user is already in another team.
      // For now, we might prevent adding or require them to leave their current team first.
      // This simplistic model assumes one primary team or the admin is overriding.
      // Let's allow adding, but this could be refined.
      console.warn(`User ${email} is already part of team ${userToAdd.teamId}. Adding to ${teamId}.`);
    }


    const updatedTeam = await addMemberToTeamInMongoDB(teamId, userToAdd, role, currentUserId);
    if (!updatedTeam) {
        return { success: false, message: 'Failed to add member to team in database.' };
    }
    
    // If the user wasn't part of any team, update their primary teamId and role
    if (!userToAdd.teamId) {
        await updateUserTeamAndRoleInMongoDB(userToAdd.id, teamId, role);
    }

    await logTeamActivityInMongoDB(teamId, currentUserId, 'member_added', { newRole: role }, 'user', userToAdd.id);

    revalidatePath(`/dashboard/manage-team`);
    return { success: true, message: `${userToAdd.name || email} added to the team as ${role}.`, updatedTeamMembers: updatedTeam.members };

  } catch (error: any) {
    console.error("Error adding team member:", error);
    return { success: false, message: error.message || 'Failed to add team member.' };
  }
}

export async function updateTeamMemberRoleAction(teamId: string, memberId: string, newRole: TeamRole): Promise<TeamActionResponse> {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) return { success: false, message: 'Authentication required.' };

  const team = await getTeamFromMongoDB(teamId);
  if (!team) return { success: false, message: 'Team not found.' };

  const currentMemberInfo = team.members[currentUserId];
  if (!currentMemberInfo || (currentMemberInfo.role !== 'owner' && currentMemberInfo.role !== 'admin')) {
    return { success: false, message: 'You do not have permission to change roles.' };
  }

  const memberToUpdate = team.members[memberId];
  if (!memberToUpdate) return { success: false, message: 'Member not found in team.' };
  
  if (memberToUpdate.role === 'owner' && newRole !== 'owner') {
     return { success: false, message: 'Cannot change the role of the team owner directly. Use transfer ownership feature.' };
  }
  if (newRole === 'owner' && memberToUpdate.role !== 'owner') { // Cannot promote to owner, must use transfer
      return { success: false, message: 'To make someone an owner, use the "Transfer Ownership" feature (Not yet fully implemented).' };
  }
  if (newRole === 'admin' && currentMemberInfo.role !== 'owner') { // Only owner can make admins
      return { success: false, message: 'Only team owners can promote members to admin.' };
  }
  if (memberToUpdate.role === 'admin' && currentMemberInfo.role !== 'owner' && memberId !== currentUserId) { // Admin can't change another admin's role
      return { success: false, message: 'Admins cannot change the role of other admins.' };
  }
  if (memberToUpdate.role === 'admin' && newRole !== 'admin' && currentMemberInfo.role !== 'owner') { // Admin can't demote another admin
      return { success: false, message: 'Only team owners can demote admins.' };
  }


  const oldRole = memberToUpdate.role;
  const updatedTeam = await updateMemberRoleInMongoDB(teamId, memberId, newRole);
   if (!updatedTeam) {
        return { success: false, message: 'Failed to update member role in database.' };
    }

  await logTeamActivityInMongoDB(teamId, currentUserId, 'member_role_changed', { oldRole, newRole }, 'user', memberId);
  
  revalidatePath(`/dashboard/manage-team`);
  return { success: true, message: `Role for ${memberToUpdate.name || memberId} updated to ${newRole}.`, updatedTeamMembers: updatedTeam.members };
}


export async function removeTeamMemberAction(teamId: string, memberIdToRemove: string): Promise<TeamActionResponse> {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) return { success: false, message: 'Authentication required.' };

  const team = await getTeamFromMongoDB(teamId);
  if (!team) return { success: false, message: 'Team not found.' };
  
  const currentMemberInfo = team.members[currentUserId];
  if (!currentMemberInfo || (currentMemberInfo.role !== 'owner' && currentMemberInfo.role !== 'admin')) {
    return { success: false, message: 'You do not have permission to remove members.' };
  }

  if (currentUserId === memberIdToRemove) {
    return { success: false, message: 'You cannot remove yourself. Leave the team instead (feature not yet fully implemented).' };
  }

  const memberToRemove = team.members[memberIdToRemove];
  if (!memberToRemove) return { success: false, message: 'Member not found in team.' };

  if (memberToRemove.role === 'owner') {
    return { success: false, message: 'Cannot remove the team owner. Transfer ownership first.' };
  }
  if (memberToRemove.role === 'admin' && currentMemberInfo.role !== 'owner') {
      return { success: false, message: 'Admins can only be removed by the team owner.' };
  }

  const updatedTeam = await removeMemberFromTeamInMongoDB(teamId, memberIdToRemove);
  if (!updatedTeam) {
        return { success: false, message: 'Failed to remove member in database.' };
    }

  await logTeamActivityInMongoDB(teamId, currentUserId, 'member_removed', { reason: 'Removed by admin/owner' }, 'user', memberIdToRemove);
  
  revalidatePath(`/dashboard/manage-team`);
  return { success: true, message: `${memberToRemove.name || memberIdToRemove} removed from the team.`, updatedTeamMembers: updatedTeam.members };
}

// Placeholder for Transfer Ownership - This is a complex operation
export async function transferTeamOwnershipAction(teamId: string, newOwnerId: string): Promise<TeamActionResponse> {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return { success: false, message: "Authentication required."};
    
    const team = await getTeamFromMongoDB(teamId);
    if (!team) return { success: false, message: "Team not found." };
    if (team.ownerId !== currentUserId) return { success: false, message: "Only the current team owner can transfer ownership."};
    if (currentUserId === newOwnerId) return { success: false, message: "You are already the owner."};
    
    const newOwnerMemberInfo = team.members[newOwnerId];
    if (!newOwnerMemberInfo) return { success: false, message: "Target user is not a member of this team."};

    // Actual logic:
    // 1. Update old owner's role in team.members (e.g., to 'admin').
    // 2. Update new owner's role in team.members to 'owner'.
    // 3. Update team's root ownerId field.
    // 4. Update old owner's primary role in their User document.
    // 5. Update new owner's primary role in their User document.
    // 6. Log activity.
    // This needs to be a transaction.
    console.warn(`Attempting to transfer ownership of team ${teamId} from ${currentUserId} to ${newOwnerId} - Full implementation is complex and currently stubbed.`);
    
    // For now, just return a message.
    return { success: false, message: "Team ownership transfer is a complex operation and not fully implemented in this pass. This requires careful transactional updates across User and Team collections."};
}

    