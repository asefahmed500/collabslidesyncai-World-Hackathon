
'use server';

import { auth, db } from '@/lib/firebaseConfig';
import { 
  updatePresentation as apiUpdatePresentation, 
  getPresentationById,
  getUserByEmail, // This correctly uses mongoUserService via firestoreService
  logPresentationActivity,
  createNotification, // Import for notifications
} from '@/lib/firestoreService';
import type { Presentation, PresentationAccessRole, User as AppUser, NotificationType } from '@/types';
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
  const currentFirebaseUser = auth.currentUser; // Get current Firebase User
  if (!currentFirebaseUser) {
    return { success: false, message: 'Authentication required.' };
  }
  const currentUserId = currentFirebaseUser.uid;
  const currentUserName = currentFirebaseUser.displayName; // Get current user's name
  const currentUserProfilePic = currentFirebaseUser.photoURL;


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
  const isOwnerInAccessMap = presentation.access && presentation.access[currentUserId] === 'owner';
  if (!isCreator && !isOwnerInAccessMap) {
    return { success: false, message: 'You do not have permission to change sharing settings for this presentation.' };
  }
  
  const updates: Partial<Presentation> = { 
    settings: { ...(presentation.settings || { isPublic: false, passwordProtected: false, commentsAllowed: true }) }, // Ensure settings object exists
    access: { ...(presentation.access || {}) } // Ensure access object exists
  };
  let activityDetails: any = {};
  let mainActionType: 'sharing_settings_updated' | 'password_set' | 'password_removed' | 'collaborator_update' = 'sharing_settings_updated';


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
        updates.settings!.password = password; // Firestore will hash this if rules are set up for it (not by default)
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
    const userToInvite = await getUserByEmail(inviteEmail); // This calls mongoUserService via firestoreService
    if (!userToInvite) {
      return { success: false, message: `User with email ${inviteEmail} not found.` };
    }
    if (userToInvite.id === presentation.creatorId) {
         return { success: false, message: `User ${inviteEmail} is already the owner.` };
    }
    updates.access![userToInvite.id] = inviteRole;
    // Log specific collaborator added event
    await logPresentationActivity(presentationId, currentUserId, 'collaborator_added', {
        targetUserId: userToInvite.id,
        targetUserName: userToInvite.name || userToInvite.email,
        newRole: inviteRole,
    });
    
    // Create notification for the invited user
    await createNotification(
      userToInvite.id,
      'presentation_shared',
      `Presentation Shared: "${presentation.title}"`,
      `${currentUserName || 'Someone'} shared the presentation "${presentation.title}" with you as an ${inviteRole}.`,
      `/editor/${presentationId}`,
      currentUserId,
      currentUserName || undefined,
      currentUserProfilePic || undefined
    );
    // TODO: Trigger email notification for presentation shared

    mainActionType = 'collaborator_update'; // Indicate a collaborator change happened
  }

  // Handle changes to existing collaborators (roles, removals)
  // FormData only gives us one value per name, so we need to structure names carefully
  // Example: `accessRole[userIdToRemove]=remove`, `accessRole[userIdToChangeRole]=newRole`
  let collaboratorChanged = false;
  for (const key of formData.keys()) {
    if (key.startsWith('accessRole[')) { 
      const userId = key.substring(key.indexOf('[') + 1, key.indexOf(']'));
      const newRoleOrAction = formData.get(key) as string;

      if (userId === presentation.creatorId) continue; // Cannot change/remove creator's owner role here

      if (newRoleOrAction === 'remove') {
        if (updates.access![userId]) {
            const oldRole = presentation.access[userId];
            updates.access![userId] = deleteField() as any;
            await logPresentationActivity(presentationId, currentUserId, 'collaborator_removed', {
                targetUserId: userId,
                targetUserName: presentation.activeCollaborators?.[userId]?.name || userId,
                oldRole: oldRole
            });
            collaboratorChanged = true;
            // TODO: Create notification for the removed user (optional)
            // TODO: Trigger email notification for collaborator removal
        }
      } else if (['editor', 'viewer'].includes(newRoleOrAction) && updates.access![userId] !== newRoleOrAction) {
         const oldRole = presentation.access[userId];
         updates.access![userId] = newRoleOrAction as PresentationAccessRole;
         await logPresentationActivity(presentationId, currentUserId, 'collaborator_role_changed', {
            targetUserId: userId,
            targetUserName: presentation.activeCollaborators?.[userId]?.name || userId,
            oldRole: oldRole,
            newRole: newRoleOrAction as PresentationAccessRole
         });
         collaboratorChanged = true;
         // TODO: Create notification for role change
         // TODO: Trigger email notification for role change
      }
    }
  }
  if (collaboratorChanged) mainActionType = 'collaborator_update';


  try {
    await apiUpdatePresentation(presentationId, updates);
    const updatedPresentation = await getPresentationById(presentationId); // Fetch updated
    
    // General activity log if no specific one was already logged for this interaction set
    if (mainActionType === 'sharing_settings_updated' && Object.keys(activityDetails).length > 0) {
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
    // This case should ideally not be hit if UI enables password field correctly,
    // but good to have a server-side check.
    return { success: true, message: 'This presentation is not password protected (or password was removed). Access granted.' };
  }

  // IMPORTANT: Firestore does not hash passwords. This is a simple string comparison.
  // For actual security, you'd hash passwords before storing or use a different mechanism.
  if (presentation.settings.password === passwordAttempt) {
    return { success: true, message: 'Password verified.' };
  } else {
    return { success: false, message: 'Incorrect password.' };
  }
}
