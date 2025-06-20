
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileLock, DatabaseBackup, KeyRound, ListChecks, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminSecurityCompliancePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-primary" /> Security & Compliance Center</CardTitle>
        <CardDescription>
          Monitor security events, manage data privacy requests, and oversee platform compliance. (Most features are placeholders for future implementation)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center"><ListChecks className="mr-2 h-5 w-5 text-blue-500"/>Security Event Monitoring</h2>
          <Card className="p-6 bg-muted/30 border">
            <p className="text-sm text-muted-foreground mb-4">
              This section will provide insights into security-related events across the platform.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Suspicious login attempts (location/IP mismatch) - (Future Enhancement)</li>
              <li>High volume of failed login attempts - (Future Enhancement, partial data in Firebase Auth console)</li>
              <li>Account sharing detection (e.g., too many active sessions) - (Advanced Future Enhancement)</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
                Implementing robust, real-time security event monitoring and alerting requires dedicated backend services and potentially third-party security tool integrations.
            </p>
          </Card>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center"><FileLock className="mr-2 h-5 w-5 text-green-500"/>Data Privacy (GDPR/CCPA)</h2>
          <Card className="p-6 bg-muted/30 border">
            <p className="text-sm text-muted-foreground mb-4">
              Manage user data requests in accordance with privacy regulations.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
              <li>
                <strong>Fulfill Data Download Requests:</strong> (Future Enhancement)
                <p className="text-xs pl-4">Requires a system to aggregate user data from Firebase Authentication, Firestore (presentations, assets, comments), and MongoDB (user profiles, team data, activity logs).</p>
              </li>
              <li>
                <strong>Delete User Data Upon Request:</strong>
                <p className="text-xs pl-4">
                  The "Delete User" feature in the <Link href="/admin/users" className="text-primary hover:underline">User Management</Link> section handles permanent deletion from Firebase Auth and MongoDB. Full GDPR-compliant deletion across all associated content (e.g., anonymizing shared contributions) is a complex process.
                </p>
              </li>
            </ul>
          </Card>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center"><DatabaseBackup className="mr-2 h-5 w-5 text-orange-500"/>Data Backup & Recovery</h2>
           <Card className="p-6 bg-muted/30 border">
            <p className="text-sm text-muted-foreground mb-4">
              Data backup and recovery are critical for platform resilience.
            </p>
            <p className="text-xs text-muted-foreground">
              These are typically managed at the infrastructure level:
              <ul className="list-disc list-inside pl-5 mt-1">
                <li>**Firestore:** Provides automated backups. Point-in-Time Recovery (PITR) can be enabled.</li>
                <li>**MongoDB (Atlas):** Offers continuous cloud backups and PITR.</li>
                <li>**Firebase Storage:** Data is redundantly stored; versioning can be enabled.</li>
              </ul>
              This section would typically display backup status or provide links to manage these settings in their respective cloud consoles.
            </p>
          </Card>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 flex items-center"><KeyRound className="mr-2 h-5 w-5 text-purple-500"/>API Access Key Management</h2>
          <Card className="p-6 bg-muted/30 border">
            <p className="text-sm text-muted-foreground mb-4">
              Manage API keys for external system integrations with CollabDeck. (Future Enhancement)
            </p>
            <p className="text-xs text-muted-foreground">
                This feature would allow trusted external applications to interact with CollabDeck programmatically. It requires a secure system for key generation, permission scoping, and revocation.
            </p>
            <Button variant="outline" className="mt-3" disabled>Manage API Keys (Placeholder)</Button>
          </Card>
        </section>

         <div className="p-4 border-t mt-6 bg-amber-50 border-amber-200 rounded-lg">
            <h3 className="text-md font-semibold mb-2 flex items-center text-amber-700"><AlertTriangle className="mr-2 h-5 w-5"/>Important Note</h3>
            <p className="text-sm text-amber-600">
                Many features on this page are placeholders for future enhancements that require significant backend development and integration with underlying cloud services.
            </p>
        </div>

      </CardContent>
    </Card>
  );
}
