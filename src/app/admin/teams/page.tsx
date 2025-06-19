
"use client";

import { useEffect, useState, useCallback } from 'react';
import type { Team } from '@/types';
import { getAllTeamsFromMongoDB } from '@/lib/mongoTeamService'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Users, Trash2, Search, MoreVertical, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { useRouter } from 'next/navigation';


export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();

  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedTeams = await getAllTeamsFromMongoDB();
      setTeams(fetchedTeams);
      setFilteredTeams(fetchedTeams);
    } catch (error) {
       console.error("Error fetching teams from MongoDB:", error);
       toast({ title: "Error", description: "Could not fetch teams.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    setFilteredTeams(
      teams.filter(team =>
        (team.name?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (team.id?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (team.ownerId?.toLowerCase() || '').includes(lowerSearchTerm)
      )
    );
  }, [searchTerm, teams]);

  const handleDeleteTeam = async () => {
    if (!teamToDelete || !currentUser || !currentUser.isAppAdmin) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/teams/${teamToDelete.id}?actorUserId=${currentUser.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast({ title: "Team Deleted", description: `Team "${teamToDelete.name}" and its associations have been removed.` });
        fetchTeams(); // Re-fetch to update the list
      } else {
        toast({ title: "Deletion Failed", description: result.message || "Could not delete team.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setTeamToDelete(null);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>All Teams ({filteredTeams.length} / {teams.length})</CardTitle>
          <CardDescription>Browse and manage all teams in the system.</CardDescription>
        </div>
        <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search teams by name, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
        </div>
      </CardHeader>
      <CardContent>
        {filteredTeams.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {searchTerm ? "No teams match your search." : "No teams found in the system."}
          </p>
        ) : (
          <div className="overflow-x-auto">
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
                {filteredTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={team.branding?.logoUrl || undefined} alt={team.name} data-ai-hint="team logo small"/>
                          <AvatarFallback>{team.name ? team.name.charAt(0).toUpperCase() : <Users size={16}/>}</AvatarFallback>
                        </Avatar>
                         <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[150px]">{team.name}</span>
                            <span className="text-xs text-muted-foreground font-mono truncate max-w-[100px]">{team.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[120px]">{team.ownerId}</TableCell>
                    <TableCell>{team.members ? Object.keys(team.members).length : 0}</TableCell>
                    <TableCell className="text-xs">
                      {team.createdAt ? format(new Date(team.createdAt), 'PP') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Team Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Manage Team</DropdownMenuLabel>
                            <DropdownMenuItem 
                                onClick={() => alert(`Placeholder: Admin view for team "${team.name}" would show members, specific activity logs, and allow admin-specific member management.`)}
                                title="View detailed team information (Admin perspective)"
                            >
                                <Eye className="mr-2 h-4 w-4" /> View Details (Placeholder)
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => router.push(`/dashboard/manage-team?teamId=${team.id}`)}
                                disabled={!currentUser || !(team.members && team.members[currentUser.id] && (team.members[currentUser.id].role === 'owner' || team.members[currentUser.id].role === 'admin'))}
                                title={!currentUser || !(team.members && team.members[currentUser.id] && (team.members[currentUser.id].role === 'owner' || team.members[currentUser.id].role === 'admin')) ? "You must be an owner/admin of this specific team to use the standard manage page" : "Manage team (as team admin/owner)"}
                            >
                                <Users className="mr-2 h-4 w-4" /> Manage via Dashboard (if member)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setTeamToDelete(team)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Team
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {teamToDelete && (
        <AlertDialog open={!!teamToDelete} onOpenChange={(open) => { if (!open) { setTeamToDelete(null); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Team "{teamToDelete.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the team, remove all members from it (their accounts will remain but they won't be part of this team), and disassociate any presentations from this team. Are you sure?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTeamToDelete(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTeam}
                disabled={isSubmitting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Confirm Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
    
