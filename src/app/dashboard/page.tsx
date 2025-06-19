
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PresentationCard } from '@/components/dashboard/PresentationCard';
import type { Presentation, User as AppUser, Team as TeamType, TeamRole } from '@/types';
import { PlusCircle, Search, Filter, List, Grid, Users, Activity, Loader2, FileWarning, Library, ArrowUpDown, Eye, Trash2, Edit3, MoreVertical, CopyIcon, Star, BarChart2, FileText as FileTextIcon, Cpu, Users2, StarIcon as FilledStarIcon, Sparkles, ExternalLink, Briefcase, Check, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { getPresentationsForUser, createPresentation as apiCreatePresentation, deletePresentation as apiDeletePresentation, duplicatePresentation as apiDuplicatePresentation, toggleFavoriteStatus as apiToggleFavoriteStatus } from '@/lib/firestoreService';
import { getPendingTeamInvitationsForUserById } from '@/lib/mongoTeamService';
import { createTeamForExistingUser } from './actions';
import { useToast } from '@/hooks/use-toast';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatDistanceToNowStrict } from 'date-fns';


type SortOption = 'lastUpdatedAt_desc' | 'lastUpdatedAt_asc' | 'title_asc' | 'title_desc' | 'createdAt_desc' | 'createdAt_asc';

const createTeamFormSchema = z.object({
  teamName: z.string().min(3, { message: "Team name must be at least 3 characters." }).max(50),
});
type CreateTeamFormValues = z.infer<typeof createTeamFormSchema>;

function CreateTeamSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Create Team
    </Button>
  );
}

