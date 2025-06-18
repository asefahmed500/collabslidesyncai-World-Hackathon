
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getTeamFromMongoDB, updateTeamInMongoDB, logTeamActivityInMongoDB } from '@/lib/mongoTeamService';
import { isValidObjectId } from 'mongoose';
import type { Team } from '@/types';

// TODO: Implement Firebase ID token verification for all API routes to securely get actorUserId
// For now, actorUserId is expected in the request body for authenticated actions.

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
    // TODO: Add permission check here if team data isn't public.
    // For example, ensure the requesting user is a member of the team.
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
      return NextResponse.json({ success: false, message: 'Actor user ID is required.' }, { status: 401 });
    }

    // TODO: Implement proper permission check. For now, assume actorUserId has rights if they know the teamId.
    // In a real app: const hasPermission = await canManageTeam(teamId, actorUserId); if (!hasPermission) ...

    const updates: Partial<Omit<Team, 'id' | 'ownerId' | 'members' | 'createdAt' | 'lastUpdatedAt'>> = {};
    if (name) updates.name = name;
    if (branding) updates.branding = branding;
    if (settings) updates.settings = settings;
    
    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ success: false, message: 'No update data provided.' }, { status: 400 });
    }

    await dbConnect();
    const updatedTeam = await updateTeamInMongoDB(teamId, updates);

    if (!updatedTeam) {
      return NextResponse.json({ success: false, message: 'Failed to update team or team not found.' }, { status: 404 });
    }

    await logTeamActivityInMongoDB(teamId, actorUserId, 'team_profile_updated', { changedFields: Object.keys(updates) });

    return NextResponse.json({ success: true, message: 'Team profile updated successfully.', team: updatedTeam }, { status: 200 });
  } catch (error: any) {
    console.error(`Error updating team ${teamId}:`, error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ success: false, message: `Validation Error: ${error.message}` }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message || 'Failed to update team profile.' }, { status: 500 });
  }
}
    