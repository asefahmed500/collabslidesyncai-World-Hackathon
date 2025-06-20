
'use server';
import { auth } from '@/lib/firebaseConfig';
import { createTeamInMongoDB, logTeamActivityInMongoDB, getPendingTeamInvitationsForUserById } from '@/lib/mongoTeamService'; // Added getPendingTeamInvitationsForUserById
import { updateUserTeamAndRoleInMongoDB, getUserFromMongoDB } from '@/lib/mongoUserService';
import { 
    originalCreatePresentation, 
    originalDeletePresentation, 
    originalDuplicatePresentation, 
    originalToggleFavoriteStatus,
    logPresentationActivity, 
    getPresentationById 
} from '@/lib/firestoreService';
import { revalidatePath } from 'next/cache';
import type { Team, User as AppUser, TeamRole, Presentation } from '@/types';

interface CreateTeamResponse {
  success: boolean;
  message: string;
  team?: Team | null;
}

export async function createTeamForExistingUser(prevState: any, formData: FormData): Promise<CreateTeamResponse> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return { success: false, message: "Authentication required." };
  }
  const userId = firebaseUser.uid;

  const teamName = formData.get('teamName') as string;
  if (!teamName || teamName.trim().length < 3) {
    return { success: false, message: "Team name must be at least 3 characters." };
  }

  try {
    const appUser = await getUserFromMongoDB(userId);
    if (!appUser) {
      return { success: false, message: "User profile not found." };
    }
    if (appUser.teamId) {
      return { success: false, message: "You are already part of a team." };
    }

    const newTeam = await createTeamInMongoDB(teamName, appUser);
    if (!newTeam) {
      return { success: false, message: "Failed to create team." };
    }

    await updateUserTeamAndRoleInMongoDB(userId, newTeam.id, 'owner');
    revalidatePath('/dashboard'); 
    return { success: true, message: `Team "${teamName}" created successfully!`, team: newTeam };

  } catch (error: any) {
    console.error("Error creating team for existing user:", error);
    return { success: false, message: error.message || "Failed to create team." };
  }
}

interface RespondToInviteResponse {
  success: boolean;
  message: string;
}

export async function respondToTeamInvitationAction(
  notificationId: string,
  teamId: string,
  roleForAction: TeamRole,
  action: 'accept' | 'decline'
): Promise<RespondToInviteResponse> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return { success: false, message: "Authentication required." };
  }
  console.warn("respondToTeamInvitationAction is a placeholder. Client should use API route.");
  return { success: false, message: "Action handler not fully implemented here. Use API route." };
}


// New Server Actions for Presentation Management

interface PresentationActionResponse {
    success: boolean;
    message: string;
    presentationId?: string;
    presentation?: Presentation | null;
    isFavorite?: boolean;
}

export async function createPresentationAction(title: string, description?: string): Promise<PresentationActionResponse> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
        return { success: false, message: "Authentication required." };
    }
    const appUser = await getUserFromMongoDB(firebaseUser.uid);
    if (!appUser) {
        return { success: false, message: "User profile not found." };
    }

    try {
        const teamId = appUser.teamId || undefined;
        const newPresentationId = await originalCreatePresentation(firebaseUser.uid, title, teamId, description);
        
        await logPresentationActivity(newPresentationId, firebaseUser.uid, 'presentation_created', { presentationTitle: title });
        if (teamId) {
            await logTeamActivityInMongoDB(teamId, firebaseUser.uid, 'presentation_created', { presentationTitle: title }, 'presentation', newPresentationId);
        }
        revalidatePath('/dashboard');
        return { success: true, message: "Presentation created successfully.", presentationId: newPresentationId };
    } catch (error: any) {
        console.error("Error in createPresentationAction:", error);
        return { success: false, message: error.message || "Could not create presentation." };
    }
}

