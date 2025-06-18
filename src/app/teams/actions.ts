
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
import { getUserByEmailFromMongoDB, getUserFromMongoDB } from '@/lib/mongoUserService';
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
            logoUrl: logoUrl || undefined,
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
  if (role === 'owner') {
      return { success: false, message: 'Cannot assign owner role directly. Transfer ownership instead.'}
  }
  if (role === 'admin' && !(await isTeamOwner(teamId, currentUserId))) {
    return { success: false, message: 'Only team owners can assign the admin role.' };
  }


  try {
    const userToAdd = await getUserByEmailFromMongoDB(email);
    if (!userToAdd) {
      return { success: false, message: `User with email ${email} not found.` };
    }

    const updatedTeam = await addMemberToTeamInMongoDB(teamId, userToAdd, role, currentUserId);
    if (!updatedTeam) {
        return { success: false, message: 'Failed to add member to team in database.' };
    }
    
    await logTeamActivityInMongoDB(teamId, currentUserId, 'member_added', { newRole: role, memberEmail: email }, 'user', userToAdd.id);

    revalidatePath(`/dashboard/manage-team`);
    return { success: true, message: `${email} added to the team as ${role}.`, updatedTeamMembers: updatedTeam.members };

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
  if (newRole === 'owner' && memberToUpdate.role !== 'owner') {
      return { success: false, message: 'To make someone an owner, use the "Transfer Ownership" feature.' };
  }
  if (newRole === 'admin' && currentMemberInfo.role !== 'owner') {
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

  await logTeamActivityInMongoDB(teamId, currentUserId, 'member_role_changed', { oldRole, newRole, memberName: memberToUpdate.name || memberId }, 'user', memberId);
  
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
    return { success: false, message: 'You cannot remove yourself. Leave the team instead (feature not yet implemented).' };
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

  await logTeamActivityInMongoDB(teamId, currentUserId, 'member_removed', { memberName: memberToRemove.name || memberIdToRemove }, 'user', memberIdToRemove);
  
  revalidatePath(`/dashboard/manage-team`);
  return { success: true, message: `${memberToRemove.name || memberIdToRemove} removed from the team.`, updatedTeamMembers: updatedTeam.members };
}

// Placeholder for Transfer Ownership - This is a complex operation
export async function transferTeamOwnershipAction(teamId: string, newOwnerId: string): Promise<TeamActionResponse> {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return { success: false, message: "Authentication required."};
    if (!(await isTeamOwner(teamId, currentUserId))) return { success: false, message: "Only the current team owner can transfer ownership."};
    if (currentUserId === newOwnerId) return { success: false, message: "You are already the owner."};
    
    // TODO: Implement actual logic:
    // 1. Verify newOwnerId is a current member of the team.
    // 2. Update old owner's role (e.g., to 'admin' or 'editor').
    // 3. Update new owner's role to 'owner'.
    // 4. Update team's ownerId field.
    // 5. Log activity.
    console.log(`Transfer ownership of team ${teamId} to ${newOwnerId} - NOT IMPLEMENTED`);
    return { success: false, message: "Team ownership transfer is not yet implemented."};
}
