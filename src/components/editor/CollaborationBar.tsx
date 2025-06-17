"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { User } from '@/types';

interface CollaborationBarProps {
  collaborators: User[];
  currentUser: User; // To indicate self
}

export function CollaborationBar({ collaborators, currentUser }: CollaborationBarProps) {
  if (!collaborators || collaborators.length === 0) {
    return null;
  }

  // Display max 5 avatars, then a +N indicator
  const maxAvatars = 5;
  const displayedCollaborators = collaborators.slice(0, maxAvatars);
  const remainingCount = collaborators.length - maxAvatars;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center space-x-2">
        <div className="flex -space-x-2">
          {displayedCollaborators.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <Avatar className={`h-8 w-8 border-2 ${user.id === currentUser.id ? 'border-primary' : 'border-card'}`}>
                  <AvatarImage src={user.profilePictureUrl} alt={user.name} data-ai-hint="profile avatar" />
                  <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.name} {user.id === currentUser.id ? '(You)' : ''}</p>
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
