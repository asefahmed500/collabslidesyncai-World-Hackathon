
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Users, FileText, Zap } from "lucide-react";

export default function AdminStatsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5" /> Usage Statistics</CardTitle>
        <CardDescription>
          Platform analytics and key performance indicators. (Further implementation needed)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-6 border rounded-lg bg-muted/30 text-center">
          <h3 className="text-xl font-semibold mb-2">Usage Analytics - Placeholder</h3>
          <p className="text-muted-foreground mb-4">
            This area will display key metrics about platform usage, such as:
          </p>
          <ul className="list-disc list-inside text-left text-muted-foreground mb-4 mx-auto max-w-md">
            <li>Total Users & Active Users (DAU/MAU)</li>
            <li>Number of Teams Created</li>
            <li>Number of Presentations Created</li>
            <li>AI Feature Usage (e.g., suggestions generated)</li>
            <li>Storage Utilization</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Implementing these statistics requires setting up data collection and aggregation pipelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">N/A</div>
              <p className="text-xs text-muted-foreground">Data not available</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Presentations</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">N/A</div>
              <p className="text-xs text-muted-foreground">Data not available</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Features Used</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">N/A</div>
              <p className="text-xs text-muted-foreground">Data not available</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
