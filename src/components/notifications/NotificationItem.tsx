
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Notification as NotificationType, NotificationType as NotificationEnumType } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { markNotificationAsRead } from '@/lib/firestoreService';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { UserCircle, MessageSquare, Users, Share2, Lightbulb, Info, Bell, Edit3, Check, X, Loader2 } from 'lucide-react'; // Added more icons
import { useToast } from '@/hooks/use-toast';
import React, { useState } from 'react';

interface NotificationItemProps {
  notification: NotificationType;
  currentUserId: string;
}

const getNotificationIcon = (type: NotificationEnumType, customIcon?: string) => {
  if (customIcon) {
    // Future: Allow custom SVG paths or image URLs
  }
  switch (type) {
    case 'team_invite': // This might now be legacy if 'team_invitation' is primary
    case 'team_invitation':
      return <Users className="h-5 w-5 text-blue-500" />;
    case 'comment_new': return <MessageSquare className="h-5 w-5 text-green-500" />;
    case 'comment_mention': return <MessageSquare className="h-5 w-5 text-green-600" />;
    case 'presentation_shared': return <Share2 className="h-5 w-5 text-purple-500" />;
    case 'ai_suggestion_ready': return <Lightbulb className="h-5 w-5 text-yellow-500" />;
    case 'generic_info': return <Info className="h-5 w-5 text-gray-500" />;
    default: return <Bell className="h-5 w-5 text-gray-400" />;
  }
};


export function NotificationItem({ notification, currentUserId }: NotificationItemProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isResponding, setIsResponding] = useState(false);


  const handleActionableNotificationClick = async (action: 'accept' | 'decline') => {
    if (isResponding || !notification.teamIdForAction || !notification.roleForAction) return;
    setIsResponding(true);
    try {
      const response = await fetch('/api/teams/invitations/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: notification.id,
          teamId: notification.teamIdForAction,
          role: notification.roleForAction,
          action,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast({ title: `Invitation ${action === 'accept' ? 'Accepted' : 'Declined'}`, description: result.message });
        // Notification will be marked as read by the API and listener will update UI.
        if (action === 'accept' && notification.teamIdForAction) {
            router.push(`/dashboard/manage-team?teamId=${notification.teamIdForAction}`);
            router.refresh(); // Force refresh to reflect new team membership if needed
        }
      } else {
        throw new Error(result.message || `Failed to ${action} invitation.`);
      }
    } catch (error: any) {
      console.error(`Error responding to invitation:`, error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsResponding(false);
    }
  };

  const handleRegularNotificationClick = async () => {
    if (isResponding) return; // Don't navigate if an action is in progress
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };


  const timeAgo = notification.createdAt
    ? formatDistanceToNowStrict(new Date(notification.createdAt.toDate()), { addSuffix: true })
    : 'just now';

  const isActionableInvitation = notification.type === 'team_invitation' && !notification.isRead && notification.teamIdForAction && notification.roleForAction;

  return (
    <div
      className={cn(
        "flex items-start space-x-3 p-3 transition-colors hover:bg-accent/50",
        !notification.isRead && "bg-primary/5",
        (notification.link || isActionableInvitation) && "cursor-pointer"
      )}
      onClick={!isActionableInvitation ? handleRegularNotificationClick : undefined} // Only regular click if not actionable
      role={notification.link || isActionableInvitation ? "button" : "listitem"}
      tabIndex={0}
      onKeyDown={(e) => { 
        if (!isActionableInvitation && (e.key === 'Enter' || e.key === ' ')) handleRegularNotificationClick();
      }}
    >
      <div className="flex-shrink-0 mt-1">
        {notification.actorProfilePictureUrl ? (
            <Avatar className="h-8 w-8">
                <AvatarImage src={notification.actorProfilePictureUrl} alt={notification.actorName || 'Actor'} data-ai-hint="profile avatar small"/>
                <AvatarFallback>{notification.actorName ? notification.actorName.charAt(0).toUpperCase() : <UserCircle size={16}/>}</AvatarFallback>
            </Avatar>
        ) : (
             getNotificationIcon(notification.type, notification.icon)
        )}
      </div>
      <div className="flex-grow min-w-0">
        <p className={cn("text-sm font-medium leading-tight", !notification.isRead && "font-semibold")}>
          {notification.title}
        </p>
        <p className={cn("text-xs text-muted-foreground line-clamp-2", !notification.isRead && "text-foreground/80")}>
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">{timeAgo}</p>
        {isActionableInvitation && (
          <div className="mt-2 flex space-x-2">
            <Button
              size="xs"
              variant="default"
              onClick={(e) => { e.stopPropagation(); handleActionableNotificationClick('accept'); }}
              disabled={isResponding}
              className="h-7 px-2.5 text-xs"
            >
              {isResponding ? <Loader2 className="mr-1 h-3 w-3 animate-spin"/> : <Check className="mr-1 h-3 w-3" />} Accept
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); handleActionableNotificationClick('decline'); }}
              disabled={isResponding}
              className="h-7 px-2.5 text-xs"
            >
              {isResponding ? <Loader2 className="mr-1 h-3 w-3 animate-spin"/> : <X className="mr-1 h-3 w-3" />} Decline
            </Button>
          </div>
        )}
      </div>
      {!notification.isRead && !isActionableInvitation && ( // Hide dot if buttons are shown
        <div className="flex-shrink-0 self-center ml-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary block" title="Unread"></span>
        </div>
      )}
    </div>
  );
}

