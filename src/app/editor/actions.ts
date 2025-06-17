
'use server';

import { auth, db } from '@/lib/firebaseConfig';
import { 
  updatePresentation as apiUpdatePresentation, 
  getPresentationById,
  getUserByEmail,
  logPresentationActivity,
  getUserProfile
} from '@/lib/firestoreService';
import type { Presentation, PresentationAccessRole, User as AppUser } from '@/types';
import { revalidatePath } from 'next/cache';
import { deleteField } from 'firebase/firestore';

interface ShareSettingsActionResponse {
  success: boolean;
  message: string;
  updatedPresentation?: Presentation | null;
}

interface VerifyPasswordActionResponse {
  success: boolean;
  message: string;
}

export async function updatePresentationShareSettingsAction(
  prevState: any,
  formData: FormData
): Promise<ShareSettingsActionResponse> {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) {
    return { success: false, message: 'Authentication required.' };
  }

  const presentationId = formData.get('presentationId') as string;
  if (!presentationId) {
    return { success: false, message: 'Presentation ID is missing.' };
  }

  const presentation = await getPresentationById(presentationId);
  if (!presentation) {
    return { success: false, message: 'Presentation not found.' };
  }

  // Permission check: Only creator or those with 'owner' role in access map can change settings
  const isCreator = presentation.creatorId === currentUserId;
  const isOwnerInAccess = presentation.access[currentUserId] === 'owner';
  if (!isCreator && !isOwnerInAccess) {
    return { success: false, message: 'You do not have permission to change sharing settings for this presentation.' };
  }
  
  const updates: Partial<Presentation> = { settings: { ...presentation.settings }, access: { ...presentation.access } };
  let activityDetails: any = {};
  let mainActionType: Presentation['settings'] | 'collaborator_update' = 'sharing_settings_updated';


  // Handle isPublic toggle
  const isPublic = formData.get('isPublic') === 'on';
  if (isPublic !== presentation.settings.isPublic) {
    updates.settings!.isPublic = isPublic;
    activityDetails.changedSetting = 'isPublic';
    activityDetails.oldValue = presentation.settings.isPublic;
    activityDetails.newValue = isPublic;
    if (!isPublic) { // If making private, also turn off password protection
      updates.settings!.passwordProtected = false;
      updates.settings!.password = deleteField() as any; // Remove password if making private
    }
  }

  // Handle password protection (only if public)
  if (updates.settings!.isPublic) {
    const passwordProtected = formData.get('passwordProtected') === 'on';
    const password = formData.get('password') as string | null;

    if (passwordProtected !== presentation.settings.passwordProtected) {
        updates.settings!.passwordProtected = passwordProtected;
        activityDetails.changedSetting = 'passwordProtected';
        activityDetails.oldValue = presentation.settings.passwordProtected;
        activityDetails.newValue = passwordProtected;
    }

    if (passwordProtected) {
      if (password && password.length > 0) { // Only update password if a new one is provided
        updates.settings!.password = password;
        mainActionType = 'password_set';
      } else if (!presentation.settings.password) { // If enabling protection and no password existed and none provided
         return { success: false, message: 'Please provide a password when enabling password protection.' };
      }
      // If passwordProtected is true but no new password is provided, existing password remains.
    } else {
      updates.settings!.password = deleteField() as any; // Remove password if protection is disabled
      if (presentation.settings.passwordProtected) mainActionType = 'password_removed';
    }
  } else { // Not public, so ensure password protection is off
      updates.settings!.passwordProtected = false;
      updates.settings!.password = deleteField() as any;
  }
  
  // Handle collaborator invitations
  const inviteEmail = formData.get('inviteEmail') as string;
  const inviteRole = formData.get('inviteRole') as PresentationAccessRole;

  if (inviteEmail && inviteRole) {
    const userToInvite = await getUserByEmail(inviteEmail);
    if (!userToInvite) {
      return { success: false, message: `User with email ${inviteEmail} not found.` };
    }
    if (userToInvite.id === presentation.creatorId) {
         return { success: false, message: `User ${inviteEmail} is already the owner.` };
    }
    updates.access![userToInvite.id] = inviteRole;
    mainActionType = 'collaborator_update'; // More specific activity later
    await logPresentationActivity(presentationId, currentUserId, 'collaborator_added', {
        targetUserId: userToInvite.id,
        newRole: inviteRole,
    });
  }

  // Handle changes to existing collaborators (roles, removals)
  // FormData only gives us one value per name, so we need to structure names carefully
  // Example: `access[userIdToRemove]=remove`, `access[userIdToChangeRole]=newRole`
  for (const key of formData.keys()) {
    if (key.startsWith('access[')) { // e.g. access[someUserId]
      const userId = key.substring(key.indexOf('[') + 1, key.indexOf(']'));
      const newRoleOrAction = formData.get(key) as string;

      if (userId === presentation.creatorId) continue; // Cannot change/remove creator's owner role here

      if (newRoleOrAction === 'remove') {
        if (updates.access![userId]) {
            const oldRole = presentation.access[userId];
            updates.access![userId] = deleteField() as any;
            await logPresentationActivity(presentationId, currentUserId, 'collaborator_removed', {
                targetUserId: userId,
                oldRole: oldRole
            });
            mainActionType = 'collaborator_update';
        }
      } else if (['editor', 'viewer'].includes(newRoleOrAction) && updates.access![userId] !== newRoleOrAction) {
         const oldRole = presentation.access[userId];
         updates.access![userId] = newRoleOrAction as PresentationAccessRole;
         await logPresentationActivity(presentationId, currentUserId, 'collaborator_role_changed', {
            targetUserId: userId,
            oldRole: oldRole,
            newRole: newRoleOrAction as PresentationAccessRole
         });
         mainActionType = 'collaborator_update';
      }
    }
  }


  try {
    await apiUpdatePresentation(presentationId, updates);
    const updatedPresentation = await getPresentationById(presentationId); // Fetch updated
    
    if (mainActionType !== 'collaborator_update' && mainActionType !== 'password_set' && mainActionType !== 'password_removed') {
       await logPresentationActivity(presentationId, currentUserId, 'sharing_settings_updated', activityDetails);
    }


    revalidatePath(`/editor/${presentationId}`);
    return { success: true, message: 'Sharing settings updated successfully.', updatedPresentation };
  } catch (error: any) {
    console.error("Error updating share settings:", error);
    return { success: false, message: error.message || 'Failed to update settings.' };
  }
}

export async function verifyPasswordAction(
  prevState: any,
  formData: FormData
): Promise<VerifyPasswordActionResponse> {
  const presentationId = formData.get('presentationId') as string;
  const passwordAttempt = formData.get('passwordAttempt') as string;

  if (!presentationId || !passwordAttempt) {
    return { success: false, message: 'Presentation ID and password are required.' };
  }

  const presentation = await getPresentationById(presentationId);
  if (!presentation) {
    return { success: false, message: 'Presentation not found.' };
  }

  if (!presentation.settings.passwordProtected || !presentation.settings.password) {
    return { success: false, message: 'This presentation is not password protected.' };
  }

  if (presentation.settings.password === passwordAttempt) {
    // In a real app, you might issue a short-lived token or set a session flag here
    // For now, success means client-side can proceed.
    return { success: true, message: 'Password verified.' };
  } else {
    return { success: false, message: 'Incorrect password.' };
  }
}
