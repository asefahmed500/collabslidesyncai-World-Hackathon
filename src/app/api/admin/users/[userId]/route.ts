
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getUserFromMongoDB, deleteUserFromMongoDB } from '@/lib/mongoUserService';
import TeamModel from '@/models/Team'; 

async function verifyAdmin(actorUserId: string): Promise<boolean> {
  if (!actorUserId) return false;
  const actorUser = await getUserFromMongoDB(actorUserId);
  return !!(actorUser && actorUser.isAppAdmin);
}

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  const actorUserId = request.nextUrl.searchParams.get('actorUserId');

  if (!actorUserId) {
    return NextResponse.json({ success: false, message: 'Actor user ID is required (e.g., as query parameter actorUserId).' }, { status: 401 });
  }
  if (userId === actorUserId) {
    return NextResponse.json({ success: false, message: 'Platform admins cannot delete their own accounts via this endpoint.' }, { status: 403 });
  }

  try {
    await dbConnect();
    const isAdmin = await verifyAdmin(actorUserId);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Actor is not an admin.' }, { status: 403 });
    }

    const targetUser = await getUserFromMongoDB(userId);
    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'Target user not found.' }, { status: 404 });
    }
    
    // Check if user is an owner of any team
    const ownedTeams = await TeamModel.find({ ownerId: userId }).countDocuments().exec();
    if (ownedTeams > 0) {
      return NextResponse.json({ success: false, message: 'Cannot delete user: They are an owner of one or more teams. Please transfer ownership or delete those teams first.' }, { status: 400 });
    }

    // Firebase Auth delete (placeholder - requires Admin SDK)
    // try {
    //   // await adminAuth.deleteUser(userId);
    //   console.log(`(Placeholder) Firebase Auth user ${userId} would be deleted here.`);
    // } catch (fbError: any) {
    //   console.error(`Firebase Auth user deletion failed for ${userId}:`, fbError);
    //   return NextResponse.json({ success: false, message: `Firebase Auth deletion failed: ${fbError.message}. Database record not deleted.` }, { status: 500 });
    // }

    // If user is part of a team (but not owner), remove them from team's member list
    if (targetUser.teamId) {
        const team = await TeamModel.findById(targetUser.teamId).exec();
        if (team && team.members.has(userId)) {
            team.members.delete(userId);
            await team.save();
            // Consider logging this team activity (member_removed via system/admin action)
        }
    }

    const dbDeletionSuccess = await deleteUserFromMongoDB(userId);
    if (!dbDeletionSuccess) {
      console.warn(`User ${userId} (placeholder) Auth deleted, but DB deletion returned false or user not found.`);
      return NextResponse.json({ success: false, message: 'User (placeholder) Auth deleted but failed to delete from database or already deleted.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `User ${targetUser.name || targetUser.email} deleted successfully from database. (Firebase Auth deletion is placeholder).` });
  } catch (error: any) {
    console.error(`Error deleting user ${userId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to delete user.' }, { status: 500 });
  }
}
