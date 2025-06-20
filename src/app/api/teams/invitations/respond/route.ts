
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { processTeamInvitation } from '@/lib/mongoTeamService';
import { markNotificationAsRead, getPresentationById } from '@/lib/firestoreService'; 
import { auth } from '@/lib/firebaseConfig'; 
import type { TeamRole } from '@/types';
import { getUserFromMongoDB } from '@/lib/mongoUserService'; // Import to get inviter name

export async function POST(request: NextRequest) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
  }
  const currentUserId = firebaseUser.uid;
  const currentUserName = firebaseUser.displayName || firebaseUser.email;


  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Invalid JSON body.' }, { status: 400 });
  }

  const { notificationId, teamId, role, action } = body as { 
    notificationId: string, 
    teamId: string, 
    role: TeamRole, 
    action: 'accept' | 'decline' 
  };

  if (!notificationId || !teamId || !role || !action) {
    return NextResponse.json({ success: false, message: 'Missing required fields (notificationId, teamId, role, action).' }, { status: 400 });
  }
  if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ success: false, message: 'Invalid action specified.' }, { status: 400 });
  }

  try {
    await dbConnect();
    
    // Fetch inviter details if needed for processTeamInvitation, though it's passed as actorWhoInvitedId
    // The processTeamInvitation function should ideally handle fetching the original inviter if needed.
    // For now, we assume the notification payload or team's pendingInvite has enough context.

    const updatedTeam = await processTeamInvitation(
        teamId, 
        currentUserId, 
        role, 
        action === 'accept',
        "unknown_actor_id", // Placeholder - this should come from the notification or original invite
        "Unknown Inviter"   // Placeholder
    );

    if (!updatedTeam && action === 'accept') { 
      return NextResponse.json({ success: false, message: 'Failed to process team invitation. The user might already be in a team or the invitation is invalid.' }, { status: 400 });
    }
    
    // Mark the original notification as read/processed
    // Ensure notificationId is a valid ID from Firestore
    if (notificationId && !notificationId.startsWith('invite_for_')) { // Avoid trying to mark pseudo-IDs as read
        try {
          await markNotificationAsRead(notificationId);
        } catch (e) {
          console.warn(`Could not mark notification ${notificationId} as read:`, e);
        }
    }


    return NextResponse.json({ 
      success: true, 
      message: `Successfully ${action === 'accept' ? 'accepted' : 'declined'} the invitation to join the team.`,
      team: action === 'accept' ? updatedTeam : null 
    });

  } catch (error: any) {
    console.error(`Error responding to team invitation ${notificationId} for team ${teamId}:`, error);
    if (error.message && error.message.toLowerCase().includes("already part of another team")) {
        return NextResponse.json({ success: false, message: error.message }, { status: 409 }); 
    }
    if (error.message && error.message.toLowerCase().includes("invitation found") && error.message.toLowerCase().includes("invalid")) {
        return NextResponse.json({ success: false, message: "This invitation is no longer valid or has already been processed." }, { status: 410 }); 
    }
    return NextResponse.json({ success: false, message: error.message || 'Failed to respond to team invitation.' }, { status: 500 });
  }
}
