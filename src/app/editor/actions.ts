
'use server';

import { auth, db } from '@/lib/firebaseConfig';
import {
  updatePresentation as apiUpdatePresentation,
  getPresentationById,
  // getUserByEmail, // Removed from here
  logPresentationActivity,
  createNotification,
} from '@/lib/firestoreService';
import { getUserByEmailFromMongoDB } from '@/lib/mongoUserService'; // Import directly
import type { Presentation, PresentationAccessRole, User as AppUser, NotificationType, NotificationEnumType } from '@/types';
import { revalidatePath } from 'next/cache';
import { deleteField } from 'firebase/firestore';
import { sendEmail, createCollaborationInviteEmail, createRoleChangeEmail, createCollaboratorRemovedEmail } from '@/lib/emailService';

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
  const currentFirebaseUser = auth.currentUser;
  if (!currentFirebaseUser) {
    return { success: false, message: 'Authentication required.' };
  }
  const currentUserId = currentFirebaseUser.uid;
  const currentUserName = currentFirebaseUser.displayName || 'A user';
  const currentUserProfilePic = currentFirebaseUser.photoURL;


  const presentationId = formData.get('presentationId') as string;
  if (!presentationId) {
    return { success: false, message: 'Presentation ID is missing.' };
  }

  const presentation = await getPresentationById(presentationId);
  if (!presentation) {
    return { success: false, message: 'Presentation not found.' };
  }

  const isCreator = presentation.creatorId === currentUserId;
  const isOwnerInAccessMap = presentation.access && presentation.access[currentUserId] === 'owner';
  if (!isCreator && !isOwnerInAccessMap) {
    return { success: false, message: 'You do not have permission to change sharing settings for this presentation.' };
  }

  const updates: Partial<Presentation> = {
    settings: { ...(presentation.settings || { isPublic: false, passwordProtected: false, commentsAllowed: true }) },
    access: { ...(presentation.access || {}) }
  };
  let activityDetails: any = {};
  let mainActionType: 'sharing_settings_updated' | 'password_set' | 'password_removed' | 'collaborator_update' = 'sharing_settings_updated';


  const isPublic = formData.get('isPublic') === 'on';
  if (isPublic !== presentation.settings.isPublic) {
    updates.settings!.isPublic = isPublic;
    activityDetails.changedSetting = 'isPublic';
    activityDetails.oldValue = presentation.settings.isPublic;
    activityDetails.newValue = isPublic;
    if (!isPublic) {
      updates.settings!.passwordProtected = false;
      updates.settings!.password = deleteField() as any;
    }
  }

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
      if (password && password.length > 0) {
        updates.settings!.password = password;
        mainActionType = 'password_set';
      } else if (!presentation.settings.password) {
         return { success: false, message: 'Please provide a password when enabling password protection.' };
      }
    } else {
      updates.settings!.password = deleteField() as any;
      if (presentation.settings.passwordProtected) mainActionType = 'password_removed';
    }
  } else {
      updates.settings!.passwordProtected = false;
      updates.settings!.password = deleteField() as any;
  }

  const inviteEmail = formData.get('inviteEmail') as string;
  const inviteRole = formData.get('inviteRole') as PresentationAccessRole;

  if (inviteEmail && inviteRole) {
    const userToInvite = await getUserByEmailFromMongoDB(inviteEmail); // Use direct import
    if (!userToInvite) {
      return { success: false, message: `User with email ${inviteEmail} not found.` };
    }
    if (userToInvite.id === presentation.creatorId) {
         return { success: false, message: `User ${inviteEmail} is already the owner.` };
    }
    if (presentation.access && presentation.access[userToInvite.id] === inviteRole) {
        return { success: false, message: `User ${inviteEmail} already has the role of ${inviteRole}.` };
    }

    updates.access![userToInvite.id] = inviteRole;

    await logPresentationActivity(presentationId, currentUserId, 'collaborator_added', {
        targetUserId: userToInvite.id,
        targetUserName: userToInvite.name || userToInvite.email,
        newRole: inviteRole,
    });

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

    if (userToInvite.email) {
      const presentationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/editor/${presentationId}`;
      const emailContent = createCollaborationInviteEmail(
        userToInvite.name || userToInvite.email,
        currentUserName,
        presentation.title,
        presentationLink,
        inviteRole
      );
      try {
        await sendEmail({
          to: userToInvite.email,
          subject: emailContent.subject,
          htmlBody: emailContent.htmlBody,
        });
      } catch (emailError) {
        console.warn("Failed to send collaboration invite email (placeholder service):", emailError);
      }
    }
    mainActionType = 'collaborator_update';
  }

  let collaboratorChanged = false;
  for (const key of formData.keys()) {
    if (key.startsWith('accessRole[')) {
      const userId = key.substring(key.indexOf('[') + 1, key.indexOf(']'));
      const newRoleOrAction = formData.get(key) as string;

      if (userId === presentation.creatorId) continue;

      const collaboratorUser = await getUserByEmailFromMongoDB(presentation.activeCollaborators?.[userId]?.email || ''); // Use direct import

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

            if (collaboratorUser && collaboratorUser.email) {
              const emailContent = createCollaboratorRemovedEmail(
                collaboratorUser.name || collaboratorUser.email,
                currentUserName,
                presentation.title
              );
              try {
                await sendEmail({ to: collaboratorUser.email, subject: emailContent.subject, htmlBody: emailContent.htmlBody });
              } catch (emailError) { console.warn("Failed to send collaborator removal email:", emailError); }
            }
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

         if (collaboratorUser && collaboratorUser.email) {
            const presentationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/editor/${presentationId}`;
            const emailContent = createRoleChangeEmail(
                collaboratorUser.name || collaboratorUser.email,
                currentUserName,
                presentation.title,
                presentationLink,
                oldRole,
                newRoleOrAction as PresentationAccessRole
            );
            try {
                await sendEmail({ to: collaboratorUser.email, subject: emailContent.subject, htmlBody: emailContent.htmlBody });
                 await createNotification(
                    collaboratorUser.id,
                    'role_changed',
                    `Your Role Changed for "${presentation.title}"`,
                    `${currentUserName} changed your role to ${newRoleOrAction as PresentationAccessRole} for "${presentation.title}".`,
                    `/editor/${presentationId}`,
                    currentUserId, currentUserName, currentUserProfilePic
                );
            } catch (emailError) { console.warn("Failed to send role change email/notification:", emailError); }
         }
      }
    }
  }
  if (collaboratorChanged) mainActionType = 'collaborator_update';


  try {
    await apiUpdatePresentation(presentationId, updates);
    const updatedPresentation = await getPresentationById(presentationId);

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
    return { success: true, message: 'This presentation is not password protected (or password was removed). Access granted.' };
  }

  if (presentation.settings.password === passwordAttempt) {
    return { success: true, message: 'Password verified.' };
  } else {
    return { success: false, message: 'Incorrect password.' };
  }
}
