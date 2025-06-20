
'use server';

import { getAllUsersFromMongoDB, getUserFromMongoDB } from '@/lib/mongoUserService';
import { getAllTeamsFromMongoDB, getGlobalPendingInvitationsCount, getTeamActivitiesFromMongoDB, getTeamFromMongoDB } from '@/lib/mongoTeamService';
import { getAllPresentationsForAdmin, getPresentationsForModerationReview } from '@/lib/firestoreService';
import type { User, Team, Presentation, TeamActivity } from '@/types';

interface AdminDashboardStats {
  totalUsers: number;
  totalTeams: number;
  totalPresentations: number;
  presentationsUnderReview: number;
  totalPendingTeamInvites: number;
}

export async function getAdminDashboardStatsAction(): Promise<{ success: boolean; stats?: AdminDashboardStats; message?: string }> {
  try {
    const [users, teams, presentations, reviewQueue, pendingInvitesCount] = await Promise.all([
      getAllUsersFromMongoDB(),
      getAllTeamsFromMongoDB(),
      getAllPresentationsForAdmin(true), // Include deleted for total count from admin perspective
      getPresentationsForModerationReview(),
      getGlobalPendingInvitationsCount(),
    ]);

    const stats: AdminDashboardStats = {
      totalUsers: users.length,
      totalTeams: teams.length,
      totalPresentations: presentations.length,
      presentationsUnderReview: reviewQueue.length,
      totalPendingTeamInvites: pendingInvitesCount,
    };
    return { success: true, stats };
  } catch (error: any) {
    console.error("Error fetching admin dashboard stats:", error);
    return { success: false, message: error.message || "Failed to fetch dashboard statistics." };
  }
}

// Potentially add more admin-specific server actions here as needed.
// For example, actions that platform admins can take which are not tied to a specific resource's API route.
