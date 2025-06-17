
"use client";

import type { TeamActivity } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { UserCircle, Edit3, UserPlus, UserMinus, UserCog, FileText, FileX } from 'lucide-react'; // Added icons

interface TeamActivityLogProps {
  activities: TeamActivity[];
}

const getActivityIcon = (actionType: TeamActivity['actionType']) => {
  switch (actionType) {
    case 'member_added': return <UserPlus className="h-4 w-4 text-green-500" />;
    case 'member_removed': return <UserMinus className="h-4 w-4 text-red-500" />;
    case 'member_role_changed': return <UserCog className="h-4 w-4 text-blue-500" />;
    case 'team_profile_updated': return <Edit3 className="h-4 w-4 text-purple-500" />;
    case 'presentation_created': return <FileText className="h-4 w-4 text-indigo-500" />;
    case 'presentation_deleted': return <FileX className="h-4 w-4 text-orange-500" />;
    default: return <UserCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const formatActivityDetails = (activity: TeamActivity): string => {
  switch (activity.actionType) {
    case 'member_added':
      return `added ${activity.targetName || 'a new member'} as ${activity.details?.newRole || 'a member'}.`;
    case 'member_removed':
      return `removed ${activity.targetName || 'a member'} from the team.`;
    case 'member_role_changed':
      return `changed ${activity.targetName || "a member's"} role from ${activity.details?.oldRole || 'N/A'} to ${activity.details?.newRole || 'N/A'}.`;
    case 'team_profile_updated':
      const fields = activity.details?.changedFields as string[] | undefined;
      return `updated the team profile${fields ? ` (fields: ${fields.join(', ')})` : ''}.`;
    case 'presentation_created':
      return `created a presentation: "${activity.details?.presentationTitle || activity.targetName || 'New Presentation'}".`;
    case 'presentation_deleted':
      return `deleted a presentation: "${activity.details?.presentationTitle || activity.targetName || 'A Presentation'}".`;
    case 'team_created':
      return `created the team: "${activity.details?.teamName || 'New Team'}".`;
    default:
      return `performed an action: ${activity.actionType}.`;
  }
};

export function TeamActivityLog({ activities }: TeamActivityLogProps) {
  if (!activities || activities.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No team activity yet.</p>;
  }

  return (
    <ScrollArea className="h-[400px] w-full">
      <div className="space-y-4 pr-4">
        {activities.map(activity => (
          <Card key={activity.id} className="p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-3">
              <Avatar className="h-8 w-8 mt-1">
                 {/* Assuming actor might have a profile pic; for now, simple fallback */}
                <AvatarFallback>
                  {getActivityIcon(activity.actionType)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{activity.actorName || 'A user'}</span>
                  {' '}
                  {formatActivityDetails(activity)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.createdAt as Date), { addSuffix: true })}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
