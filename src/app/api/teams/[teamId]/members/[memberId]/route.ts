
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { updateMemberRoleInMongoDB, removeMemberFromTeamInMongoDB, getTeamFromMongoDB } from '@/lib/mongoTeamService';
import type { TeamRole } from '@/types';
import { isValidObjectId } from 'mongoose';

// TODO: Implement Firebase ID token verification for all API routes to securely get actorUserId

// PUT /api/teams/[teamId]/members/[memberId] - Update member role
export async function PUT(request: NextRequest, { params }: { params: { teamId: string, memberId: string } }) {
  const { teamId, memberId } = params;

  if (!isValidObjectId(teamId) || !memberId) { // memberId is Firebase UID (string)
    return NextResponse.json({ success: false, message: 'Invalid team or member ID.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { actorUserId, newRole } = body as { actorUserId: string, newRole: TeamRole };

    if (!actorUserId) {
      return NextResponse.json({ success: false, message: 'Actor user ID is required.' }, { status: 401 });
    }
    if (!newRole) {
      return NextResponse.json({ success: false, message: 'New role is required.' }, { status: 400 });
    }
    
    await dbConnect();
    const team = await getTeamFromMongoDB(teamId);
    if (!team) {
      return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    }

    const actorMemberInfo = team.members[actorUserId];
    if (!actorMemberInfo || (actorMemberInfo.role !== 'owner' && actorMemberInfo.role !== 'admin')) {
      return NextResponse.json({ success: false, message: 'You do not have permission to change roles.' }, { status: 403 });
    }

    const memberToUpdate = team.members[memberId];
    if (!memberToUpdate) {
      return NextResponse.json({ success: false, message: 'Member not found in team.' }, { status: 404 });
    }

    if (memberToUpdate.role === 'owner' && newRole !== 'owner') {
      return NextResponse.json({ success: false, message: 'Cannot change the role of the team owner directly. Use transfer ownership feature.' }, { status: 400 });
    }
    if (newRole === 'owner' && memberToUpdate.role !== 'owner') {
      return NextResponse.json({ success: false, message: 'To make someone an owner, use the "Transfer Ownership" feature (Not yet fully implemented).' }, { status: 400 });
    }
    if (newRole === 'admin' && actorMemberInfo.role !== 'owner') {
      return NextResponse.json({ success: false, message: 'Only team owners can promote members to admin.' }, { status: 403 });
    }
    if (memberToUpdate.role === 'admin' && actorMemberInfo.role !== 'owner' && memberId !== actorUserId) {
      return NextResponse.json({ success: false, message: 'Admins cannot change the role of other admins.' }, { status: 403 });
    }
    if (memberToUpdate.role === 'admin' && newRole !== 'admin' && actorMemberInfo.role !== 'owner') {
      return NextResponse.json({ success: false, message: 'Only team owners can demote admins.' }, { status: 403 });
    }

    const updatedTeam = await updateMemberRoleInMongoDB(teamId, memberId, newRole);
    if (!updatedTeam) {
      return NextResponse.json({ success: false, message: 'Failed to update member role.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Role for ${memberToUpdate.name || memberId} updated to ${newRole}.`, members: updatedTeam.members }, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating role for member ${memberId} in team ${teamId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to update member role.' }, { status: 500 });
  }
}

// DELETE /api/teams/[teamId]/members/[memberId] - Remove member from team
export async function DELETE(request: NextRequest, { params }: { params: { teamId: string, memberId: string } }) {
  const { teamId, memberId } = params;
   // actorUserId should be passed in headers/body, or obtained from verified token
  const actorUserId = request.nextUrl.searchParams.get('actorUserId');


  if (!isValidObjectId(teamId) || !memberId) {
    return NextResponse.json({ success: false, message: 'Invalid team or member ID.' }, { status: 400 });
  }
   if (!actorUserId) {
    return NextResponse.json({ success: false, message: 'Actor user ID is required for deletion.' }, { status: 401 });
  }

  try {
    await dbConnect();
    const team = await getTeamFromMongoDB(teamId);
    if (!team) {
      return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    }

    const actorMemberInfo = team.members[actorUserId];
    if (!actorMemberInfo || (actorMemberInfo.role !== 'owner' && actorMemberInfo.role !== 'admin')) {
      return NextResponse.json({ success: false, message: 'You do not have permission to remove members.' }, { status: 403 });
    }

    if (actorUserId === memberId) {
      return NextResponse.json({ success: false, message: 'You cannot remove yourself from the team via this action.' }, { status: 400 });
    }

    const memberToRemove = team.members[memberId];
    if (!memberToRemove) {
      return NextResponse.json({ success: false, message: 'Member not found in team.' }, { status: 404 });
    }
    if (memberToRemove.role === 'owner') {
      return NextResponse.json({ success: false, message: 'Cannot remove the team owner. Transfer ownership first.' }, { status: 400 });
    }
    if (memberToRemove.role === 'admin' && actorMemberInfo.role !== 'owner') {
      return NextResponse.json({ success: false, message: 'Admins can only be removed by the team owner.' }, { status: 403 });
    }

    const updatedTeam = await removeMemberFromTeamInMongoDB(teamId, memberId);
    if (!updatedTeam) {
      return NextResponse.json({ success: false, message: 'Failed to remove member.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `${memberToRemove.name || memberId} removed from the team.`, members: updatedTeam.members }, { status: 200 });

  } catch (error: any) {
    console.error(`Error removing member ${memberId} from team ${teamId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to remove member.' }, { status: 500 });
  }
}
    