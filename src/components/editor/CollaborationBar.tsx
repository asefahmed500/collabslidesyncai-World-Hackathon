
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { User, ActiveCollaboratorInfo } from '@/types';
import { User as UserIcon } from 'lucide-react';

interface CollaborationBarProps {
  activeCollaborators: { [userId: string]: ActiveCollaboratorInfo };
  currentUser: User | null; 
}

export function CollaborationBar({ activeCollaborators, currentUser }: CollaborationBarProps) {
  const collaboratorsArray = Object.values(activeCollaborators);

  if (!currentUser && collaboratorsArray.length === 0) {
    return null;
  }

  const maxAvatars = 5;
  // Sort to put current user first if present, then by name or lastSeen
  const sortedCollaborators = collaboratorsArray.sort((a, b) => {
    if (currentUser) {
      if (a.id === currentUser.id) return -1;
      if (b.id === currentUser.id) return 1;
    }
    return (a.name || '').localeCompare(b.name || '') || (b.lastSeen.toMillis() - a.lastSeen.toMillis());
  });

  const displayedCollaborators = sortedCollaborators.slice(0, maxAvatars);
  const remainingCount = sortedCollaborators.length - maxAvatars;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center space-x-2">
        <div className="flex -space-x-2">
          {displayedCollaborators.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <Avatar className={`h-8 w-8 border-2 ${currentUser && user.id === currentUser.id ? 'border-primary' : 'border-card'}`} style={{ borderColor: currentUser && user.id === currentUser.id ? 'hsl(var(--primary))' : user.color || 'hsl(var(--border))' }}>
                  <AvatarImage src={user.profilePictureUrl || undefined} alt={user.name || 'User'} data-ai-hint="profile avatar" />
                  <AvatarFallback style={{ backgroundColor: user.color ? `${user.color}40` : 'hsl(var(--muted))' }}>
                    {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.name || 'Anonymous User'} {currentUser && user.id === currentUser.id ? '(You)' : ''}</p>
                <p className="text-xs text-muted-foreground">Last seen: {new Date(user.lastSeen.toDate()).toLocaleTimeString()}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 border-2 border-card bg-muted text-muted-foreground">
                <AvatarFallback>+{remainingCount}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>+{remainingCount} more collaborators</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
