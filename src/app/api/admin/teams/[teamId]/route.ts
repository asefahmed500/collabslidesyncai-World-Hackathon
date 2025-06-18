
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getUserFromMongoDB } from '@/lib/mongoUserService';
import { deleteTeamFromMongoDB } from '@/lib/mongoTeamService';
import { removeTeamIdFromPresentations } from '@/lib/firestoreService'; // Import Firestore service
import { isValidObjectId } from 'mongoose';

async function verifyAdmin(actorUserId: string | null): Promise<boolean> {
  if (!actorUserId) return false;
  await dbConnect(); // Ensure DB connection for admin check
  const actorUser = await getUserFromMongoDB(actorUserId);
  return !!(actorUser && actorUser.isAppAdmin);
}

export async function DELETE(request: NextRequest, { params }: { params: { teamId: string } }) {
  const { teamId } = params;
  const actorUserId = request.nextUrl.searchParams.get('actorUserId');

  if (!actorUserId) {
    return NextResponse.json({ success: false, message: 'Actor user ID is required.' }, { status: 401 });
  }
  if (!teamId || !isValidObjectId(teamId)) {
    return NextResponse.json({ success: false, message: 'Valid Team ID is required.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const isAdmin = await verifyAdmin(actorUserId);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Actor is not a platform admin.' }, { status: 403 });
    }

    // Call the MongoDB service function to delete the team and handle its members
    const deletionSuccess = await deleteTeamFromMongoDB(teamId, actorUserId);
    
    if (!deletionSuccess) {
      // deleteTeamFromMongoDB throws error on failure, so this might not be reached if it throws
      return NextResponse.json({ success: false, message: 'Failed to delete team from MongoDB or team not found.' }, { status: 500 });
    }

    // After successful MongoDB deletion, update Firestore presentations
    await removeTeamIdFromPresentations(teamId);

    return NextResponse.json({ success: true, message: `Team ${teamId} deleted successfully and presentations updated.` });
  } catch (error: any) {
    console.error(`Error deleting team ${teamId} by admin ${actorUserId}:`, error);
    // Check if it's a "Team not found" error from deleteTeamFromMongoDB
    if (error.message && error.message.toLowerCase().includes('team not found')) {
        return NextResponse.json({ success: false, message: 'Team not found for deletion.' }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: error.message || 'Failed to delete team.' }, { status: 500 });
  }
}
