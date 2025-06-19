
import { PricingCardClient } from '@/components/landing/PricingCardClient';

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "/ month",
    features: ["Up to 3 presentations", "Basic AI features", "Limited collaboration", "Standard support"],
    cta: "Get Started",
    href: "/signup",
    variant: "outline" as "outline" | "default",
    highlight: false,
  },
  {
    name: "Premium Monthly",
    price: "$12",
    period: "/ month",
    features: ["Unlimited presentations", "Advanced AI features", "Full collaboration tools", "Priority support", "Custom branding options"],
    cta: "Upgrade to Monthly",
    href: "/signup?plan=premium_monthly",
    variant: "default" as "default",
    highlight: true,
  },
  {
    name: "Premium Yearly",
    price: "$120",
    period: "/ year",
    features: ["All Premium Monthly features", "Save 15% with annual billing", "Early access to new features", "Dedicated account manager (future)"],
    cta: "Upgrade to Yearly",
    href: "/signup?plan=premium_yearly",
    variant: "outline" as "outline",
    highlight: false,
  }
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-md text-foreground/70">
            Choose the plan that’s right for you. Upgrade, downgrade, or cancel anytime.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:gap-6 lg:grid-cols-3 items-end max-w-5xl mx-auto">
          {pricingPlans.map((plan) => (
            <PricingCardClient key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
