
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getUserFromMongoDB, deleteUserFromMongoDB } from '@/lib/mongoUserService';
import TeamModel from '@/models/Team'; // For checking team ownership
// import { auth as adminAuth } from '@/lib/firebaseAdmin'; // Conceptual: for Firebase Admin SDK

// IMPORTANT: In a production app, you MUST verify the actorUserId by validating
// a Firebase ID token sent in the Authorization header. This current implementation
// trusts the actorUserId sent by the client, which is insecure.
// Also, Firebase Admin SDK is needed to truly delete Firebase Auth users.

async function verifyAdmin(actorUserId: string): Promise<boolean> {
  if (!actorUserId) return false;
  const actorUser = await getUserFromMongoDB(actorUserId);
  return !!(actorUser && actorUser.isAppAdmin);
}

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  // In a real app with ID token verification, actorUserId would come from the token.
  // For now, we expect it in the body or query params for simplicity if needed, or assume it's passed correctly.
  // For DELETE, body is not standard. Let's assume it might be a query param for this sim.
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


    // Placeholder for Firebase Auth delete
    // try {
    //   await adminAuth.deleteUser(userId);
    // } catch (fbError: any) {
    //   console.error(`Firebase Auth user deletion failed for ${userId}:`, fbError);
    //   // Decide if you want to proceed with DB deletion if Firebase Auth fails.
    //   // For now, we'll stop if Firebase Auth deletion fails.
    //   return NextResponse.json({ success: false, message: `Firebase Auth deletion failed: ${fbError.message}. Database record not deleted.` }, { status: 500 });
    // }

    const dbDeletionSuccess = await deleteUserFromMongoDB(userId);
    if (!dbDeletionSuccess) {
      // This might happen if the user was already deleted, or another issue.
      // If Firebase Auth deletion was successful, this might be an inconsistency.
      console.warn(`User ${userId} deleted from Firebase Auth (placeholder), but DB deletion returned false.`);
      return NextResponse.json({ success: false, message: 'User deleted from Auth (placeholder) but failed to delete from database or already deleted.' }, { status: 500 });
    }

    // TODO: Consider what to do with team memberships. The user is removed, but their ID might linger in 'members' maps or 'addedBy' fields.
    // A more robust solution would be to iterate through teams and remove the user as a member.

    return NextResponse.json({ success: true, message: `User ${targetUser.name || targetUser.email} deleted successfully (DB only, Auth placeholder).` });
  } catch (error: any) {
    console.error(`Error deleting user ${userId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to delete user.' }, { status: 500 });
  }
}