export default function DashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true); // Combined loading state for presentations and invites
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('lastUpdatedAt_desc');
  const [presentationToDelete, setPresentationToDelete] = useState<Presentation | null>(null);

  const [presentationsCreatedCount, setPresentationsCreatedCount] = useState(0);
  const [totalSlidesCreatedCount, setTotalSlidesCreatedCount] = useState(0);
  
  const [pendingInvitations, setPendingInvitations] = useState<TeamType[]>([]);
  const [isRespondingToInvite, setIsRespondingToInvite] = useState<string | null>(null); // Stores teamId being responded to

  // For "Create Team" form
  const [createTeamFormState, createTeamFormAction] = useFormState(createTeamForExistingUser, { success: false, message: "" });
  const createTeamForm = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamFormSchema),
    defaultValues: { teamName: "" },
  });


  const fetchData = useCallback(async () => {
    if (currentUser) {
      setIsLoadingData(true);
      try {
        if (currentUser.teamId) {
          const data = await getPresentationsForUser(currentUser.id, currentUser.teamId);
          setPresentations(data);
          const userCreatedPresentations = data.filter(p => p.creatorId === currentUser.id);
          setPresentationsCreatedCount(userCreatedPresentations.length);
          setTotalSlidesCreatedCount(userCreatedPresentations.reduce((sum, p) => sum + (p.slides?.length || 0), 0));
        } else {
          // User doesn't have a teamId, fetch pending invitations
          const invites = await getPendingTeamInvitationsForUserById(currentUser.id);
          setPendingInvitations(invites);
          setPresentations([]); // No presentations if no team
          setPresentationsCreatedCount(0);
          setTotalSlidesCreatedCount(0);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast({ title: "Error", description: "Could not fetch dashboard data.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    } else {
      setIsLoadingData(false); // Not logged in, no data to fetch
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    } else if (currentUser) {
      fetchData();
    }
  }, [currentUser, authLoading, router, fetchData]);
  
  useEffect(() => {
    if (createTeamFormState.message) {
      if (createTeamFormState.success) {
        toast({ title: "Team Created!", description: createTeamFormState.message });
        createTeamForm.reset();
        // Critical: After team creation, currentUser object needs to be updated.
        // The AuthProvider should ideally refetch/update currentUser.
        // Forcing a hard refresh is a simple way if AuthProvider doesn't auto-update on DB change.
        router.refresh(); // This will cause AuthProvider to re-evaluate
        fetchData(); // Re-fetch data to reflect new team status
      } else {
        toast({ title: "Error", description: createTeamFormState.message, variant: "destructive" });
      }
    }
  }, [createTeamFormState, toast, createTeamForm, router, fetchData]);


  const handleCreateNewPresentation = async () => {
    // ... (existing logic for create presentation)
     if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to create a presentation.", variant: "destructive" });
      return;
    }
    try {
      const teamIdForNewPres = currentUser.teamId || undefined;
      const newPresentationId = await apiCreatePresentation(currentUser.id, "Untitled Presentation", teamIdForNewPres);
      toast({ title: "Presentation Created", description: "Redirecting to editor..." });
      router.push(`/editor/${newPresentationId}`);
    } catch (error: any) {
      console.error("Error creating presentation:", error);
      toast({ title: "Error", description: error.message || "Could not create presentation.", variant: "destructive" });
    }
  };

  const handleDeletePresentation = async () => {
    // ... (existing logic)
    if (!presentationToDelete || !currentUser) return;
    try {
      await apiDeletePresentation(presentationToDelete.id, presentationToDelete.teamId || undefined, currentUser.id);
      toast({ title: "Presentation Deleted", description: `"${presentationToDelete.title}" has been removed.` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not delete presentation.", variant: "destructive" });
    } finally {
      setPresentationToDelete(null);
    }
  };

  const handleDuplicatePresentation = async (presentationId: string) => {
    // ... (existing logic)
     if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    try {
      const newPresentationId = await apiDuplicatePresentation(presentationId, currentUser.id, currentUser.teamId);
      toast({ title: "Presentation Duplicated", description: "A copy has been created. Redirecting to editor..." });
      router.push(`/editor/${newPresentationId}`);
    } catch (error: any) {
      toast({ title: "Error Duplicating", description: error.message || "Could not duplicate presentation.", variant: "destructive" });
    }
  };
  
  const handleToggleFavorite = async (presentationId: string) => {
    // ... (existing logic)
    if (!currentUser) return;
    try {
      const isNowFavorite = await apiToggleFavoriteStatus(presentationId, currentUser.id);
      toast({
        title: isNowFavorite ? "Favorited" : "Unfavorited",
        description: `Presentation ${isNowFavorite ? 'added to' : 'removed from'} favorites.`,
      });
      fetchData(); // Refetch to update favorite status
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not update favorite status.", variant: "destructive" });
    }
  };
  
  const handleRespondToInvitation = async (notificationId: string, teamId: string, role: TeamRole, action: 'accept' | 'decline') => {
    setIsRespondingToInvite(teamId);
    try {
        const response = await fetch('/api/teams/invitations/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId, teamId, roleForAction: role, action })
        });
        const result = await response.json();
        if (result.success) {
            toast({ title: `Invitation ${action === 'accept' ? 'Accepted' : 'Declined'}`, description: result.message });
            // Important: To reflect team change, force refresh or update auth context.
            router.refresh(); // This will trigger AuthProvider to refetch current user, including new teamId
            fetchData(); // Refetch dashboard data
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to respond to invitation.', variant: 'destructive' });
    } finally {
        setIsRespondingToInvite(null);
    }
  };


  const sortedAndFilteredPresentations = presentations
    .filter(p => {
      // ... (existing filter logic)
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!currentUser) return false;

      const isSharedDirectly = p.access && p.access[currentUser.id] && p.creatorId !== currentUser.id;
      const isTeamAccessible = p.teamId && p.teamId === currentUser.teamId && p.creatorId !== currentUser.id && !isSharedDirectly;

      let matchesFilter = false;
      switch (filter) {
        case 'all': matchesFilter = true; break;
        case 'mine': matchesFilter = p.creatorId === currentUser.id; break;
        case 'shared': matchesFilter = isSharedDirectly || isTeamAccessible; break;
        case 'team': matchesFilter = !!(p.teamId && p.teamId === currentUser.teamId); break;
        case 'favorites': matchesFilter = !!(p.favoritedBy && p.favoritedBy[currentUser.id]); break;
        default: matchesFilter = true;
      }
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
        // ... (existing sort logic)
        const getVal = (obj: Presentation, keyPart: string) => {
            if (keyPart.startsWith('lastUpdatedAt') || keyPart.startsWith('createdAt')) {
                const dateVal = obj[keyPart.split('_')[0] as 'lastUpdatedAt' | 'createdAt'];
                return dateVal instanceof Date ? dateVal.getTime() : (dateVal as any)?.toDate ? (dateVal as any).toDate().getTime() : 0;
            }
            return obj[keyPart.split('_')[0] as 'title'] || '';
        };
        const [key, order] = sortOption.split('_');
        const valA = getVal(a, key);
        const valB = getVal(b, key);
        if (typeof valA === 'string' && typeof valB === 'string') {
            return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return order === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

  const recentPresentations = [...presentations]
    .sort((a,b) => {
        // ... (existing recent sort logic)
         const dateA = a.lastUpdatedAt instanceof Date ? a.lastUpdatedAt.getTime() : (a.lastUpdatedAt as any)?.toDate ? (a.lastUpdatedAt as any).toDate().getTime() : 0;
        const dateB = b.lastUpdatedAt instanceof Date ? b.lastUpdatedAt.getTime() : (b.lastUpdatedAt as any)?.toDate ? (b.lastUpdatedAt as any).toDate().getTime() : 0;
        return dateB - dateA;
    })
    .slice(0,3);

  const handleUpgradeClick = () => { /* ... */ };


  if (authLoading || (isLoadingData && currentUser)) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }
  
  if (!currentUser && !authLoading) {
     return ( /* ... existing redirect/login prompt */ 
        <div className="flex flex-col min-h-screen">
          <SiteHeader />
          <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
            <p>Please log in to view your dashboard.</p>
          </main>
        </div>
     );
  }
  
  // New Onboarding / No Team State
  if (currentUser && !currentUser.teamId && !isLoadingData) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <SiteHeader />
        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
          <Card className="max-w-2xl mx-auto shadow-xl my-10">
            <CardHeader className="text-center">
              <Briefcase className="mx-auto h-16 w-16 text-primary mb-4" />
              <CardTitle className="font-headline text-3xl">Welcome to CollabDeck, {currentUser.name}!</CardTitle>
              <CardDescription className="text-lg">Let's get you set up with a team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {pendingInvitations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-center">Pending Team Invitations</h3>
                  <ul className="space-y-3">
                    {pendingInvitations.map(inviteTeam => {
                        const inviteDetails = inviteTeam.pendingInvitations?.[currentUser.id];
                        if (!inviteDetails) return null; // Should not happen if query is correct
                        return (
                            <li key={inviteTeam.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-center gap-3 bg-muted/50">
                                <div>
                                <p className="font-medium">You're invited to join <span className="text-primary font-bold">{inviteTeam.name}</span></p>
                                <p className="text-xs text-muted-foreground">
                                    Invited by {inviteDetails.invitedBy} as a <Badge variant="secondary" className="capitalize">{inviteDetails.role}</Badge>
                                </p>
                                </div>
                                <div className="flex space-x-2 flex-shrink-0">
                                <Button 
                                    size="sm" 
                                    onClick={() => handleRespondToInvitation(inviteDetails.inviteId, inviteTeam.id, inviteDetails.role, 'accept')}
                                    disabled={isRespondingToInvite === inviteTeam.id}
                                >
                                    {isRespondingToInvite === inviteTeam.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <Check className="mr-1 h-4 w-4"/>} Accept
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleRespondToInvitation(inviteDetails.inviteId, inviteTeam.id, inviteDetails.role, 'decline')}
                                    disabled={isRespondingToInvite === inviteTeam.id}
                                >
                                    {isRespondingToInvite === inviteTeam.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <X className="mr-1 h-4 w-4"/>} Decline
                                </Button>
                                </div>
                            </li>
                        );
                    })}
                  </ul>
                </div>
              )}

              {pendingInvitations.length === 0 && (
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">You don't have any pending team invitations.</p>
                </div>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    OR
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-center mb-4">Create a New Team</h3>
                <Form {...createTeamForm}>
                  <form action={createTeamFormAction} onSubmit={createTeamForm.handleSubmit(() => createTeamForm.control._formAction(createTeamFormState as any))} className="space-y-4 max-w-sm mx-auto">
                    <FormField
                      control={createTeamForm.control}
                      name="teamName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your New Team's Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <CreateTeamSubmitButton />
                    {createTeamFormState.message && !createTeamFormState.success && (
                      <p className="text-sm text-destructive text-center">{createTeamFormState.message}</p>
                    )}
                  </form>
                </Form>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Regular Dashboard (User has a teamId)
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-headline text-4xl font-bold text-primary">Your Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {currentUser?.name}! Manage your presentations and assets here.</p>
        </div>
        
        {currentUser && !currentUser.isPremium && (
          <Card className="mb-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/30 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-primary"><Sparkles className="mr-2 h-6 w-6"/> Upgrade to CollabDeck Premium!</CardTitle>
              <CardDescription className="text-foreground/80">Unlock unlimited presentations, advanced AI features, more team members, and custom branding.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleUpgradeClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
                size="lg"
              >
                Upgrade to Premium Plan <ExternalLink className="ml-2 h-4 w-4"/>
              </Button>
            </CardContent>
          </Card>
        )}

        <section className="mb-10">
            <h2 className="font-headline text-2xl font-semibold mb-4 flex items-center">
                <BarChart2 className="mr-3 h-6 w-6 text-primary" />
                Your Analytics & Insights
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Presentations Created</CardTitle>
                        <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{presentationsCreatedCount}</div>
                        <p className="text-xs text-muted-foreground">Total presentations you've started.</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Slides Created</CardTitle>
                        <Grid className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSlidesCreatedCount}</div>
                        <p className="text-xs text-muted-foreground">Across all your created presentations.</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Tokens Used</CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">N/A</div>
                        <p className="text-xs text-muted-foreground">Detailed token tracking coming soon.</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Collaboration Stats</CardTitle>
                        <Users2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">N/A</div>
                         {currentUser?.teamId ? (
                             <p className="text-xs text-muted-foreground">
                                View team activity for insights.
                                <Button variant="link" size="sm" className="p-0 h-auto text-xs ml-1" asChild>
                                    <Link href="/dashboard/manage-team">View Team Activity</Link>
                                </Button>
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">Join or create a team to see collab stats.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </section>

        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border rounded-lg shadow-sm bg-card">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full xs:w-auto sm:w-[160px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Presentations</SelectItem>
                <SelectItem value="mine">Created by Me</SelectItem>
                <SelectItem value="shared">Shared / Team</SelectItem>
                {currentUser?.teamId && <SelectItem value="team">My Team's (Strict)</SelectItem>}
                <SelectItem value="favorites">My Favorites</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                <SelectTrigger className="w-full xs:w-auto sm:w-[180px]">
                    <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="lastUpdatedAt_desc">Last Updated (Newest)</SelectItem>
                    <SelectItem value="lastUpdatedAt_asc">Last Updated (Oldest)</SelectItem>
                    <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                    <SelectItem value="title_desc">Title (Z-A)</SelectItem>
                    <SelectItem value="createdAt_desc">Date Created (Newest)</SelectItem>
                    <SelectItem value="createdAt_asc">Date Created (Oldest)</SelectItem>
                </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} aria-label="Toggle view mode" className="hidden sm:inline-flex">
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button onClick={handleCreateNewPresentation} className="w-full xs:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New
            </Button>
          </div>
        </div>

        <section className="mb-10">
          <h2 className="font-headline text-2xl font-semibold mb-4">Recent Presentations</h2>
          {isLoadingData ? <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : recentPresentations.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentPresentations.map(p => (
                <PresentationCard
                    key={p.id}
                    presentation={p}
                    onDeleteRequest={() => setPresentationToDelete(p)}
                    onDuplicateRequest={handleDuplicatePresentation}
                    onToggleFavoriteRequest={handleToggleFavorite}
                    isFavorite={!!(currentUser && p.favoritedBy && p.favoritedBy[currentUser.id])}
                />
              ))}
            </div>
          ) : (
             <Card className="flex flex-col items-center justify-center p-8 border-dashed bg-muted/30">
                <FileWarning className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground">No Recent Presentations</h3>
                <p className="text-sm text-muted-foreground mb-4">Start by creating a new presentation.</p>
                <Button onClick={handleCreateNewPresentation} variant="secondary">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Presentation
                </Button>
            </Card>
          )}
        </section>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-2xl font-semibold">All Presentations ({sortedAndFilteredPresentations.length})</h2>
             <Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} aria-label="Toggle view mode" className="sm:hidden">
              {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid className="h-5 w-5" />}
            </Button>
          </div>
          {isLoadingData ? <div className="flex justify-center py-8"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div> : sortedAndFilteredPresentations.length > 0 ? (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
              {sortedAndFilteredPresentations.map((presentation: Presentation) => (
                viewMode === 'grid' ? (
                  <PresentationCard
                    key={presentation.id}
                    presentation={presentation}
                    onDeleteRequest={() => setPresentationToDelete(presentation)}
                    onDuplicateRequest={handleDuplicatePresentation}
                    onToggleFavoriteRequest={handleToggleFavorite}
                    isFavorite={!!(currentUser && presentation.favoritedBy && presentation.favoritedBy[currentUser.id])}
                  />
                ) : (
                  <Card key={presentation.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-grow min-w-0">
                        <Image
                            src={presentation.thumbnailUrl || "https://placehold.co/80x45.png"}
                            alt={presentation.title}
                            width={80}
                            height={45}
                            className="rounded-md hidden sm:block flex-shrink-0 object-cover"
                            data-ai-hint="presentation thumbnail small"
                        />
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center">
                            <Link href={`/editor/${presentation.id}`} className="font-headline text-lg font-semibold truncate hover:text-primary transition-colors" title={presentation.title}>
                                {presentation.title}
                            </Link>
                            {currentUser && presentation.favoritedBy && presentation.favoritedBy[currentUser.id] && (
                                <FilledStarIcon className="ml-2 h-4 w-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            Last updated: {presentation.lastUpdatedAt ? formatDistanceToNowStrict(presentation.lastUpdatedAt instanceof Date ? presentation.lastUpdatedAt : (presentation.lastUpdatedAt as any).toDate(), { addSuffix: true }) : 'N/A'}
                            {presentation.teamId && currentUser?.teamId && presentation.teamId === currentUser.teamId && <Badge variant="outline" className="ml-2 text-xs">Team</Badge>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                         {presentation.settings.isPublic && (
                            <Badge variant="outline" className="hidden md:flex items-center text-xs h-7">
                                <Eye className="w-3 h-3 mr-1" /> Public
                            </Badge>
                         )}
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => router.push(`/editor/${presentation.id}`)}><Edit3 className="mr-2 h-4 w-4" />Open Editor</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicatePresentation(presentation.id)}><CopyIcon className="mr-2 h-4 w-4" />Duplicate</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleFavorite(presentation.id)}>
                                    <Star className="mr-2 h-4 w-4" /> {currentUser && presentation.favoritedBy && presentation.favoritedBy[currentUser.id] ? 'Unfavorite' : 'Favorite'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                 {presentation.creatorId === currentUser?.id && (
                                    <DropdownMenuItem onClick={() => setPresentationToDelete(presentation)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Presentation
                                    </DropdownMenuItem>
                                 )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="default" size="sm" asChild className="h-8">
                          <Link href={`/editor/${presentation.id}`}>Open</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
               {searchTerm || filter !== 'all' ? (
                 <>
                    <Search className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-lg">No presentations match your search or filter.</p>
                    <Button className="mt-4" variant="secondary" onClick={() => { setSearchTerm(''); setFilter('all'); setSortOption('lastUpdatedAt_desc'); }}>
                        Clear Search & Filters
                    </Button>
                 </>
               ) : (
                 <Card className="flex flex-col items-center justify-center p-8 border-dashed bg-muted/30">
                    <FileWarning className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold text-muted-foreground">No Presentations Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">It looks like you haven&apos;t created any presentations.</p>
                    <Button onClick={handleCreateNewPresentation} variant="secondary">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create a Presentation
                    </Button>
                </Card>
               )}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center">
                <Library className="mr-2 h-5 w-5 text-primary" />
                Team Asset Library
              </CardTitle>
               <CardDescription>Access shared images and files for your team.</CardDescription>
            </CardHeader>
            <CardContent>
               {currentUser?.teamId ? (
                <>
                  <p className="text-muted-foreground mb-4 text-sm">
                      Manage your team's shared images and other files. (Max 5MB per image)
                  </p>
                  <Link href="/dashboard/assets" passHref legacyBehavior>
                     <Button variant="outline">Go to Asset Library</Button>
                  </Link>
                </>
               ) : (
                 <p className="text-muted-foreground text-sm">Create or join a team to use the asset library. You can create a team when signing up.</p>
               )}
            </CardContent>
          </Card>
           <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                Manage Team
              </CardTitle>
              <CardDescription>Oversee members, settings, and activity.</CardDescription>
            </CardHeader>
            <CardContent>
               {currentUser?.teamId ? (
                <>
                <p className="text-muted-foreground mb-4 text-sm">
                    View your team's members, update settings, and see recent activity.
                </p>
                <Link href="/dashboard/manage-team" passHref legacyBehavior>
                    <Button variant="outline">Manage Your Team</Button>
                </Link>
                </>
               ) : (
                 <p className="text-muted-foreground text-sm">Once you are part of a team, you can manage it here. Teams are created during signup.</p>
               )}
            </CardContent>
          </Card>
        </section>

      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t mt-auto">
        © {new Date().getFullYear()} CollabDeck.
      </footer>

      {presentationToDelete && (
        <AlertDialog open={!!presentationToDelete} onOpenChange={(open) => !open && setPresentationToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center"><Trash2 className="mr-2 h-5 w-5 text-destructive"/>Delete "{presentationToDelete.title}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the presentation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPresentationToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePresentation} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete Presentation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
