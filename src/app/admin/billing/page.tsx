
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, ExternalLink } from "lucide-react";

export default function AdminBillingPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><CreditCard className="mr-2 h-5 w-5" /> Billing Management</CardTitle>
        <CardDescription>
          Oversee subscriptions, plans, and payment processing. (Stripe Integration Required)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-6 border rounded-lg bg-muted/30 text-center">
          <h3 className="text-xl font-semibold mb-2">Stripe Integration Coming Soon</h3>
          <p className="text-muted-foreground mb-4">
            A full billing system powered by Stripe is planned. This section will allow you to manage
            customer subscriptions, view payment history, and configure pricing plans.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            To prepare for Stripe integration, ensure your API keys (Publishable and Secret) are
            configured in your environment variables:
          </p>
          <code className="block bg-background p-2 rounded-md text-sm mb-2">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_pk_live_or_test_key</code>
          <code className="block bg-background p-2 rounded-md text-sm">STRIPE_SECRET_KEY=your_sk_live_or_test_key</code>
           <p className="text-xs text-muted-foreground mt-3">
            (The Stripe SDK has been added to package.json to facilitate future development.)
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">Current Plans (Placeholder)</h4>
            <ul className="list-disc list-inside text-muted-foreground mt-2">
              <li>Free Tier - Limited features</li>
              <li>Pro Tier - $10/month - Advanced features</li>
              <li>Enterprise Tier - Custom pricing</li>
            </ul>
          </div>
          <Button disabled className="w-full sm:w-auto">
            Configure Plans in Stripe <ExternalLink className="ml-2 h-4 w-4"/>
          </Button>
        </div>

        <div>
          <h4 className="font-semibold">Recent Transactions (Placeholder)</h4>
          <p className="text-muted-foreground mt-2 text-sm">
            No transaction data available. This area will display recent payments and refunds once Stripe is integrated.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
