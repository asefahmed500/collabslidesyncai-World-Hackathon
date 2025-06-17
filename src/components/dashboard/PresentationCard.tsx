import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Presentation } from '@/types';
import { Users, Clock, Edit3, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PresentationCardProps {
  presentation: Presentation;
}

export function PresentationCard({ presentation }: PresentationCardProps) {
  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="p-0">
        <Link href={`/editor/${presentation.id}`} className="block aspect-video relative rounded-t-lg overflow-hidden">
          <Image
            src={presentation.thumbnailUrl || "https://placehold.co/320x180.png?text=No+Preview"}
            alt={presentation.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint="presentation preview"
            className="hover:scale-105 transition-transform duration-300"
          />
        </Link>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Link href={`/editor/${presentation.id}`}>
          <CardTitle className="font-headline text-xl mb-1 hover:text-primary transition-colors">
            {presentation.title}
          </CardTitle>
        </Link>
        <CardDescription className="text-sm text-muted-foreground mb-2 truncate">
          {presentation.description || "No description available."}
        </CardDescription>
        <div className="flex items-center text-xs text-muted-foreground mb-3">
          <Clock className="w-3 h-3 mr-1.5" />
          Last updated: {formatDistanceToNow(new Date(presentation.lastUpdatedAt), { addSuffix: true })}
        </div>
        {presentation.collaborators && presentation.collaborators.length > 0 && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Users className="w-3 h-3 mr-1.5" />
            {presentation.collaborators.length} collaborator{presentation.collaborators.length > 1 ? 's' : ''}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 border-t">
        <div className="flex justify-between w-full items-center">
          <Link href={`/editor/${presentation.id}`} passHref legacyBehavior>
            <Button size="sm">
              <Edit3 className="mr-2 h-4 w-4" /> Open
            </Button>
          </Link>
          {presentation.settings.isPublic && (
             <Badge variant="outline" className="flex items-center">
              <Eye className="w-3 h-3 mr-1" /> Public
            </Badge>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
