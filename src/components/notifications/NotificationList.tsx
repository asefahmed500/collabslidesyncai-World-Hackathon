
"use client";

import { NotificationItem } from './NotificationItem';
import type { Notification as NotificationType } from '@/types';
import { Inbox } from 'lucide-react';

interface NotificationListProps {
  notifications: NotificationType[];
  currentUserId: string;
}

export function NotificationList({ notifications, currentUserId }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Inbox className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">You have no new notifications.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
