
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getUserFromMongoDB } from '@/lib/mongoUserService';
import admin from '@/lib/firebaseAdmin'; // Import Firebase Admin SDK

async function verifyAdmin(actorUserId: string): Promise<boolean> {
  if (!actorUserId) return false;
  const actorUser = await getUserFromMongoDB(actorUserId);
  return !!(actorUser && actorUser.isAppAdmin);
}

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
   let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Invalid JSON body or actorUserId missing.' }, { status: 400 });
  }
  const { actorUserId } = body as { actorUserId: string };


  if (!actorUserId) {
    return NextResponse.json({ success: false, message: 'Actor user ID is required.' }, { status: 401 });
  }

  try {
    await dbConnect();
    const isAdmin = await verifyAdmin(actorUserId);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Actor is not an admin.' }, { status: 403 });
    }

    const targetUser = await getUserFromMongoDB(userId);
    if (!targetUser || !targetUser.email) {
      return NextResponse.json({ success: false, message: 'Target user not found or has no email.' }, { status: 404 });
    }

    // Generate password reset link using Firebase Admin SDK
    let resetLink = '';
    try {
      if (!admin.apps.length) throw new Error("Firebase Admin SDK not initialized. Cannot generate password reset link.");
      resetLink = await admin.auth().generatePasswordResetLink(targetUser.email);
      // In a real app, you would email this link or provide it to the admin.
      // For this example, we'll just confirm it was generated.
      console.log(`Password reset link generated for ${targetUser.email}: ${resetLink}`);
    } catch (fbError: any) {
      console.error(`Firebase Auth password reset link generation failed for ${targetUser.email}:`, fbError);
      return NextResponse.json({ success: false, message: `Firebase Auth error: ${fbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
        success: true, 
        message: `Password reset link generated for ${targetUser.name || targetUser.email}. Admin should securely provide this link to the user. Link (for admin reference): ${resetLink}` 
    });
  } catch (error: any) {
    console.error(`Error initiating password reset for user ${userId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to initiate password reset.' }, { status: 500 });
  }
}
