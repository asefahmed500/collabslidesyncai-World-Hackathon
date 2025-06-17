
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { TeamSettingsForm } from '@/components/team/TeamSettingsForm';
import { TeamMembersManager } from '@/components/team/TeamMembersManager';
import { TeamActivityLog } from '@/components/team/TeamActivityLog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ShieldAlert, Users, Settings, Activity } from 'lucide-react';
import type { Team, User as AppUser, TeamActivity as TeamActivityType, TeamMember } from '@/types';
import { getTeamById, getTeamActivities } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';

export default function ManageTeamPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamActivities, setTeamActivities] = useState<TeamActivityType[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    if (currentUser?.teamId) {
      setIsLoadingTeam(true);
      getTeamById(currentUser.teamId)
        .then(teamData => {
          if (teamData) {
            // Check if current user is owner or admin of this team
            const memberInfo = teamData.members[currentUser.id];
            if (memberInfo && (memberInfo.role === 'owner' || memberInfo.role === 'admin')) {
              setTeam(teamData);
            } else {
              toast({ title: "Access Denied", description: "You don't have permission to manage this team.", variant: "destructive" });
              router.push('/dashboard');
            }
          } else {
            toast({ title: "Error", description: "Team not found.", variant: "destructive" });
            router.push('/dashboard');
          }
        })
        .catch(error => {
          console.error("Error fetching team:", error);
          toast({ title: "Error", description: "Could not fetch team details.", variant: "destructive" });
        })
        .finally(() => setIsLoadingTeam(false));

      setIsLoadingActivities(true);
      getTeamActivities(currentUser.teamId)
        .then(activities => setTeamActivities(activities))
        .catch(error => {
          console.error("Error fetching team activities:", error);
          toast({ title: "Error", description: "Could not fetch team activities.", variant: "destructive" });
        })
        .finally(() => setIsLoadingActivities(false));

    } else if (!authLoading && currentUser && !currentUser.teamId) {
      // User is loaded but has no teamId, perhaps they need to create/join one
      toast({ title: "No Team Found", description: "You are not currently part of a team or need to create one.", variant: "destructive" });
      router.push('/dashboard'); // Or a "create team" page
      setIsLoadingTeam(false);
      setIsLoadingActivities(false);
    }
  }, [currentUser, authLoading, router, toast]);

  if (authLoading || (!team && isLoadingTeam)) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!currentUser) {
     return <div className="flex min-h-screen flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!team) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h1 className="font-headline text-3xl font-bold mb-2">Team Not Loaded</h1>
          <p className="text-muted-foreground">Could not load your team details or you don't have permission.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6">Go to Dashboard</Button>
        </main>
      </div>
    );
  }
  
  const onTeamUpdated = (updatedTeam: Team) => {
    setTeam(updatedTeam);
    toast({ title: "Team Updated", description: "Your team settings have been saved." });
  };
  
  const onMembersUpdated = (updatedMembers: { [userId: string]: TeamMember }) => {
    setTeam(prevTeam => prevTeam ? { ...prevTeam, members: updatedMembers } : null);
     // Activity log will show this, so toast might be redundant or specific to action
  };


  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-headline text-4xl font-bold text-primary">Manage Team: {team.name}</h1>
          <p className="text-muted-foreground">Update your team settings, manage members, and view activity.</p>
        </div>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="members"><Users className="mr-2 h-4 w-4" />Members</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />Settings & Branding</TabsTrigger>
            <TabsTrigger value="activity"><Activity className="mr-2 h-4 w-4" />Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage who has access to your team and their roles.</CardDescription>
              </CardHeader>
              <CardContent>
                {currentUser && team && (
                  <TeamMembersManager 
                    team={team} 
                    currentUser={currentUser} 
                    onMembersUpdated={onMembersUpdated}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Team Settings & Branding</CardTitle>
                <CardDescription>Customize your team's appearance and general settings.</CardDescription>
              </CardHeader>
              <CardContent>
                {currentUser && team && (
                    <TeamSettingsForm 
                        team={team} 
                        currentUser={currentUser} 
                        onTeamUpdated={onTeamUpdated}
                    />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Team Activity Log</CardTitle>
                <CardDescription>See recent activity within your team.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingActivities ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <TeamActivityLog activities={teamActivities} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t">
        © {new Date().getFullYear()} CollabSlideSyncAI.
      </footer>
    </div>
  );
}
