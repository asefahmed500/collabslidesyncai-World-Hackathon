
"use client";

import { useState, useEffect } from 'react';
import { Bell, Trash2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationList } from './NotificationList';
import { useAuth } from '@/hooks/useAuth';
import { getUserNotifications, markAllNotificationsAsRead, type Notification as NotificationType } from '@/lib/firestoreService';
import type { Unsubscribe } from 'firebase/firestore';

export function NotificationBell() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    if (currentUser) {
      unsubscribe = getUserNotifications(currentUser.id, (fetchedNotifications) => {
        setNotifications(fetchedNotifications);
        setUnreadCount(fetchedNotifications.filter(n => !n.isRead).length);
      }, 20); // Fetch up to 20 notifications
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  const handleMarkAllRead = async () => {
    if (currentUser && unreadCount > 0) {
      try {
        await markAllNotificationsAsRead(currentUser.id);
        // The onSnapshot listener in getUserNotifications should update the state automatically
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
      }
    }
  };
  
  if (!currentUser) return null;

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 min-w-min p-0.5 text-xs flex items-center justify-center rounded-full"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Open notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96 shadow-xl p-0">
        <div className="flex items-center justify-between p-3 border-b">
            <DropdownMenuLabel className="p-0 text-lg font-semibold">Notifications</DropdownMenuLabel>
            {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs h-auto py-1 px-2">
                    <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all as read
                </Button>
            )}
        </div>
        <ScrollArea className="h-[300px] sm:h-[400px]">
          <NotificationList notifications={notifications} currentUserId={currentUser.id} />
        </ScrollArea>
        {/* 
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-sm text-muted-foreground hover:text-primary focus:text-primary">
            View all notifications (Coming soon)
        </DropdownMenuItem>
        */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
