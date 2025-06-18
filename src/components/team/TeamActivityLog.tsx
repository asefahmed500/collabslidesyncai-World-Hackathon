
"use client";

import type { TeamActivity, TeamRole, PresentationAccessRole } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { UserCircle, Edit3, UserPlus, UserMinus, UserCog, FileText, FileX, Settings, Image as ImageIcon, Trash2, Crown } from 'lucide-react';

interface TeamActivityLogProps {
  activities: TeamActivity[];
}

const getActivityIcon = (actionType: TeamActivity['actionType']) => {
  switch (actionType) {
    case 'team_created': return <Crown className="h-4 w-4 text-amber-500" />;
    case 'member_added': return <UserPlus className="h-4 w-4 text-green-600" />;
    case 'member_removed': return <UserMinus className="h-4 w-4 text-red-600" />;
    case 'member_role_changed': return <UserCog className="h-4 w-4 text-blue-600" />;
    case 'team_profile_updated': return <Settings className="h-4 w-4 text-purple-600" />;
    case 'presentation_created': return <FileText className="h-4 w-4 text-indigo-600" />;
    case 'presentation_deleted': return <FileX className="h-4 w-4 text-orange-600" />;
    case 'asset_uploaded': return <ImageIcon className="h-4 w-4 text-teal-600" />;
    case 'asset_deleted': return <Trash2 className="h-4 w-4 text-pink-600" />;
    default: return <UserCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const formatActivityDetails = (activity: TeamActivity): string => {
  const targetName = activity.targetName || (activity.targetType === 'user' ? 'a user' : activity.targetType === 'presentation' ? 'a presentation' : activity.targetType === 'asset' ? 'an asset' : 'the team profile');
  const details = activity.details || {};
  
  switch (activity.actionType) {
    case 'team_created':
      return `created the team: "${details.teamName || targetName}".`;
    case 'member_added':
      return `added ${details.memberName || targetName} (${details.memberEmail || ''}) as ${details.newRole || 'a member'}.`;
    case 'member_removed':
      const reason = details.reason ? ` (Reason: ${details.reason})` : '';
      return `removed ${details.memberName || targetName} from the team${reason}.`;
    case 'member_role_changed':
      return `changed ${details.memberName || targetName}'s role from ${details.oldRole || 'N/A'} to ${details.newRole || 'N/A'}.`;
    case 'team_profile_updated':
      const fields = details.changedFields as string[] | undefined;
      return `updated the team profile${fields && fields.length > 0 ? ` (fields: ${fields.join(', ')})` : ''}.`;
    case 'presentation_created':
      return `created a presentation: "${details.presentationTitle || targetName}".`;
    case 'presentation_deleted':
      return `deleted a presentation: "${details.presentationTitle || targetName}".`;
    case 'asset_uploaded':
      return `uploaded an asset: "${details.fileName || targetName}" (${details.assetType || 'file'}).`;
    case 'asset_deleted':
      return `deleted an asset: "${details.fileName || targetName}".`;
    default:
      let message = `performed action '${activity.actionType}'`;
      if (activity.targetType) message += ` on ${activity.targetType}`;
      if (targetName && targetName !== activity.targetType) message += `: ${targetName}`; // Avoid redundant "team_profile: the team profile"
      return message + ".";
  }
};

export function TeamActivityLog({ activities }: TeamActivityLogProps) {
  if (!activities || activities.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No team activity yet.</p>;
  }

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border shadow-inner bg-muted/20">
      <div className="space-y-1 p-4">
        {activities.map(activity => (
          <Card key={activity.id} className="p-3 shadow-sm bg-card hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 pt-0.5">
                 {getActivityIcon(activity.actionType)}
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed">
                  <span className="font-semibold">{activity.actorName || 'A user'}</span>
                  {' '}
                  {formatActivityDetails(activity)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

    