
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { TeamSettingsForm } from '@/components/team/TeamSettingsForm';
import { TeamMembersManager } from '@/components/team/TeamMembersManager';
import { TeamActivityLog } from '@/components/team/TeamActivityLog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ShieldAlert, Users, Settings, Activity, Briefcase } from 'lucide-react';
import type { Team, User as AppUser, TeamActivity as TeamActivityType, TeamMember } from '@/types';
// Removed direct imports from mongoTeamService
// import { getTeamFromMongoDB, getTeamActivitiesFromMongoDB } from '@/lib/mongoTeamService';
import { getTeamDataAction, getTeamActivitiesAction } from './actions'; // Import Server Actions
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function ManageTeamPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamActivities, setTeamActivities] = useState<TeamActivityType[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [hasManagementPermission, setHasManagementPermission] = useState(false);

  const fetchTeamData = useCallback(async () => {
    if (currentUser?.teamId) {
      setIsLoadingTeam(true);
      try {
        // Use Server Action to fetch team data
        const result = await getTeamDataAction(currentUser.teamId);
        if (result.success && result.team) {
          const memberInfo = result.team.members[currentUser.id];
          const canManage = memberInfo && (memberInfo.role === 'owner' || memberInfo.role === 'admin');
          setHasManagementPermission(canManage);
          setTeam(result.team);
        } else {
          toast({ title: "Error", description: result.message || "Team not found.", variant: "destructive" });
          router.push('/dashboard');
        }
      } catch (error) {
        console.error("Error fetching team:", error);
        toast({ title: "Error", description: "Could not fetch team details.", variant: "destructive" });
      } finally {
        setIsLoadingTeam(false);
      }
    } else if (!authLoading && currentUser && !currentUser.teamId) {
      toast({ title: "No Team Found", description: "You are not currently part of a team. Create or join one!", variant: "info" });
      router.push('/dashboard'); 
      setIsLoadingTeam(false);
    } else if (!authLoading && !currentUser) {
      router.push('/login');
      setIsLoadingTeam(false);
    }
  }, [currentUser, authLoading, router, toast]);

  const fetchActivities = useCallback(async () => {
     if (currentUser?.teamId) {
        setIsLoadingActivities(true);
        try {
            // Use Server Action to fetch team activities
            const result = await getTeamActivitiesAction(currentUser.teamId);
            if (result.success) {
                setTeamActivities(result.activities);
            } else {
                toast({ title: "Error", description: result.message || "Could not fetch team activities.", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error fetching team activities:", error);
            toast({ title: "Error", description: "Could not fetch team activities.", variant: "destructive" });
        } finally {
            setIsLoadingActivities(false);
        }
     }
  }, [currentUser, toast]);


  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
      setIsLoadingTeam(false);
      setIsLoadingActivities(false);
      return;
    }
    
    if (currentUser) { // User is loaded
        if (currentUser.teamId) {
            fetchTeamData();
            fetchActivities();
        } else if (!authLoading) { // User loaded, no teamId, not authLoading
             toast({ title: "No Team Found", description: "You are not currently part of a team.", variant: "info" });
             router.push('/dashboard');
             setIsLoadingTeam(false);
             setIsLoadingActivities(false);
        }
    }
  }, [currentUser, authLoading, router, fetchTeamData, fetchActivities]);


  if (authLoading || isLoadingTeam) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Loading team data...</p>
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
          <Briefcase className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="font-headline text-3xl font-bold mb-2">No Team Data</h1>
          <p className="text-muted-foreground">Could not load your team details. You might not be part of a team or an error occurred.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6">Go to Dashboard</Button>
        </main>
      </div>
    );
  }
  
  const onTeamUpdated = (updatedTeam: Team) => {
    setTeam(updatedTeam); 
    fetchActivities(); 
    toast({ title: "Team Updated", description: "Your team settings have been saved." });
  };
  
  const onMembersUpdated = (updatedMembers: { [userId: string]: TeamMember }) => {
    setTeam(prevTeam => prevTeam ? { ...prevTeam, members: updatedMembers } : null);
    fetchActivities(); 
  };


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-headline text-4xl font-bold text-primary">Manage Team: {team.name}</h1>
          <p className="text-muted-foreground">Update your team settings, manage members, and view activity.</p>
        </div>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6">
            <TabsTrigger value="members"><Users className="mr-2 h-4 w-4" />Members</TabsTrigger>
            <TabsTrigger value="settings" disabled={!hasManagementPermission}><Settings className="mr-2 h-4 w-4" />Settings & Branding</TabsTrigger>
            <TabsTrigger value="activity"><Activity className="mr-2 h-4 w-4" />Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card className="shadow-lg">
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
            {hasManagementPermission ? (
                <Card className="shadow-lg">
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
            ) : (
                <Card className="shadow-lg">
                    <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">You do not have permission to edit team settings.</p>
                    </CardContent>
                </Card>
            )}
          </TabsContent>
          
          <TabsContent value="activity">
            <Card className="shadow-lg">
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
      <footer className="text-center p-4 text-muted-foreground text-sm border-t mt-auto">
        © {new Date().getFullYear()} CollabSlideSyncAI.
      </footer>
    </div>
  );
}
