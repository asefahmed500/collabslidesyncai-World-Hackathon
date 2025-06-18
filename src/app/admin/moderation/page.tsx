
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ListFilter, Search, Eye } from "lucide-react";

export default function AdminContentModerationPage() {
  // Placeholder states - in a real app, these would be fetched and managed
  const flaggedPresentationsCount = 0; // Example: fetch from a 'flags' collection
  const reviewQueueCount = 0;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShieldAlert className="mr-2 h-6 w-6 text-destructive" /> Content Moderation Dashboard
          </CardTitle>
          <CardDescription>
            Oversee content quality, review flagged items, and manage platform policies.
            <br />
            <span className="text-xs text-orange-500">Note: Automated scanning and full review queue are planned features. Current capabilities are manual.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">Flagged Content Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{flaggedPresentationsCount}</p>
                <p className="text-sm text-muted-foreground">Presentations currently flagged for review.</p>
                <Button variant="outline" className="mt-3" disabled>
                  <Eye className="mr-2 h-4 w-4" /> View Flagged Queue (Coming Soon)
                </Button>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">Manual Review Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Use the "All Presentations" page to manually change a presentation's moderation status (e.g., to 'under_review' or 'taken_down').
                </p>
                <Button asChild variant="secondary">
                  <a href="/admin/presentations">Go to All Presentations</a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="p-6 border rounded-lg bg-background text-center shadow">
            <h3 className="text-xl font-semibold mb-2">Future Moderation Tools</h3>
            <ul className="list-disc list-inside text-muted-foreground text-left max-w-md mx-auto space-y-1">
              <li>Automated scanning for offensive content, copyright violations, and sensitive information using AI.</li>
              <li>A dedicated review queue for admins to process flagged items.</li>
              <li>User reporting system for community-driven moderation.</li>
              <li>Policy management and violation tracking.</li>
              <li>Automated blocking of media uploads violating policies.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              These advanced features require integration with AI models and robust backend systems.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    