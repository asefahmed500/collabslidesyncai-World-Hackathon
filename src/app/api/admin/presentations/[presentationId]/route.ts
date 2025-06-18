
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getUserFromMongoDB } from '@/lib/mongoUserService';
import { 
  deletePresentation as softDeletePresentationInFirestore, 
  permanentlyDeletePresentation as permanentlyDeletePresentationInFirestore,
  getPresentationByIdAdmin
} from '@/lib/firestoreService';

async function verifyAdmin(actorUserId: string | null): Promise<boolean> {
  if (!actorUserId) return false;
  await dbConnect(); 
  const actorUser = await getUserFromMongoDB(actorUserId);
  return !!(actorUser && actorUser.isAppAdmin);
}

export async function DELETE(request: NextRequest, { params }: { params: { presentationId: string } }) {
  const { presentationId } = params;
  const actorUserId = request.nextUrl.searchParams.get('actorUserId');
  const permanent = request.nextUrl.searchParams.get('permanent') === 'true';

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
      return NextResponse.json({ success: false, message: 'Presentation not found.' }, { status: 404 });
    }

    if (permanent) {
      await permanentlyDeletePresentationInFirestore(presentationId, actorUserId);
      return NextResponse.json({ success: true, message: `Presentation "${presentation.title}" has been permanently deleted.` });
    } else {
      await softDeletePresentationInFirestore(presentationId, presentation.teamId, actorUserId);
      return NextResponse.json({ success: true, message: `Presentation "${presentation.title}" has been soft-deleted.` });
    }

  } catch (error: any) {
    console.error(`Error deleting presentation ${presentationId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to delete presentation.' }, { status: 500 });
  }
}
