
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getUserFromMongoDB, updateUserInMongoDB } from '@/lib/mongoUserService';
// No User type import needed as it's handled by mongoUserService

async function verifyAdmin(actorUserId: string): Promise<boolean> {
  if (!actorUserId) return false;
  const actorUser = await getUserFromMongoDB(actorUserId);
  return !!(actorUser && actorUser.isAppAdmin);
}

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Invalid JSON body.' }, { status: 400 });
  }
  
  const { actorUserId, isAppAdmin } = body as { actorUserId: string, isAppAdmin: boolean };

  if (!actorUserId) {
    return NextResponse.json({ success: false, message: 'Actor user ID is required.' }, { status: 401 });
  }
  if (typeof isAppAdmin !== 'boolean') {
    return NextResponse.json({ success: false, message: 'isAppAdmin (boolean) is required in the body.' }, { status: 400 });
  }
  if (userId === actorUserId && !isAppAdmin) { // Current admin trying to demote themselves
    return NextResponse.json({ success: false, message: 'Platform admins cannot demote themselves.' }, { status: 403 });
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

    const updatedUser = await updateUserInMongoDB(userId, { isAppAdmin });
    if (!updatedUser) {
      return NextResponse.json({ success: false, message: 'Failed to update user role.' }, { status: 500 });
    }

    return NextResponse.json({ 
        success: true, 
        message: `User role updated successfully. ${targetUser.name || targetUser.email} is now ${isAppAdmin ? 'a Platform Admin' : 'a regular user'}.`, 
        user: updatedUser 
    });
  } catch (error: any) {
    console.error(`Error updating role for user ${userId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to update user role.' }, { status: 500 });
  }
}
