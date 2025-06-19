
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getUserFromMongoDB, deleteUserFromMongoDB } from '@/lib/mongoUserService';
import TeamModel from '@/models/Team'; 
import admin from '@/lib/firebaseAdmin'; // Import Firebase Admin SDK

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
      return NextResponse.json({ success: false, message: 'Target user not found in database.' }, { status: 404 });
    }
    
    const ownedTeams = await TeamModel.find({ ownerId: userId }).countDocuments().exec();
    if (ownedTeams > 0) {
      return NextResponse.json({ success: false, message: 'Cannot delete user: They are an owner of one or more teams. Please transfer ownership or delete those teams first.' }, { status: 400 });
    }

    // Attempt to delete from Firebase Auth first
    try {
      if (!admin.apps.length) throw new Error("Firebase Admin SDK not initialized. User not deleted from Firebase Auth.");
      await admin.auth().deleteUser(userId);
      console.log(`Firebase Auth user ${userId} deleted successfully.`);
    } catch (fbError: any) {
      console.error(`Firebase Auth user deletion failed for ${userId}:`, fbError);
      if (fbError.code === 'auth/user-not-found') {
        console.warn(`User ${userId} not found in Firebase Auth, proceeding with database deletion.`);
      } else {
        // For other Firebase errors, we might want to stop and not delete from DB to avoid inconsistency
        return NextResponse.json({ success: false, message: `Firebase Auth deletion failed: ${fbError.message}. Database record not deleted.` }, { status: 500 });
      }
    }

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
      console.warn(`User ${userId} Auth deleted (or didn't exist), but DB deletion returned false or user not found in DB.`);
      // This might be acceptable if Firebase user didn't exist and DB user also didn't (e.g., already cleaned up)
      // Or it could be an issue if Firebase deletion succeeded but DB failed.
      return NextResponse.json({ success: false, message: 'User deleted from Firebase Auth (or did not exist), but database deletion failed or user was already deleted from DB.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `User ${targetUser.name || targetUser.email} deleted successfully from Firebase Auth and database.` });
  } catch (error: any) {
    console.error(`Error deleting user ${userId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to delete user.' }, { status: 500 });
  }
}
