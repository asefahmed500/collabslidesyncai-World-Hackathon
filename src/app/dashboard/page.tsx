"use client";

import { useState } from 'react';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PresentationCard } from '@/components/dashboard/PresentationCard';
import { mockPresentations, mockUser } from '@/lib/mock-data';
import type { Presentation } from '@/types';
import { PlusCircle, Search, Filter, List, Grid, Users, Activity } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // e.g., 'all', 'mine', 'shared'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // 'grid' or 'list'

  // Filter presentations based on search term and filter
  const filteredPresentations = mockPresentations.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'mine' && p.creatorId === mockUser.id) ||
                         (filter === 'shared' && p.creatorId !== mockUser.id && p.access[mockUser.id]);
    return matchesSearch && matchesFilter;
  });
  
  const recentPresentations = [...mockPresentations]
    .sort((a,b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
    .slice(0,3);

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-headline text-4xl font-bold text-primary">Your Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {mockUser.name}! Manage your presentations here.</p>
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
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} aria-label="Toggle view mode">
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New
            </Button>
          </div>
        </div>
        
        {/* Recent Presentations Section */}
        <section className="mb-8">
          <h2 className="font-headline text-2xl font-semibold mb-4">Recent Presentations</h2>
          {recentPresentations.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentPresentations.map(p => <PresentationCard key={p.id} presentation={p} />)}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent presentations.</p>
          )}
        </section>

        {/* All Presentations Section */}
        <section>
          <h2 className="font-headline text-2xl font-semibold mb-4">All Presentations</h2>
          {filteredPresentations.length > 0 ? (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
              {filteredPresentations.map((presentation: Presentation) => (
                viewMode === 'grid' ? (
                  <PresentationCard key={presentation.id} presentation={presentation} />
                ) : (
                  // List view item (simplified)
                  <Card key={presentation.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Image src={presentation.thumbnailUrl || "https://placehold.co/80x45.png"} alt={presentation.title} width={80} height={45} className="rounded" data-ai-hint="presentation thumbnail"/>
                        <div>
                          <h3 className="font-headline text-lg font-semibold">{presentation.title}</h3>
                          <p className="text-sm text-muted-foreground">Last updated: {new Date(presentation.lastUpdatedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/editor/${presentation.id}`}>Open</a>
                      </Button>
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No presentations match your search or filter.</p>
              <Button className="mt-4" onClick={() => { setSearchTerm(''); setFilter('all'); }}>
                Clear Search & Filters
              </Button>
            </div>
          )}
        </section>
        
        {/* Placeholder for Team Activity Feed */}
        <section className="mt-12">
           <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center">
                <Activity className="mr-2 h-5 w-5 text-primary" />
                Team Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <ul className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <li key={i} className="flex items-center text-sm">
                      <Image src={`https://placehold.co/32x32.png?text=U${i+1}`} alt="User" width={32} height={32} className="rounded-full mr-3" data-ai-hint="profile avatar"/>
                      <div>
                        <strong>User {i+1}</strong> edited "Presentation Title {i % 2 + 1}"
                        <span className="text-xs text-muted-foreground ml-2">{i+1}m ago</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
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
