
'use server';
import { auth } from '@/lib/firebaseConfig';
import { createTeamInMongoDB } from '@/lib/mongoTeamService';
import { updateUserTeamAndRoleInMongoDB, getUserFromMongoDB } from '@/lib/mongoUserService';
import { revalidatePath } from 'next/cache';
import type { Team, User as AppUser, TeamRole } from '@/types';

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
    // Revalidate dashboard to reflect new team status and potentially hide create/join options
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

// Note: This server action is currently NOT USED.
// The dashboard page directly calls the API route `/api/teams/invitations/respond` for better state management and error handling on the client.
// This is kept as a reference or for future use if a server-action-first approach is preferred.
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

  try {
    // Here, you would typically call a service function (e.g., from mongoTeamService)
    // that encapsulates the logic currently in the /api/teams/invitations/respond route.
    // For now, this action is a placeholder.
    console.warn("respondToTeamInvitationAction is a placeholder and not fully implemented. Client should use API route.");
    
    // Simulate a successful response for placeholder purposes if needed for UI testing
    // if (action === 'accept') {
    //   revalidatePath('/dashboard');
    //   return { success: true, message: "Invitation accepted (placeholder)." };
    // } else {
    //   return { success: true, message: "Invitation declined (placeholder)." };
    // }
    
    // Realistically, this would call a service function from mongoTeamService.ts
    // For example: await processTeamInvitationService(teamId, firebaseUser.uid, roleForAction, action === 'accept', ...)
    // And then revalidate.

    return { success: false, message: "Action handler not fully implemented here. Use API route." };

  } catch (error: any) {
    return { success: false, message: error.message || "Failed to respond to invitation." };
  }
}
