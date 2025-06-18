
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { addMemberToTeamInMongoDB, getTeamFromMongoDB, logTeamActivityInMongoDB } from '@/lib/mongoTeamService';
import { getUserByEmailFromMongoDB, updateUserTeamAndRoleInMongoDB } from '@/lib/mongoUserService';
import type { TeamRole } from '@/types';
import { isValidObjectId } from 'mongoose';

// Helper to verify if actor has permission to add members (owner or admin of the team)
async function canAddTeamMembers(teamId: string, actorUserId: string): Promise<{ authorized: boolean; isOwner: boolean; teamExists: boolean;}> {
  const team = await getTeamFromMongoDB(teamId);
  if (!team) return { authorized: false, isOwner: false, teamExists: false };
  const actorMemberInfo = team.members[actorUserId];
  if (!actorMemberInfo) return { authorized: false, isOwner: false, teamExists: true };
  
  const isOwner = actorMemberInfo.role === 'owner';
  const isAdmin = actorMemberInfo.role === 'admin';
  return { authorized: isOwner || isAdmin, isOwner, teamExists: true };
}

// POST /api/teams/[teamId]/members - Add a member to a team
export async function POST(request: NextRequest, { params }: { params: { teamId: string } }) {
  const { teamId } = params;

  if (!teamId || !isValidObjectId(teamId)) {
    return NextResponse.json({ success: false, message: 'Invalid team ID format.' }, { status: 400 });
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
    if (!['admin', 'editor', 'viewer'].includes(role)) { // Owner role cannot be assigned directly
        return NextResponse.json({ success: false, message: 'Invalid role assigned. Can be admin, editor, or viewer.' }, { status: 400 });
    }

    await dbConnect();
    const permCheck = await canAddTeamMembers(teamId, actorUserId);
    if (!permCheck.teamExists) return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    if (!permCheck.authorized) return NextResponse.json({ success: false, message: 'You do not have permission to add members to this team.' }, { status: 403 });

    if (role === 'admin' && !permCheck.isOwner) { // Only owner can assign admin role
      return NextResponse.json({ success: false, message: 'Only team owners can assign the admin role.' }, { status: 403 });
    }

    const userToAdd = await getUserByEmailFromMongoDB(email);
    if (!userToAdd) {
      return NextResponse.json({ success: false, message: `User with email ${email} not found. Users must have an existing CollabSlideSyncAI account.` }, { status: 404 });
    }
    
    const team = await getTeamFromMongoDB(teamId); // Re-fetch team to check current members
    if (!team) return NextResponse.json({ success: false, message: 'Team consistency error. Please try again.'}, {status: 500});
    if (team.members[userToAdd.id]) {
      return NextResponse.json({ success: false, message: `${userToAdd.name || email} is already a member of this team.` }, { status: 409 });
    }
    
    const updatedTeam = await addMemberToTeamInMongoDB(teamId, userToAdd, role, actorUserId);
    if (!updatedTeam) {
      return NextResponse.json({ success: false, message: 'Failed to add member to the team.' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: `${userToAdd.name || email} added as ${role}.`, members: updatedTeam.members }, { status: 201 });

  } catch (error: any) {
    console.error(`Error adding member to team ${teamId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to add team member due to an unexpected error.' }, { status: 500 });
  }
}
