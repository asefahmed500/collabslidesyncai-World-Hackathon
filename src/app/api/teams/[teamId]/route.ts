
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getTeamFromMongoDB, updateTeamInMongoDB, logTeamActivityInMongoDB } from '@/lib/mongoTeamService';
import { isValidObjectId } from 'mongoose';
import type { Team } from '@/types';

// Helper to verify if actor has permission to update team settings (owner or admin of the team)
async function canUpdateTeamSettings(teamId: string, actorUserId: string): Promise<boolean> {
  const team = await getTeamFromMongoDB(teamId);
  if (!team) return false;
  const actorMemberInfo = team.members[actorUserId];
  return !!(actorMemberInfo && (actorMemberInfo.role === 'owner' || actorMemberInfo.role === 'admin'));
}

// GET /api/teams/[teamId] - Fetch team details
export async function GET(request: NextRequest, { params }: { params: { teamId: string } }) {
  const { teamId } = params;

  if (!teamId || !isValidObjectId(teamId)) {
    return NextResponse.json({ success: false, message: 'Invalid team ID provided.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const team = await getTeamFromMongoDB(teamId);

    if (!team) {
      return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    }
    // TODO: Add more granular permission check here for GET if team data isn't public by default.
    // For now, if a user can query by ID, they get the data. This is okay if client-side controls access.
    return NextResponse.json({ success: true, team }, { status: 200 });
  } catch (error: any) {
    console.error(`Error fetching team ${teamId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch team data.' }, { status: 500 });
  }
}

// PUT /api/teams/[teamId] - Update team settings
export async function PUT(request: NextRequest, { params }: { params: { teamId: string } }) {
  const { teamId } = params;

  if (!teamId || !isValidObjectId(teamId)) {
    return NextResponse.json({ success: false, message: 'Invalid team ID provided for update.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { actorUserId, name, branding, settings } = body;

    if (!actorUserId) {
      return NextResponse.json({ success: false, message: 'Actor user ID is required for team update.' }, { status: 401 });
    }

    await dbConnect();
    const hasPermission = await canUpdateTeamSettings(teamId, actorUserId);
    if (!hasPermission) {
      return NextResponse.json({ success: false, message: 'You do not have permission to update this team.' }, { status: 403 });
    }

    const updates: Partial<Omit<Team, 'id' | 'ownerId' | 'members' | 'createdAt' | 'lastUpdatedAt'>> = {};
    if (name !== undefined) updates.name = name; // Check for undefined to allow empty string if intended
    if (branding) updates.branding = branding;
    if (settings) updates.settings = settings;
    
    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ success: false, message: 'No update data provided.' }, { status: 400 });
    }

    const updatedTeam = await updateTeamInMongoDB(teamId, updates);

    if (!updatedTeam) {
      // This could happen if teamId was valid format but not found, or update failed for other reasons
      return NextResponse.json({ success: false, message: 'Failed to update team or team not found.' }, { status: 404 });
    }

    await logTeamActivityInMongoDB(teamId, actorUserId, 'team_profile_updated', { changedFields: Object.keys(updates) }, 'team_profile', teamId);

    return NextResponse.json({ success: true, message: 'Team profile updated successfully.', team: updatedTeam }, { status: 200 });
  } catch (error: any) {
    console.error(`Error updating team ${teamId}:`, error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ success: false, message: `Validation Error: ${error.message}` }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message || 'Failed to update team profile due to an unexpected error.' }, { status: 500 });
  }
}
