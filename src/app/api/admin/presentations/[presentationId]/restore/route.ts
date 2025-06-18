
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getUserFromMongoDB } from '@/lib/mongoUserService';
import { restorePresentation as restorePresentationInFirestore, getPresentationByIdAdmin } from '@/lib/firestoreService';

async function verifyAdmin(actorUserId: string | null): Promise<boolean> {
  if (!actorUserId) return false;
  await dbConnect(); 
  const actorUser = await getUserFromMongoDB(actorUserId);
  return !!(actorUser && actorUser.isAppAdmin);
}

export async function POST(request: NextRequest, { params }: { params: { presentationId: string } }) {
  const { presentationId } = params;
  const actorUserId = request.nextUrl.searchParams.get('actorUserId');


  if (!actorUserId) {
    return NextResponse.json({ success: false, message: 'Actor user ID is required.' }, { status: 401 });
  }

  try {
    const isAdmin = await verifyAdmin(actorUserId);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Actor is not a platform admin.' }, { status: 403 });
    }

    const presentation = await getPresentationByIdAdmin(presentationId);
    if (!presentation) {
      // This check is important because getPresentationByIdAdmin fetches regardless of 'deleted' status
      return NextResponse.json({ success: false, message: 'Presentation not found or already permanently deleted.' }, { status: 404 });
    }
    if (!presentation.deleted) {
        return NextResponse.json({ success: false, message: 'Presentation is not deleted, cannot restore.' }, { status: 400 });
    }

    await restorePresentationInFirestore(presentationId, actorUserId);

    return NextResponse.json({ 
        success: true, 
        message: `Presentation "${presentation.title}" has been restored successfully.`
    });
  } catch (error: any) {
    console.error(`Error restoring presentation ${presentationId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to restore presentation.' }, { status: 500 });
  }
}
