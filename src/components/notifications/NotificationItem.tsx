
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Notification as NotificationType, NotificationType as NotificationEnumType } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { markNotificationAsRead } from '@/lib/firestoreService';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { UserCircle, MessageSquare, Users, Share2, Lightbulb, Info, Bell, Edit3 } from 'lucide-react'; // Added more icons

interface NotificationItemProps {
  notification: NotificationType;
  currentUserId: string;
}

const getNotificationIcon = (type: NotificationEnumType, customIcon?: string) => {
  if (customIcon) {
    // Future: Allow custom SVG paths or image URLs
    // For now, if 'customIcon' is a Lucide name string, we can try to render it.
    // This requires a mapping or dynamic component rendering which is complex here.
    // Defaulting to type-based icons.
  }
  switch (type) {
    case 'team_invite': return <Users className="h-5 w-5 text-blue-500" />;
    case 'comment_new': return <MessageSquare className="h-5 w-5 text-green-500" />;
    case 'comment_mention': return <MessageSquare className="h-5 w-5 text-green-600" />; // Slightly different for mentions
    case 'presentation_shared': return <Share2 className="h-5 w-5 text-purple-500" />;
    case 'ai_suggestion_ready': return <Lightbulb className="h-5 w-5 text-yellow-500" />;
    case 'generic_info': return <Info className="h-5 w-5 text-gray-500" />;
    default: return <Bell className="h-5 w-5 text-gray-400" />;
  }
};


export function NotificationItem({ notification, currentUserId }: NotificationItemProps) {
  const router = useRouter();

  const handleNotificationClick = async () => {
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

  return (
    <div
      className={cn(
        "flex items-start space-x-3 p-3 transition-colors hover:bg-accent/50",
        !notification.isRead && "bg-primary/5", // Subtle highlight for unread
        notification.link && "cursor-pointer"
      )}
      onClick={handleNotificationClick}
      role={notification.link ? "link" : "listitem"}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNotificationClick();}}
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
      </div>
      {!notification.isRead && (
        <div className="flex-shrink-0 self-center ml-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary block" title="Unread"></span>
        </div>
      )}
    </div>
  );
}
