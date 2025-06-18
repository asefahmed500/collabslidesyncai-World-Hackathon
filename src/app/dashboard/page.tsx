
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PresentationCard } from '@/components/dashboard/PresentationCard';
import type { Presentation, User as AppUser } from '@/types'; 
import { PlusCircle, Search, Filter, List, Grid, Users, Activity, Loader2, FileWarning, Library, ArrowUpDown, Eye, Trash2, Edit3, MoreVertical, CopyIcon, Star } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { getPresentationsForUser, createPresentation as apiCreatePresentation, deletePresentation as apiDeletePresentation } from '@/lib/firestoreService';
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
import { formatDistanceToNowStrict } from 'date-fns';


type SortOption = 'lastUpdatedAt_desc' | 'lastUpdatedAt_asc' | 'title_asc' | 'title_desc' | 'createdAt_desc' | 'createdAt_asc';


export default function DashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); 
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('lastUpdatedAt_desc');
  const [presentationToDelete, setPresentationToDelete] = useState<Presentation | null>(null);


  const fetchAndSetPresentations = useCallback(async () => {
    if (currentUser) {
      setIsLoading(true);
      try {
        const data = await getPresentationsForUser(currentUser.id, currentUser.teamId);
        setPresentations(data);
      } catch (error) {
        console.error("Error fetching presentations:", error);
        toast({ title: "Error", description: "Could not fetch presentations.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    } else if (currentUser) {
      fetchAndSetPresentations();
    } else if (!authLoading && !currentUser) {
        setIsLoading(false); 
    }
  }, [currentUser, authLoading, router, fetchAndSetPresentations]);

  const handleCreateNewPresentation = async () => {
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to create a presentation.", variant: "destructive" });
      return;
    }
    try {
      // Default teamId to undefined if currentUser.teamId is null
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
    if (!presentationToDelete || !currentUser) return;
    try {
      await apiDeletePresentation(presentationToDelete.id, presentationToDelete.teamId || undefined, currentUser.id);
      toast({ title: "Presentation Deleted", description: `"${presentationToDelete.title}" has been removed.` });
      setPresentations(prev => prev.filter(p => p.id !== presentationToDelete.id));
    } catch (error: any) {
      console.error("Error deleting presentation:", error);
      toast({ title: "Error", description: error.message || "Could not delete presentation.", variant: "destructive" });
    } finally {
      setPresentationToDelete(null);
    }
  };


  const sortedAndFilteredPresentations = presentations
    .filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!currentUser) return false;
      
      const isSharedDirectly = p.access && p.access[currentUser.id] && p.creatorId !== currentUser.id;
      const isTeamAccessible = p.teamId && p.teamId === currentUser.teamId && p.creatorId !== currentUser.id && !isSharedDirectly;


      let matchesFilter = false;
      switch (filter) {
        case 'all':
            matchesFilter = true;
            break;
        case 'mine':
            matchesFilter = p.creatorId === currentUser.id;
            break;
        case 'shared': // Explicitly shared OR accessible via team but not created by user
            matchesFilter = isSharedDirectly || isTeamAccessible;
            break;
        case 'team': // Specifically team presentations (could be created by user or others in team)
            matchesFilter = !!(p.teamId && p.teamId === currentUser.teamId);
            break;
        default:
            matchesFilter = true;
      }
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
        const getVal = (obj: Presentation, keyPart: string) => {
            if (keyPart.startsWith('lastUpdatedAt') || keyPart.startsWith('createdAt')) {
                const dateVal = obj[keyPart.split('_')[0] as 'lastUpdatedAt' | 'createdAt'];
                // Handle both Firestore Timestamps and JS Dates if data source varies
                return dateVal instanceof Date ? dateVal.getTime() : (dateVal as any)?.toDate ? (dateVal as any).toDate().getTime() : 0;
            }
            return obj[keyPart.split('_')[0] as 'title'] || ''; // Ensure string for localeCompare
        };

        const [key, order] = sortOption.split('_');
        const valA = getVal(a, key);
        const valB = getVal(b, key);

        if (typeof valA === 'string' && typeof valB === 'string') {
            return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        // Explicitly cast to number for date comparisons
        return order === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  
  const recentPresentations = [...presentations] // Use all presentations before filtering for "Recent"
    .sort((a,b) => {
        const dateA = a.lastUpdatedAt instanceof Date ? a.lastUpdatedAt.getTime() : (a.lastUpdatedAt as any)?.toDate ? (a.lastUpdatedAt as any).toDate().getTime() : 0;
        const dateB = b.lastUpdatedAt instanceof Date ? b.lastUpdatedAt.getTime() : (b.lastUpdatedAt as any)?.toDate ? (b.lastUpdatedAt as any).toDate().getTime() : 0;
        return dateB - dateA;
    })
    .slice(0,3);

  if (authLoading || (isLoading && currentUser)) { 
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
     return (
        <div className="flex flex-col min-h-screen">
          <SiteHeader />
          <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
            <p>Please log in to view your dashboard.</p>
          </main>
        </div>
     );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-headline text-4xl font-bold text-primary">Your Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {currentUser?.name}! Manage your presentations and assets here.</p>
        </div>

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
          {isLoading ? <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : recentPresentations.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentPresentations.map(p => (
                <PresentationCard 
                    key={p.id} 
                    presentation={p} 
                    onDeleteRequest={() => setPresentationToDelete(p)}
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
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div> : sortedAndFilteredPresentations.length > 0 ? (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
              {sortedAndFilteredPresentations.map((presentation: Presentation) => (
                viewMode === 'grid' ? (
                  <PresentationCard 
                    key={presentation.id} 
                    presentation={presentation} 
                    onDeleteRequest={() => setPresentationToDelete(presentation)}
                  />
                ) : (
                  // List View Item
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
                          <h3 className="font-headline text-lg font-semibold truncate hover:text-primary transition-colors" title={presentation.title}>
                            <Link href={`/editor/${presentation.id}`}>{presentation.title}</Link>
                          </h3>
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
                                <DropdownMenuItem disabled><CopyIcon className="mr-2 h-4 w-4" />Duplicate (Soon)</DropdownMenuItem>
                                <DropdownMenuItem disabled><Star className="mr-2 h-4 w-4" />Add to Favorites (Soon)</DropdownMenuItem>
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
                      Manage your team's shared images and other files.
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
        © {new Date().getFullYear()} CollabSlideSyncAI.
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

    