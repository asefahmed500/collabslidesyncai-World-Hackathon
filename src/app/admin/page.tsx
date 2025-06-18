
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Users, Shield, CreditCard, Activity, FileText, ShieldAlertIcon } from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-bold text-primary">Admin Dashboard</h1>
        <p className="text-muted-foreground">Oversee and manage CollabSlideSyncAI operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/users" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users Management</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">View All Users</div>
              <p className="text-xs text-muted-foreground">
                Browse and manage user accounts and roles.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/teams" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teams Management</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">View All Teams</div>
              <p className="text-xs text-muted-foreground">
                Inspect team details, members, and settings.
              </p>
            </CardContent>
          </Card>
        </Link>

         <Link href="/admin/presentations" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All Presentations</CardTitle>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manage Presentations</div>
              <p className="text-xs text-muted-foreground">
                View and manage all presentations in the system.
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/admin/moderation" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Content Moderation</CardTitle>
              <ShieldAlertIcon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Review Content</div>
              <p className="text-xs text-muted-foreground">
                (Manage flagged content - Placeholder)
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/billing" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Billing & Subscriptions</CardTitle>
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manage Billing</div>
              <p className="text-xs text-muted-foreground">
                (Stripe Integration - Coming Soon)
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/security" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Logs</CardTitle>
              <Shield className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Audit & Security</div>
              <p className="text-xs text-muted-foreground">
                (Review security events - Placeholder)
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/stats" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usage Statistics</CardTitle>
              <BarChart className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Platform Analytics</div>
              <p className="text-xs text-muted-foreground">
                (Monitor platform usage - Placeholder)
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/admin/activities" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Global Activity Feed</CardTitle>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">System Wide Logs</div>
              <p className="text-xs text-muted-foreground">
                (View global activities - Placeholder)
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

    