export async function deletePresentationAction(presentationId: string): Promise<Omit<PresentationActionResponse, 'presentation' | 'isFavorite'>> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
        return { success: false, message: "Authentication required." };
    }
    const appUser = await getUserFromMongoDB(firebaseUser.uid);
    if (!appUser) {
        return { success: false, message: "User profile not found." };
    }

    try {
        const presentation = await getPresentationById(presentationId); 
        if (!presentation) {
            return { success: false, message: "Presentation not found or already deleted." };
        }
        if (presentation.creatorId !== firebaseUser.uid && !(presentation.access && presentation.access[firebaseUser.uid] === 'owner')) {
            return { success: false, message: "You do not have permission to delete this presentation." };
        }

        await originalDeletePresentation(presentationId, firebaseUser.uid);
        
        await logPresentationActivity(presentationId, firebaseUser.uid, 'presentation_deleted', { presentationTitle: presentation.title });
        if (presentation.teamId) {
            await logTeamActivityInMongoDB(presentation.teamId, firebaseUser.uid, 'presentation_deleted', { presentationTitle: presentation.title }, 'presentation', presentationId);
        }
        revalidatePath('/dashboard');
        return { success: true, message: "Presentation deleted successfully." };
    } catch (error: any) {
        console.error("Error in deletePresentationAction:", error);
        return { success: false, message: error.message || "Could not delete presentation." };
    }
}

export async function duplicatePresentationAction(originalPresentationId: string): Promise<PresentationActionResponse> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
        return { success: false, message: "Authentication required." };
    }
    const appUser = await getUserFromMongoDB(firebaseUser.uid);
    if (!appUser) {
        return { success: false, message: "User profile not found." };
    }
    
    try {
        const newPresentationId = await originalDuplicatePresentation(originalPresentationId, firebaseUser.uid);
        const newPresentation = await getPresentationById(newPresentationId); 

        if (newPresentation) {
            await logPresentationActivity(newPresentationId, firebaseUser.uid, 'presentation_created', {
                presentationTitle: newPresentation.title,
                source: 'duplication',
                originalPresentationId
            });
            if (appUser.teamId && newPresentation.teamId) { 
                await logTeamActivityInMongoDB(appUser.teamId, firebaseUser.uid, 'presentation_created', {
                    presentationTitle: newPresentation.title,
                    source: 'duplication',
                    originalPresentationId,
                }, 'presentation', newPresentationId);
            }
        }
        revalidatePath('/dashboard');
        return { success: true, message: "Presentation duplicated successfully.", presentationId: newPresentationId, presentation: newPresentation };
    } catch (error: any) {
        console.error("Error in duplicatePresentationAction:", error);
        return { success: false, message: error.message || "Could not duplicate presentation." };
    }
}

export async function toggleFavoriteStatusAction(presentationId: string): Promise<Omit<PresentationActionResponse, 'presentation' | 'presentationId'>> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
        return { success: false, message: "Authentication required." };
    }

    try {
        const isNowFavorite = await originalToggleFavoriteStatus(presentationId, firebaseUser.uid);
        const presentation = await getPresentationById(presentationId); 

        await logPresentationActivity(
            presentationId,
            firebaseUser.uid,
            isNowFavorite ? 'presentation_favorited' : 'presentation_unfavorited',
            { presentationTitle: presentation?.title || "Unknown" }
        );
        revalidatePath('/dashboard');
        return { success: true, message: `Favorite status updated.`, isFavorite: isNowFavorite };
    } catch (error: any) {
        console.error("Error in toggleFavoriteStatusAction:", error);
        return { success: false, message: error.message || "Could not update favorite status." };
    }
}

export async function getPendingInvitationsAction(): Promise<{ success: boolean; invites: Team[]; message?: string }> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
        return { success: false, invites: [], message: "Authentication required." };
    }
    try {
        const invites = await getPendingTeamInvitationsForUserById(firebaseUser.uid);
        return { success: true, invites };
    } catch (error: any) {
        console.error("Error fetching pending invitations via server action:", error);
        return { success: false, invites: [], message: error.message || "Could not fetch pending invitations." };
    }
}
