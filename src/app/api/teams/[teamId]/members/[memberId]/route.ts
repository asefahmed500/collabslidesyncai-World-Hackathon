
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { updateMemberRoleInMongoDB, removeMemberFromTeamInMongoDB, getTeamFromMongoDB, logTeamActivityInMongoDB } from '@/lib/mongoTeamService';
import type { TeamRole } from '@/types';
import { isValidObjectId } from 'mongoose';

// Helper to verify if actor has permission to manage members (owner or admin of the team)
async function canManageTeamMembers(teamId: string, actorUserId: string): Promise<{ authorized: boolean; isOwner: boolean; isAdmin: boolean; teamExists: boolean; actorRole?: TeamRole }> {
  const team = await getTeamFromMongoDB(teamId);
  if (!team) return { authorized: false, isOwner: false, isAdmin: false, teamExists: false };
  const actorMemberInfo = team.members[actorUserId];
  if (!actorMemberInfo) return { authorized: false, isOwner: false, isAdmin: false, teamExists: true };
  
  const isOwner = actorMemberInfo.role === 'owner';
  const isAdmin = actorMemberInfo.role === 'admin';
  return { authorized: isOwner || isAdmin, isOwner, isAdmin, teamExists: true, actorRole: actorMemberInfo.role };
}


// PUT /api/teams/[teamId]/members/[memberId] - Update member role
export async function PUT(request: NextRequest, { params }: { params: { teamId: string, memberId: string } }) {
  const { teamId, memberId } = params;

  if (!isValidObjectId(teamId) || !memberId) { 
    return NextResponse.json({ success: false, message: 'Invalid team or member ID format.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { actorUserId, newRole } = body as { actorUserId: string, newRole: TeamRole };

    if (!actorUserId) {
      return NextResponse.json({ success: false, message: 'Actor user ID is required.' }, { status: 401 });
    }
    if (!newRole || !['owner', 'admin', 'editor', 'viewer'].includes(newRole)) {
      return NextResponse.json({ success: false, message: 'Valid new role is required.' }, { status: 400 });
    }
    
    await dbConnect();
    const permCheck = await canManageTeamMembers(teamId, actorUserId);
    if (!permCheck.teamExists) return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    if (!permCheck.authorized) return NextResponse.json({ success: false, message: 'You do not have permission to change roles in this team.' }, { status: 403 });

    const team = await getTeamFromMongoDB(teamId); // Re-fetch for latest data
    if (!team) return NextResponse.json({ success: false, message: 'Team not found (consistency issue).' }, { status: 404 });

    const memberToUpdate = team.members[memberId];
    if (!memberToUpdate) return NextResponse.json({ success: false, message: 'Member not found in team.' }, { status: 404 });

    if (memberToUpdate.role === 'owner' && newRole !== 'owner') {
      return NextResponse.json({ success: false, message: 'Cannot change the role of the team owner directly. Use transfer ownership feature.' }, { status: 400 });
    }
    if (newRole === 'owner') { // Attempting to make someone an owner
      return NextResponse.json({ success: false, message: 'To make someone an owner, use the "Transfer Ownership" feature (Not fully implemented).' }, { status: 400 });
    }
    if (newRole === 'admin' && !permCheck.isOwner) { // Only owner can promote to admin
      return NextResponse.json({ success: false, message: 'Only team owners can promote members to admin.' }, { status: 403 });
    }
    if (memberToUpdate.role === 'admin' && !permCheck.isOwner && memberId !== actorUserId) { // Admin cannot change another admin's role unless it's themselves (e.g. demoting self, if allowed)
      return NextResponse.json({ success: false, message: 'Admins cannot change the role of other admins.' }, { status: 403 });
    }
    if (memberToUpdate.role === 'admin' && newRole !== 'admin' && !permCheck.isOwner) { // Admin cannot demote other admins
      return NextResponse.json({ success: false, message: 'Only team owners can demote admins.' }, { status: 403 });
    }


    const updatedTeam = await updateMemberRoleInMongoDB(teamId, memberId, newRole, actorUserId);
    if (!updatedTeam) {
      return NextResponse.json({ success: false, message: 'Failed to update member role.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Role for ${memberToUpdate.name || memberId} updated to ${newRole}.`, members: updatedTeam.members }, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating role for member ${memberId} in team ${teamId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to update member role due to an unexpected error.' }, { status: 500 });
  }
}

// DELETE /api/teams/[teamId]/members/[memberId] - Remove member from team
export async function DELETE(request: NextRequest, { params }: { params: { teamId: string, memberId: string } }) {
  const { teamId, memberId } = params;
  const actorUserId = request.nextUrl.searchParams.get('actorUserId');


  if (!isValidObjectId(teamId) || !memberId) {
    return NextResponse.json({ success: false, message: 'Invalid team or member ID format.' }, { status: 400 });
  }
   if (!actorUserId) {
    return NextResponse.json({ success: false, message: 'Actor user ID is required for deletion.' }, { status: 401 });
  }

  try {
    await dbConnect();
    const permCheck = await canManageTeamMembers(teamId, actorUserId);
    if (!permCheck.teamExists) return NextResponse.json({ success: false, message: 'Team not found.' }, { status: 404 });
    if (!permCheck.authorized) return NextResponse.json({ success: false, message: 'You do not have permission to remove members from this team.' }, { status: 403 });

    const team = await getTeamFromMongoDB(teamId); // Re-fetch for latest data
    if (!team) return NextResponse.json({ success: false, message: 'Team not found (consistency issue).' }, { status: 404 });


    if (actorUserId === memberId) {
      return NextResponse.json({ success: false, message: 'You cannot remove yourself from the team via this action. Use "Leave Team" feature.' }, { status: 400 });
    }

    const memberToRemove = team.members[memberId];
    if (!memberToRemove) return NextResponse.json({ success: false, message: 'Member not found in team.' }, { status: 404 });
    if (memberToRemove.role === 'owner') {
      return NextResponse.json({ success: false, message: 'Cannot remove the team owner. Transfer ownership first.' }, { status: 400 });
    }
    if (memberToRemove.role === 'admin' && !permCheck.isOwner) {
      return NextResponse.json({ success: false, message: 'Admins can only be removed by the team owner.' }, { status: 403 });
    }

    const updatedTeam = await removeMemberFromTeamInMongoDB(teamId, memberId, actorUserId);
    if (!updatedTeam) {
      return NextResponse.json({ success: false, message: 'Failed to remove member.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `${memberToRemove.name || memberId} removed from the team.`, members: updatedTeam.members }, { status: 200 });

  } catch (error: any) {
    console.error(`Error removing member ${memberId} from team ${teamId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to remove member due to an unexpected error.' }, { status: 500 });
  }
}
