
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Users, Shield, CreditCard, Activity, FileText, ShieldAlertIcon, MessageSquareWarning, Zap, SettingsIcon, FileLock, Users2, Hourglass, Loader2 } from "lucide-react";
import Link from "next/link";
import { getAdminDashboardStatsAction } from './actions'; // Import the server action

interface AdminStats {
  totalUsers: number;
  totalTeams: number;
  totalPresentations: number;
  presentationsUnderReview: number;
  totalPendingTeamInvites: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats = useState<AdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setIsLoadingStats(true);
      const result = await getAdminDashboardStatsAction();
      if (result.success && result.stats) {
        setStats(result.stats);
      } else {
        console.error("Failed to load admin stats:", result.message);
        // Optionally show a toast notification for the error
      }
      setIsLoadingStats(false);
    }
    fetchStats();
  }, []);

  const statCards = [
    { title: "Total Users", value: stats?.totalUsers, icon: Users, href: "/admin/users", color: "text-blue-500" },
    { title: "Total Teams", value: stats?.totalTeams, icon: Users2, href: "/admin/teams", color: "text-green-500" },
    { title: "Total Presentations", value: stats?.totalPresentations, icon: FileText, href: "/admin/presentations", color: "text-purple-500" },
    { title: "Pending Moderation", value: stats?.presentationsUnderReview, icon: ShieldAlertIcon, href: "/admin/moderation", color: "text-orange-500" },
    { title: "Pending Team Invites", value: stats?.totalPendingTeamInvites, icon: Hourglass, href: "/admin/users", description: "Across all teams", color: "text-teal-500" },
  ];
  
  const adminSections = [
      { href: "/admin/users", label: "Manage Users", icon: Users, description: "View, edit, and manage all user accounts." },
      { href: "/admin/teams", label: "Manage Teams", icon: Users2, description: "Oversee all teams on the platform." },
      { href: "/admin/presentations", label: "Manage Presentations", icon: FileText, description: "View and moderate all presentations." },
      { href: "/admin/moderation", label: "Moderation Queue", icon: ShieldAlertIcon, description: "Review content flagged for moderation." },
      { href: "/admin/feedback", label: "User Feedback", icon: MessageSquareWarning, description: "Address user queries and bug reports." },
      { href: "/admin/billing", label: "Billing Overview", icon: CreditCard, description: "(Placeholder) Manage subscriptions and plans." },
      { href: "/admin/security", label: "Security Center", icon: Shield, description: "(Placeholder) Monitor security and compliance." },
      { href: "/admin/stats", label: "AI &amp; Platform Stats", icon: Zap, description: "(Placeholder) View usage analytics." },
      { href: "/admin/activities", label: "Global Activity Log", icon: Activity, description: "(Placeholder) Track system-wide events." },
      { href: "/admin/settings", label: "Platform Settings", icon: SettingsIcon, description: "(Placeholder) Configure global application settings." },
  ];


  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-bold text-primary">Admin Dashboard</h1>
        <p className="text-muted-foreground">Oversee and manage CollabDeck operations.</p>
      </div>

      <section className="mb-10">
        <h2 className="font-headline text-2xl font-semibold mb-4">Platform At-a-Glance</h2>
        {isLoadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {Array(5).fill(0).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground h-5 w-2/3 bg-muted rounded"></CardTitle>
                  <div className="h-5 w-5 bg-muted rounded"/>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold h-8 w-1/2 bg-muted rounded mb-1"></div>
                  <div className="text-xs text-muted-foreground h-3 w-3/4 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {statCards.map(card => (
              <Link href={card.href} key={card.title} passHref>
                <Card className="shadow-sm hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                    <card.icon className={`h-5 w-5 ${card.color || 'text-muted-foreground'}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{card.value !== undefined ? card.value : <Loader2 className="h-6 w-6 animate-spin"/>}</div>
                     {card.description && <p className="text-xs text-muted-foreground">{card.description}</p>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Could not load platform statistics.</p>
        )}
      </section>

      <section>
        <h2 className="font-headline text-2xl font-semibold mb-6">Management Sections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminSections.map((section) => (
            <Link href={section.href} key={section.label} passHref>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="p-3 bg-primary/10 rounded-lg mr-4">
                        <section.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-medium flex-grow">{section.label}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-xs text-muted-foreground">
                    {section.description}
                    </p>
                </CardContent>
                 <CardFooter className="pt-3">
                    <Button variant="link" className="p-0 h-auto text-sm">Go to {section.label} &rarr;</Button>
                </CardFooter>
                </Card>
            </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
