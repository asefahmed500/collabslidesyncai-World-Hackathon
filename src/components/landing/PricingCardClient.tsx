
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast'; // Import useToast

// Define the type for a single pricing plan, matching the structure in page.tsx
interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string;
  variant: "outline" | "default";
  highlight: boolean;
}

interface PricingCardClientProps {
  plan: PricingPlan;
}

export function PricingCardClient({ plan }: PricingCardClientProps) {
  const { toast } = useToast(); // Initialize toast

  // The onClick handler that was causing issues in the Server Component
  const handleCtaClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // For "Get Started", we let it navigate normally.
    // For "Upgrade" buttons, we show a toast because Stripe isn't fully integrated.
    if (plan.href.includes("plan=")) { // Check if it's an upgrade button
      e.preventDefault(); // Prevent navigation for upgrade buttons
      toast({
        title: "Stripe Checkout Coming Soon!",
        description: `You would be redirected to Stripe to complete your upgrade to the "${plan.name}" plan. This feature is under development.`,
        duration: 5000,
      });
    }
    // If it's not an upgrade button (e.g., "Get Started" for free plan),
    // the default Link behavior will handle navigation.
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
            plan.highlight ? "bg-primary hover:bg-primary/90" : "bg-accent hover:bg-accent/90 text-accent-foreground"
          )}
          asChild
        >
          <Link href={plan.href} onClick={handleCtaClick}>{plan.cta}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
