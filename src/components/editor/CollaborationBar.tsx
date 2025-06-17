
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { User } from '@/types';
import { User as UserIcon } from 'lucide-react';

interface CollaborationBarProps {
  collaborators?: User[]; // Made optional as it might not always be fully populated
  currentUser: User | null; 
}

export function CollaborationBar({ collaborators, currentUser }: CollaborationBarProps) {
  if (!currentUser && (!collaborators || collaborators.length === 0)) {
    return null;
  }

  // Display max 5 avatars, then a +N indicator
  const maxAvatars = 5;
  let displayedCollaborators: User[] = [];
  let remainingCount = 0;

  if (collaborators && collaborators.length > 0) {
     displayedCollaborators = collaborators.slice(0, maxAvatars);
     remainingCount = collaborators.length - maxAvatars;
  } else if (currentUser) {
    // If no collaborators list but current user exists, show current user
    displayedCollaborators = [currentUser];
  }


  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center space-x-2">
        <div className="flex -space-x-2">
          {displayedCollaborators.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <Avatar className={`h-8 w-8 border-2 ${currentUser && user.id === currentUser.id ? 'border-primary' : 'border-card'}`}>
                  <AvatarImage src={user.profilePictureUrl || undefined} alt={user.name || 'User'} data-ai-hint="profile avatar" />
                  <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.name || user.email} {currentUser && user.id === currentUser.id ? '(You)' : ''}</p>
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
