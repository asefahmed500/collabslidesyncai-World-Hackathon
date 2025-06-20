
'use server';

import { getTeamFromMongoDB, getTeamActivitiesFromMongoDB } from '@/lib/mongoTeamService';
import type { Team, TeamActivity } from '@/types';

interface GetTeamDataResponse {
    success: boolean;
    team: Team | null;
    message?: string;
}

interface GetTeamActivitiesResponse {
    success: boolean;
    activities: TeamActivity[];
    message?: string;
}

export async function getTeamDataAction(teamId: string): Promise<GetTeamDataResponse> {
    if (!teamId) {
        return { success: false, team: null, message: "Team ID is required." };
    }
    try {
        const team = await getTeamFromMongoDB(teamId);
        if (!team) {
            return { success: false, team: null, message: "Team not found." };
        }
        return { success: true, team };
    } catch (error: any) {
        console.error("Error in getTeamDataAction:", error);
        return { success: false, team: null, message: error.message || "Failed to fetch team data." };
    }
}

export async function getTeamActivitiesAction(teamId: string): Promise<GetTeamActivitiesResponse> {
    if (!teamId) {
        return { success: false, activities: [], message: "Team ID is required." };
    }
    try {
        const activities = await getTeamActivitiesFromMongoDB(teamId);
        return { success: true, activities };
    } catch (error: any) {
        console.error("Error in getTeamActivitiesAction:", error);
        return { success: false, activities: [], message: error.message || "Failed to fetch team activities." };
    }
}
