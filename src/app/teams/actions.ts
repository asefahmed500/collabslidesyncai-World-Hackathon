
'use server';

import { auth, db } from '@/lib/firebaseConfig';
import { doc, updateDoc, serverTimestamp, getDoc, writeBatch, FieldValue, deleteField } from 'firebase/firestore';
import type { Team, User as AppUser, TeamRole, TeamMember } from '@/types';
import { getUserByEmail, getTeamById, logTeamActivity, getUserProfile } from '@/lib/firestoreService';
import { revalidatePath } from 'next/cache';

interface TeamActionResponse {
  success: boolean;
  message: string;
  updatedTeam?: Team | null; // For settings update
  updatedTeamMembers?: { [userId: string]: TeamMember } | null; // For member updates
}

// Helper to check if the current user is an owner or admin of the team
async function canManageTeam(teamId: string, userId: string): Promise<boolean> {
  const team = await getTeamById(teamId);
  if (!team || !team.members[userId]) return false;
  return team.members[userId].role === 'owner' || team.members[userId].role === 'admin';
}

async function isTeamOwner(teamId: string, userId: string): Promise<boolean> {
  const team = await getTeamById(teamId);
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
  const allowGuestEdits = formData.get('allowGuestEdits') === 'on'; // Switch value
  const aiFeaturesEnabled = formData.get('aiFeaturesEnabled') === 'on'; // Switch value


  if (!teamName || teamName.length < 3) {
    return { success: false, message: 'Team name must be at least 3 characters.' };
  }

  try {
    const teamRef = doc(db, 'teams', teamId);
    const updateData: Partial<Team> & {branding: Partial<Team['branding']>, settings: Partial<Team['settings']>, lastUpdatedAt: FieldValue } = {
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
        lastUpdatedAt: serverTimestamp(),
    };
    
    // Clean undefined values from branding and settings to avoid overwriting with undefined
    Object.keys(updateData.branding).forEach(key => updateData.branding[key as keyof Team['branding']] === undefined && delete updateData.branding[key as keyof Team['branding']]);
    Object.keys(updateData.settings).forEach(key => updateData.settings[key as keyof Team['settings']] === undefined && delete updateData.settings[key as keyof Team['settings']]);


    await updateDoc(teamRef, updateData);
    const updatedTeamDoc = await getDoc(teamRef);
    const updatedTeamData = updatedTeamDoc.exists() ? { id: updatedTeamDoc.id, ...updatedTeamDoc.data() } as Team : null;

    await logTeamActivity(teamId, currentUserId, 'team_profile_updated', 'team_profile', teamId, { changedFields: ['name', 'branding', 'settings'] });
    
    revalidatePath(`/dashboard/manage-team`);
    return { success: true, message: 'Team profile updated successfully.', updatedTeam: updatedTeamData };
  } catch (error: any) {
    console.error("Error updating team profile:", error);
    return { success: false, message: error.message || 'Failed to update team profile.' };
  }
}


export async function addTeamMemberByEmail(teamId: string, email: string, role: TeamRole): Promise<TeamActionResponse> {
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

  try {
    const userToAdd = await getUserByEmail(email);
    if (!userToAdd) {
      return { success: false, message: `User with email ${email} not found.` };
    }

    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    if (!teamSnap.exists()) {
      return { success: false, message: 'Team not found.' };
    }
    const teamData = teamSnap.data() as Team;

    if (teamData.members[userToAdd.id]) {
      return { success: false, message: `${email} is already a member of this team.` };
    }

    const newMember: TeamMember = {
      role,
      joinedAt: serverTimestamp() as Timestamp,
      addedBy: currentUserId,
      name: userToAdd.name,
      email: userToAdd.email,
      profilePictureUrl: userToAdd.profilePictureUrl
    };

    const membersUpdatePath = `members.${userToAdd.id}`;
    await updateDoc(teamRef, {
      [membersUpdatePath]: newMember,
      lastUpdatedAt: serverTimestamp()
    });
    
    const updatedTeamSnap = await getDoc(teamRef);
    const updatedMembers = updatedTeamSnap.exists() ? (updatedTeamSnap.data() as Team).members : null;

    await logTeamActivity(teamId, currentUserId, 'member_added', 'user', userToAdd.id, { newRole: role, memberEmail: email });

    revalidatePath(`/dashboard/manage-team`);
    return { success: true, message: `${email} added to the team as ${role}.`, updatedTeamMembers: updatedMembers };

  } catch (error: any) {
    console.error("Error adding team member:", error);
    return { success: false, message: error.message || 'Failed to add team member.' };
  }
}

