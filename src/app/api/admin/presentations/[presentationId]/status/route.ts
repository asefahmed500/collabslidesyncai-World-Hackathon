
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getUserFromMongoDB } from '@/lib/mongoUserService';
import { updatePresentationModerationStatus, getPresentationByIdAdmin } from '@/lib/firestoreService';
import type { PresentationModerationStatus } from '@/types';

async function verifyAdmin(actorUserId: string | null): Promise<boolean> {
  if (!actorUserId) return false;
  await dbConnect(); 
  const actorUser = await getUserFromMongoDB(actorUserId);
  return !!(actorUser && actorUser.isAppAdmin);
}

export async function PUT(request: NextRequest, { params }: { params: { presentationId: string } }) {
  const { presentationId } = params;
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Invalid JSON body.' }, { status: 400 });
  }
  
  const { actorUserId, status, notes } = body as { 
    actorUserId: string, 
    status: PresentationModerationStatus, 
    notes?: string 
  };

  if (!actorUserId) {
    return NextResponse.json({ success: false, message: 'Actor user ID is required.' }, { status: 401 });
  }
  if (!status || !['active', 'under_review', 'taken_down'].includes(status)) {
    return NextResponse.json({ success: false, message: 'Valid moderation status is required.' }, { status: 400 });
  }

  try {
    const isAdmin = await verifyAdmin(actorUserId);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Actor is not a platform admin.' }, { status: 403 });
    }

    const presentation = await getPresentationByIdAdmin(presentationId);
    if (!presentation) {
      return NextResponse.json({ success: false, message: 'Presentation not found.' }, { status: 404 });
    }

    await updatePresentationModerationStatus(presentationId, status, actorUserId, notes);

    return NextResponse.json({ 
        success: true, 
        message: `Presentation "${presentation.title}" moderation status updated to ${status}.`
    });
  } catch (error: any) {
    console.error(`Error updating moderation status for presentation ${presentationId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to update moderation status.' }, { status: 500 });
  }
}
