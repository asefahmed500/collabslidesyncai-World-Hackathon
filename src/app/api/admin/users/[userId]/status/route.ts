
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getUserFromMongoDB, updateUserInMongoDB } from '@/lib/mongoUserService';
// import { auth as adminAuth } from '@/lib/firebaseAdmin'; // For Firebase Auth disable/enable

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
  
  const { actorUserId, disabled } = body as { actorUserId: string, disabled: boolean };

  if (!actorUserId) {
    return NextResponse.json({ success: false, message: 'Actor user ID is required.' }, { status: 401 });
  }
  if (typeof disabled !== 'boolean') {
    return NextResponse.json({ success: false, message: 'Disabled status (boolean) is required in the body.' }, { status: 400 });
  }
   if (userId === actorUserId && disabled) { // Current admin trying to disable themselves
    return NextResponse.json({ success: false, message: 'Platform admins cannot disable their own accounts.' }, { status: 403 });
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

    // Placeholder for Firebase Auth disable/enable
    // try {
    //   // await adminAuth.updateUser(userId, { disabled });
    //   console.log(`(Placeholder) Firebase Auth user ${userId} status would be set to disabled: ${disabled}`);
    // } catch (fbError: any) {
    //   console.error(`Firebase Auth user status update failed for ${userId}:`, fbError);
    //   return NextResponse.json({ success: false, message: `Firebase Auth update failed: ${fbError.message}. Database not updated.` }, { status: 500 });
    // }

    const updatedUser = await updateUserInMongoDB(userId, { disabled });
    if (!updatedUser) {
      return NextResponse.json({ success: false, message: 'Failed to update user status in database.' }, { status: 500 });
    }

    return NextResponse.json({ 
        success: true, 
        message: `User account ${disabled ? 'disabled' : 'enabled'} successfully. (Firebase Auth status is placeholder).`, 
        user: updatedUser 
    });
  } catch (error: any) {
    console.error(`Error updating status for user ${userId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to update user status.' }, { status: 500 });
  }
}
