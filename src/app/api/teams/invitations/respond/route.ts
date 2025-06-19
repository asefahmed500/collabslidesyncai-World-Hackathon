
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { processTeamInvitation } from '@/lib/mongoTeamService';
import { markNotificationAsRead, getPresentationById } from '@/lib/firestoreService'; // Assuming getPresentationById might be useful for context later
import { auth } from '@/lib/firebaseConfig'; // For getting current user
import type { TeamRole } from '@/types';

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

    // Process the invitation (adds to team members or logs decline, etc.)
    // The processTeamInvitation function should fetch the original inviter ID from the invitation itself or have it passed
    // For simplicity, if we need inviter details for notifications back, they should be part of the notification payload
    // or fetched within processTeamInvitation. Here, we assume it's handled or inviterId isn't strictly needed in this simplified handler.
    const updatedTeam = await processTeamInvitation(
        teamId, 
        currentUserId, // The user accepting/declining
        role, 
        action === 'accept',
        "unknown_inviter_id", // Placeholder: This should ideally come from the original invitation details.
        "Unknown Inviter" // Placeholder
    );

    if (!updatedTeam && action === 'accept') { // If acceptance failed but not for decline
      return NextResponse.json({ success: false, message: 'Failed to process team invitation. The user might already be in a team or the invitation is invalid.' }, { status: 400 });
    }
    
    // Mark the original notification as read/processed
    await markNotificationAsRead(notificationId);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully ${action === 'accept' ? 'accepted' : 'declined'} the invitation to join the team.`,
      team: action === 'accept' ? updatedTeam : null // Only return team if accepted
    });

  } catch (error: any) {
    console.error(`Error responding to team invitation ${notificationId} for team ${teamId}:`, error);
    // Check for specific error messages to provide better feedback
    if (error.message && error.message.toLowerCase().includes("already part of another team")) {
        return NextResponse.json({ success: false, message: error.message }, { status: 409 }); // 409 Conflict
    }
    if (error.message && error.message.toLowerCase().includes("invitation found") && error.message.toLowerCase().includes("invalid")) {
        return NextResponse.json({ success: false, message: "This invitation is no longer valid or has already been processed." }, { status: 410 }); // 410 Gone
    }
    return NextResponse.json({ success: false, message: error.message || 'Failed to respond to team invitation.' }, { status: 500 });
  }
}
