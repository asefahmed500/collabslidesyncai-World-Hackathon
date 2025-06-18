
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { addMemberToTeamInMongoDB, getTeamFromMongoDB } from '@/lib/mongoTeamService';
import { getUserByEmailFromMongoDB, updateUserTeamAndRoleInMongoDB } from '@/lib/mongoUserService';
import type { TeamRole } from '@/types';
import { isValidObjectId } from 'mongoose';

// TODO: Implement Firebase ID token verification for all API routes to securely get actorUserId

// POST /api/teams/[teamId]/members - Add a member to a team
export async function POST(request: NextRequest, { params }: { params: { teamId: string } }) {
  const { teamId } = params;

  if (!teamId || !isValidObjectId(teamId)) {
    return NextResponse.json({ success: false, message: 'Invalid team ID.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { actorUserId, email, role } = body as { actorUserId: string, email: string, role: TeamRole };

    if (!actorUserId) {
      return NextResponse.json({ success: false, message: 'Actor user ID is required.' }, { status: 401 });
    }
    if (!email || !role) {
      return NextResponse.json({ success: false, message: 'Email and role are required to add a member.' }, { status: 400 });
    }

    await dbConnect();
    const team = await getTeamFromMongoDB(teamId);
    if (!team) {
      return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    }

    // Permission check: Only owner or admin can add members
    const actorMemberInfo = team.members[actorUserId];
    if (!actorMemberInfo || (actorMemberInfo.role !== 'owner' && actorMemberInfo.role !== 'admin')) {
      return NextResponse.json({ success: false, message: 'You do not have permission to add members to this team.' }, { status: 403 });
    }
    if (role === 'owner') {
      return NextResponse.json({ success: false, message: 'Cannot assign owner role directly. Transfer ownership instead.' }, { status: 400 });
    }
    if (role === 'admin' && actorMemberInfo.role !== 'owner') {
      return NextResponse.json({ success: false, message: 'Only team owners can assign the admin role.' }, { status: 403 });
    }

    const userToAdd = await getUserByEmailFromMongoDB(email);
    if (!userToAdd) {
      return NextResponse.json({ success: false, message: `User with email ${email} not found. Users must have an existing CollabSlideSyncAI account.` }, { status: 404 });
    }
    if (team.members[userToAdd.id]) {
      return NextResponse.json({ success: false, message: `${userToAdd.name || email} is already a member of this team.` }, { status: 409 });
    }
    
    const updatedTeam = await addMemberToTeamInMongoDB(teamId, userToAdd, role, actorUserId);
    if (!updatedTeam) {
      return NextResponse.json({ success: false, message: 'Failed to add member to the team.' }, { status: 500 });
    }
    
    // If the user wasn't part of any team, update their primary teamId and role
     if (!userToAdd.teamId) {
        await updateUserTeamAndRoleInMongoDB(userToAdd.id, team.id, role);
    }

    return NextResponse.json({ success: true, message: `${userToAdd.name || email} added as ${role}.`, members: updatedTeam.members }, { status: 201 });

  } catch (error: any) {
    console.error(`Error adding member to team ${teamId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to add team member.' }, { status: 500 });
  }
}
    