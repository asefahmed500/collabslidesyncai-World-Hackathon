
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsIcon, Palette, FileText as FileTextIcon, Mail, Slack, ExternalLink, Globe, Info } from "lucide-react";

export default function AdminPlatformSettingsPage() {
  // For this placeholder, form submission is not implemented
  // In a real app, you'd use react-hook-form, Zod, and server actions/API routes.

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center"><SettingsIcon className="mr-2 h-6 w-6 text-primary" /> Platform Settings</CardTitle>
        <CardDescription>
          Manage global settings, default configurations, and integrations for CollabDeck.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-10">
        
        {/* Default Team Branding Section */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <Palette className="mr-2 h-5 w-5 text-blue-500" /> Default Team Branding
          </h2>
          <Card className="p-6 bg-muted/30 border">
            <p className="text-sm text-muted-foreground mb-4">
              Set the default branding that new teams will inherit. Individual teams can override these settings later.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultLogoUrl">Default Logo URL</Label>
                  <Input id="defaultLogoUrl" placeholder="https://example.com/default-logo.png" className="mt-1 bg-background" disabled />
                </div>
                 <div>
                  <Label htmlFor="defaultFontPrimary">Default Primary Font</Label>
                  <Input id="defaultFontPrimary" placeholder="Space Grotesk" className="mt-1 bg-background" disabled />
                </div>
                <div>
                  <Label htmlFor="defaultFontSecondary">Default Secondary Font</Label>
                  <Input id="defaultFontSecondary" placeholder="PT Sans" className="mt-1 bg-background" disabled />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="defaultPrimaryColor">Default Primary Color</Label>
                  <Input id="defaultPrimaryColor" type="color" defaultValue="#3F51B5" className="mt-1 h-10 p-1 bg-background" disabled />
                </div>
                <div>
                  <Label htmlFor="defaultSecondaryColor">Default Secondary Color</Label>
                  <Input id="defaultSecondaryColor" type="color" defaultValue="#E8EAF6" className="mt-1 h-10 p-1 bg-background" disabled />
                </div>
                <div>
                  <Label htmlFor="defaultAccentColor">Default Accent Color</Label>
                  <Input id="defaultAccentColor" type="color" defaultValue="#9C27B0" className="mt-1 h-10 p-1 bg-background" disabled />
                </div>
              </div>
              <Button disabled>Save Default Branding (Not Implemented)</Button>
            </div>
          </Card>
        </section>

        {/* Legal Content Section */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <FileTextIcon className="mr-2 h-5 w-5 text-green-500" /> Legal Content Management
          </h2>
          <Card className="p-6 bg-muted/30 border">
            <p className="text-sm text-muted-foreground mb-4">
              Update the platform's Terms of Service and Privacy Policy. (Full editor for these is a future enhancement. Currently, these are typically static files).
            </p>
            <div className="space-y-3">
              <Button variant="outline" disabled className="w-full sm:w-auto">Edit Terms of Service (Placeholder)</Button>
              <Button variant="outline" disabled className="w-full sm:w-auto">Edit Privacy Policy (Placeholder)</Button>
            </div>
          </Card>
        </section>

        {/* Email Templates Section */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <Mail className="mr-2 h-5 w-5 text-orange-500" /> Email Template Management
          </h2>
           <Card className="p-6 bg-muted/30 border">
            <p className="text-sm text-muted-foreground mb-4">
              Customize system-generated emails. (Requires advanced backend and template engine integration - Future Enhancement).
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground pl-4 space-y-1">
                <li>Invitation Emails (Team, Presentation)</li>
                <li>Password Reset Emails</li>
                <li>Email Verification Emails</li>
                <li>Notification Summary Emails</li>
            </ul>
            <Button variant="outline" disabled className="mt-4 w-full sm:w-auto">Manage Email Templates (Placeholder)</Button>
          </Card>
        </section>

        {/* 3rd Party Integrations Section */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <Slack className="mr-2 h-5 w-5 text-purple-500" /> 3rd-Party Integrations
          </h2>
           <Card className="p-6 bg-muted/30 border">
            <p className="text-sm text-muted-foreground mb-4">
              Configure integrations with services like Slack, Google Drive, Dropbox. (Each is a significant feature - Future Enhancement).
            </p>
             <div className="space-x-2">
                <Button variant="outline" disabled><Slack className="mr-1 h-4 w-4"/>Configure Slack (Placeholder)</Button>
                <Button variant="outline" disabled><ExternalLink className="mr-1 h-4 w-4"/>Configure Drive (Placeholder)</Button>
             </div>
          </Card>
        </section>
        
        {/* Custom Domains Section */}
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <Globe className="mr-2 h-5 w-5 text-teal-500" /> Custom Domains
          </h2>
          <Card className="p-6 bg-muted/30 border">
            <p className="text-sm text-muted-foreground mb-4">
              Manage custom domains for white-label clients (Advanced Feature - Coming Soon with Premium Plans).
            </p>
            <Button variant="outline" disabled className="w-full sm:w-auto">Manage Custom Domains (Placeholder)</Button>
          </Card>
        </section>
        
        <div className="p-4 border-t mt-6 bg-amber-50 border-amber-200 rounded-lg">
            <h3 className="text-md font-semibold mb-2 flex items-center text-amber-700"><Info className="mr-2 h-5 w-5"/>Important Note</h3>
            <p className="text-sm text-amber-600">
                The settings on this page are currently placeholders. Full implementation of saving and applying these global configurations requires significant backend development.
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
