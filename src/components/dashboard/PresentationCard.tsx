
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Presentation } from '@/types';
import { Users, Clock, Edit3, Eye, Trash2, MoreVertical, CopyIcon, Star, StarIcon as FilledStarIcon } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface PresentationCardProps {
  presentation: Presentation;
  onDeleteRequest: (presentationId: string) => void; 
  onDuplicateRequest: (presentationId: string) => void;
  onToggleFavoriteRequest: (presentationId: string) => void;
  isFavorite: boolean;
}

export function PresentationCard({ presentation, onDeleteRequest, onDuplicateRequest, onToggleFavoriteRequest, isFavorite }: PresentationCardProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const collaboratorCount = presentation.access ? Object.keys(presentation.access).filter(id => id !== presentation.creatorId).length : 0;
  
  const lastUpdatedDate = presentation.lastUpdatedAt instanceof Date 
    ? presentation.lastUpdatedAt 
    : (presentation.lastUpdatedAt as any)?.toDate 
    ? (presentation.lastUpdatedAt as any).toDate() 
    : new Date();

  const isCreator = presentation.creatorId === currentUser?.id;

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-xl transition-shadow duration-200 ease-in-out rounded-xl overflow-hidden">
      <CardHeader className="p-0 border-b">
        <Link href={`/editor/${presentation.id}`} className="block aspect-[16/9] relative group">
          <Image
            src={presentation.thumbnailUrl || "https://placehold.co/320x180.png?text=No+Preview"}
            alt={presentation.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint="presentation preview"
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
           {presentation.settings.isPublic && (
             <Badge variant="secondary" className="absolute top-2 right-2 text-xs z-10 bg-background/80 backdrop-blur-sm">
              <Eye className="w-3 h-3 mr-1" /> Public
            </Badge>
          )}
           {isFavorite && (
            <FilledStarIcon className="absolute top-2 left-2 h-5 w-5 text-yellow-400 fill-yellow-400 z-10" />
          )}
        </Link>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <div className="flex items-start justify-between">
            <Link href={`/editor/${presentation.id}`} className="flex-grow min-w-0">
            <CardTitle className="font-headline text-lg mb-1 hover:text-primary transition-colors truncate" title={presentation.title}>
                {presentation.title}
            </CardTitle>
            </Link>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 -mr-2 -mt-1" onClick={() => onToggleFavoriteRequest(presentation.id)} title={isFavorite ? "Unfavorite" : "Favorite"}>
                {isFavorite ? <FilledStarIcon className="h-5 w-5 text-yellow-400 fill-yellow-400" /> : <Star className="h-5 w-5 text-muted-foreground hover:text-yellow-400" />}
            </Button>
        </div>
        <CardDescription className="text-xs text-muted-foreground mb-2 h-8 line-clamp-2" title={presentation.description}>
          {presentation.description || "No description available."}
        </CardDescription>
        <div className="flex items-center text-xs text-muted-foreground mb-1">
          <Clock className="w-3 h-3 mr-1.5 flex-shrink-0" />
          Updated: {formatDistanceToNowStrict(lastUpdatedDate, { addSuffix: true })}
        </div>
        {collaboratorCount > 0 && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Users className="w-3 h-3 mr-1.5 flex-shrink-0" />
            {collaboratorCount} collaborator{collaboratorCount > 1 ? 's' : ''}
          </div>
        )}
         {presentation.teamId && currentUser?.teamId && presentation.teamId === currentUser.teamId && (
            <Badge variant="outline" className="text-xs mt-1.5">Team: Your Team</Badge>
        )}
      </CardContent>
      <CardFooter className="p-3 border-t bg-muted/30">
        <div className="flex justify-between w-full items-center">
          <Button size="sm" variant="default" onClick={() => router.push(`/editor/${presentation.id}`)} className="flex-grow mr-2">
            <Edit3 className="mr-1.5 h-4 w-4" /> Open
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push(`/editor/${presentation.id}`)}>
                <Edit3 className="mr-2 h-4 w-4" /> Open Editor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicateRequest(presentation.id)}>
                <CopyIcon className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleFavoriteRequest(presentation.id)}>
                <Star className="mr-2 h-4 w-4" /> {isFavorite ? 'Unfavorite' : 'Favorite'}
              </DropdownMenuItem>
              {isCreator && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDeleteRequest(presentation.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
}
