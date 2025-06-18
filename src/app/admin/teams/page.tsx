
"use client";

import { useEffect, useState } from 'react';
import type { Team } from '@/types';
// import { getAllTeams } from '@/lib/firestoreService'; // Firestore no longer source for teams
import { getAllTeamsFromMongoDB } from '@/lib/mongoTeamService'; // Import MongoDB service
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    getAllTeamsFromMongoDB()
      .then(setTeams)
      .catch(error => {
         console.error("Error fetching teams from MongoDB:", error);
         toast({ title: "Error", description: "Could not fetch teams.", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Teams ({teams.length})</CardTitle>
        <CardDescription>Browse and manage all teams in the system (from MongoDB).</CardDescription>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <p className="text-muted-foreground text-center">No teams found in MongoDB.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Owner ID</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={team.branding?.logoUrl || undefined} alt={team.name} data-ai-hint="team logo small"/>
                        <AvatarFallback>{team.name ? team.name.charAt(0).toUpperCase() : <Users size={16}/>}</AvatarFallback>
                      </Avatar>
                      {team.name}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{team.ownerId}</TableCell>
                  <TableCell>{Object.keys(team.members || {}).length}</TableCell>
                  <TableCell>
                    {team.createdAt ? format(new Date(team.createdAt), 'PP') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" disabled title="Edit Team (Placeholder)">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled title="Delete Team (Placeholder)">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