export async function updateTeamMemberRole(teamId: string, memberId: string, newRole: TeamRole): Promise<TeamActionResponse> {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) return { success: false, message: 'Authentication required.' };

  const hasPermission = await canManageTeam(teamId, currentUserId);
  if (!hasPermission) return { success: false, message: 'You do not have permission to change roles in this team.' };

  const teamRef = doc(db, 'teams', teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) return { success: false, message: 'Team not found.' };
  const teamData = teamSnap.data() as Team;

  const memberToUpdate = teamData.members[memberId];
  if (!memberToUpdate) return { success: false, message: 'Member not found in team.' };
  
  // Prevent changing owner's role unless by the owner themself (which should be transfer ownership)
  if (memberToUpdate.role === 'owner' && newRole !== 'owner') {
      const isCurrentUserOwner = await isTeamOwner(teamId, currentUserId);
      if(!isCurrentUserOwner || currentUserId !== memberId){ // only owner can demote themselves, but this should be a transfer function.
         return { success: false, message: 'Cannot change the role of the team owner directly. Use transfer ownership feature.' };
      }
  }
   if (newRole === 'owner' && memberToUpdate.role !== 'owner') {
      return { success: false, message: 'To make someone an owner, use the "Transfer Ownership" feature.' };
  }
  // Prevent admin from demoting owner or another admin unless current user is owner
  if ((memberToUpdate.role === 'owner' || memberToUpdate.role === 'admin') && !(await isTeamOwner(teamId, currentUserId))) {
      if (memberToUpdate.role === 'owner' || (memberToUpdate.role === 'admin' && teamData.members[currentUserId].role !== 'owner')) {
          return { success: false, message: 'Admins cannot change the role of owners or other admins unless they are the owner.' };
      }
  }


  const oldRole = memberToUpdate.role;
  const roleUpdatePath = `members.${memberId}.role`;
  await updateDoc(teamRef, {
    [roleUpdatePath]: newRole,
    lastUpdatedAt: serverTimestamp()
  });

  const updatedTeamSnap = await getDoc(teamRef);
  const updatedMembers = updatedTeamSnap.exists() ? (updatedTeamSnap.data() as Team).members : null;

  await logTeamActivity(teamId, currentUserId, 'member_role_changed', 'user', memberId, { oldRole, newRole });
  
  revalidatePath(`/dashboard/manage-team`);
  return { success: true, message: `Role for ${memberToUpdate.name || memberId} updated to ${newRole}.`, updatedTeamMembers: updatedMembers };
}


export async function removeTeamMember(teamId: string, memberIdToRemove: string): Promise<TeamActionResponse> {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) return { success: false, message: 'Authentication required.' };

  const hasPermission = await canManageTeam(teamId, currentUserId);
  if (!hasPermission) return { success: false, message: 'You do not have permission to remove members from this team.' };

  if (currentUserId === memberIdToRemove) {
    return { success: false, message: 'You cannot remove yourself. Leave the team instead.' };
  }

  const teamRef = doc(db, 'teams', teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) return { success: false, message: 'Team not found.' };
  const teamData = teamSnap.data() as Team;

  const memberToRemove = teamData.members[memberIdToRemove];
  if (!memberToRemove) return { success: false, message: 'Member not found in team.' };

  if (memberToRemove.role === 'owner') {
    return { success: false, message: 'Cannot remove the team owner. Transfer ownership first.' };
  }
  
  // Ensure admin cannot remove another admin unless current user is owner
  if (memberToRemove.role === 'admin' && teamData.members[currentUserId].role !== 'owner') {
      return { success: false, message: 'Admins can only be removed by the team owner.' };
  }


  const memberRemovePath = `members.${memberIdToRemove}`;
  await updateDoc(teamRef, {
    [memberRemovePath]: deleteField(),
    lastUpdatedAt: serverTimestamp()
  });
  
  const updatedTeamSnap = await getDoc(teamRef);
  const updatedMembers = updatedTeamSnap.exists() ? (updatedTeamSnap.data() as Team).members : null;

  await logTeamActivity(teamId, currentUserId, 'member_removed', 'user', memberIdToRemove, { memberName: memberToRemove.name });
  
  revalidatePath(`/dashboard/manage-team`);
  return { success: true, message: `${memberToRemove.name || memberIdToRemove} removed from the team.`, updatedTeamMembers: updatedMembers };
}
