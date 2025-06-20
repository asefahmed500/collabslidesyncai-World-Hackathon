
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils"; // Added this import
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string; // This can be the internal plan identifier like "premium_monthly"
  variant: "outline" | "default";
  highlight: boolean;
}

interface PricingCardClientProps {
  plan: PricingPlan;
}

export function PricingCardClient({ plan }: PricingCardClientProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleCtaClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (plan.name.toLowerCase() === "free") {
      router.push(plan.href); // Typically /signup or /dashboard
      return;
    }

    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "Please sign up or log in to upgrade your plan.",
        variant: "info",
      });
      router.push(`/login?redirect=/pricing&plan=${plan.href}`); // Redirect to login, then to pricing, then plan
      return;
    }

    setIsRedirecting(true);
    try {
      const response = await fetch('/api/stripe/checkout-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.href, userId: currentUser.id }), // plan.href now acts as planId
      });
      const sessionData = await response.json();

      if (response.ok && sessionData.success && sessionData.url) {
        router.push(sessionData.url); // Redirect to Stripe Checkout
      } else {
        throw new Error(sessionData.message || "Failed to create Stripe Checkout session.");
      }
    } catch (error: any) {
      toast({
        title: "Upgrade Error",
        description: error.message || "Could not initiate upgrade. Please try again.",
        variant: "destructive",
      });
      setIsRedirecting(false);
    }
  };

  return (
    <Card key={plan.name} className={cn(
      "shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col",
      plan.highlight ? "border-2 border-primary scale-100 md:scale-105 bg-primary/5" : "bg-card"
    )}>
      <CardHeader className="pb-4">
        <CardTitle className={cn(
          "font-headline text-2xl",
          plan.highlight ? "text-primary" : ""
        )}>{plan.name}</CardTitle>
        <CardDescription className="text-sm">{plan.highlight ? "Most Popular" : "Great value"}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
          <span className="ml-1 text-sm text-muted-foreground">{plan.period}</span>
        </div>
        <ul className="space-y-2 text-sm text-foreground/80">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="p-6 pt-4">
        <Button
          size="lg"
          className={cn(
            "w-full transition-transform hover:scale-105",
            plan.highlight && plan.name.toLowerCase() !== "free" ? "bg-primary hover:bg-primary/90" : "bg-accent hover:bg-accent/90 text-accent-foreground"
          )}
          onClick={handleCtaClick}
          disabled={isRedirecting}
        >
          {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : plan.cta}
        </Button>
      </CardFooter>
    </Card>
  );
}
