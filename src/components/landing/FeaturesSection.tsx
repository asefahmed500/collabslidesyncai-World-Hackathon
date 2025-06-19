
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Sparkles, MousePointerSquareDashed, ShieldCheck, BarChartBig } from 'lucide-react';

const keyFeatures = [
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: "Real-time Collaboration",
    description: "Work together seamlessly with your team, seeing changes live and commenting instantly.",
  },
  {
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    title: "AI-Powered Assistance",
    description: "Leverage AI for smart design suggestions, content generation, and text enhancements.",
  },
  {
    icon: <MousePointerSquareDashed className="h-8 w-8 text-primary" />,
    title: "Intuitive Slide Editor",
    description: "An easy-to-use drag & drop editor that lets you focus on your content, not complex tools.",
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: "Secure Sharing",
    description: "Control who sees your work with public/private links, password protection, and embed options.",
  },
  {
    icon: <BarChartBig className="h-8 w-8 text-primary" />,
    title: "Insightful Analytics",
    description: "Track presentation views, engagement, and AI usage to optimize your impact.",
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 md:py-24 bg-muted/30">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
            Everything You Need for Impactful Presentations
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-md text-foreground/70">
            From real-time teamwork to AI-driven enhancements, CollabDeck is built for modern presentation needs.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {keyFeatures.map((feature) => (
            <Card key={feature.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out bg-card flex flex-col">
              <CardHeader className="items-start">
                <div className="p-3 bg-primary/10 rounded-lg mb-3 inline-block">
                  {feature.icon}
                </div>
                <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-foreground/70">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
