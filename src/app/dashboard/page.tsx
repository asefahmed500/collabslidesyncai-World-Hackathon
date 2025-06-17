
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PresentationCard } from '@/components/dashboard/PresentationCard';
import type { Presentation, User as AppUser } from '@/types'; 
import { PlusCircle, Search, Filter, List, Grid, Users, Activity, Loader2, FileWarning, Library } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { getPresentationsForUser, createPresentation as apiCreatePresentation } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); 
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    if (currentUser) {
      setIsLoading(true);
      getPresentationsForUser(currentUser.id)
        .then(data => {
          setPresentations(data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error("Error fetching presentations:", error);
          toast({ title: "Error", description: "Could not fetch presentations.", variant: "destructive" });
          setIsLoading(false);
        });
    } else if (!authLoading && !currentUser) {
        setIsLoading(false); 
    }
  }, [currentUser, toast, authLoading]);

  const handleCreateNewPresentation = async () => {
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to create a presentation.", variant: "destructive" });
      return;
    }
    try {
      const newPresentationId = await apiCreatePresentation(currentUser.id, "Untitled Presentation", currentUser.teamId);
      toast({ title: "Presentation Created", description: "Redirecting to editor..." });
      router.push(`/editor/${newPresentationId}`);
    } catch (error) {
      console.error("Error creating presentation:", error);
      toast({ title: "Error", description: "Could not create presentation.", variant: "destructive" });
    }
  };

  const filteredPresentations = presentations.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    if (!currentUser) return false;
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'mine' && p.creatorId === currentUser.id) ||
                         (filter === 'shared' && p.access && p.access[currentUser.id] && p.creatorId !== currentUser.id) ||
                         (filter === 'team' && p.teamId && p.teamId === currentUser.teamId && p.creatorId !== currentUser.id); 
    return matchesSearch && matchesFilter;
  });
  
  const recentPresentations = [...filteredPresentations]
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
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-headline text-4xl font-bold text-primary">Your Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {currentUser?.name}! Manage your presentations and assets here.</p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search presentations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Presentations</SelectItem>
                <SelectItem value="mine">Created by Me</SelectItem>
                <SelectItem value="shared">Shared with Me</SelectItem>
                {currentUser?.teamId && <SelectItem value="team">My Team&apos;s</SelectItem>}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} aria-label="Toggle view mode">
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button onClick={handleCreateNewPresentation}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New
            </Button>
          </div>
        </div>
        
        <section className="mb-8">
          <h2 className="font-headline text-2xl font-semibold mb-4">Recent Presentations</h2>
          {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : recentPresentations.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentPresentations.map(p => <PresentationCard key={p.id} presentation={p} />)}
            </div>
          ) : (
             <Card className="flex flex-col items-center justify-center p-8 border-dashed">
                <FileWarning className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground">No Recent Presentations</h3>
                <p className="text-sm text-muted-foreground mb-4">Start by creating a new presentation.</p>
                <Button onClick={handleCreateNewPresentation}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Presentation
                </Button>
            </Card>
          )}
        </section>

        <section className="mb-12">
          <h2 className="font-headline text-2xl font-semibold mb-4">All Presentations</h2>
          {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : filteredPresentations.length > 0 ? (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
              {filteredPresentations.map((presentation: Presentation) => (
                viewMode === 'grid' ? (
                  <PresentationCard key={presentation.id} presentation={presentation} />
                ) : (
                  <Card key={presentation.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Image src={presentation.thumbnailUrl || "https://placehold.co/80x45.png"} alt={presentation.title} width={80} height={45} className="rounded" data-ai-hint="presentation thumbnail"/>
                        <div>
                          <h3 className="font-headline text-lg font-semibold">{presentation.title}</h3>
                          <p className="text-sm text-muted-foreground">Last updated: {new Date(presentation.lastUpdatedAt as Date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/editor/${presentation.id}`}>Open</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
               {searchTerm || filter !== 'all' ? (
                 <>
                    <Search className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-lg">No presentations match your search or filter.</p>
                    <Button className="mt-4" onClick={() => { setSearchTerm(''); setFilter('all'); }}>
                        Clear Search & Filters
                    </Button>
                 </>
               ) : (
                 <Card className="flex flex-col items-center justify-center p-8 border-dashed">
                    <FileWarning className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold text-muted-foreground">No Presentations Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">It looks like you haven&apos;t created any presentations.</p>
                    <Button onClick={handleCreateNewPresentation}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Create a Presentation
                    </Button>
                </Card>
               )}
            </div>
          )}
        </section>
        
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center">
                <Library className="mr-2 h-5 w-5 text-primary" />
                Team Asset Library
              </CardTitle>
            </CardHeader>
            <CardContent>
               {currentUser?.teamId ? (
                <>
                  <p className="text-muted-foreground mb-4">
                      Manage your team's shared images and other files.
                  </p>
                  <Link href="/dashboard/assets" passHref legacyBehavior>
                     <Button variant="outline">Go to Asset Library</Button>
                  </Link>
                </>
               ) : (
                 <p className="text-muted-foreground">Create or join a team to use the asset library.</p>
               )}
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center">
                <Activity className="mr-2 h-5 w-5 text-primary" />
                Team Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
               {currentUser?.teamId ? (
                <p className="text-muted-foreground">
                    View your team's recent activity in the <Link href="/dashboard/manage-team" className="text-primary hover:underline">Manage Team</Link> section.
                </p>
               ) : (
                 <p className="text-muted-foreground">Create or join a team to see team activity.</p>
               )}
            </CardContent>
          </Card>
        </section>

      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t">
        © {new Date().getFullYear()} CollabSlideSyncAI.
      </footer>
    </div>
  );
}
