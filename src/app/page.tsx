
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Users, Edit3, BarChartBig, ShieldCheck, BotMessageSquare } from 'lucide-react';
import Image from 'next/image';

const features = [
  {
    icon: <Users className="h-10 w-10 text-primary" />,
    title: "Real-time Collaboration",
    description: "Work together seamlessly with your team on presentations, seeing changes live.",
    dataAiHint: "team collaboration"
  },
  {
    icon: <BotMessageSquare className="h-10 w-10 text-primary" />,
    title: "AI-Powered Assistance",
    description: "Leverage AI for smart suggestions, content generation, and design enhancements.",
    dataAiHint: "artificial intelligence"
  },
  {
    icon: <Edit3 className="h-10 w-10 text-primary" />,
    title: "Intuitive Editor",
    description: "An easy-to-use editor that lets you focus on your content, not complex tools.",
    dataAiHint: "user interface"
  },
  {
    icon: <BarChartBig className="h-10 w-10 text-primary" />,
    title: "Dynamic Content",
    description: "Easily add text, images, shapes, and AI-generated charts to your slides.",
    dataAiHint: "presentation charts"
  }
];

export default function WelcomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Zap className="h-7 w-7 text-primary" />
            <span className="font-headline text-2xl font-bold text-primary">
              CollabSlideSyncAI
            </span>
          </Link>
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="py-20 md:py-32 bg-gradient-to-br from-background via-secondary/30 to-background">
          <div className="container px-4 md:px-6 text-center">
            <h1 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl lg:text-7xl">
              Craft. Collaborate. Captivate.
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-lg text-foreground/80 md:text-xl">
              CollabSlideSyncAI revolutionizes how you create presentations. Experience the power of real-time collaboration combined with intelligent AI assistance to build stunning slides, faster.
            </p>
            <div className="mt-10 flex justify-center space-x-4">
              <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow">
                <Link href="/signup">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="shadow-lg hover:shadow-xl transition-shadow">
                <Link href="/dashboard">View Dashboard</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Placeholder Image/Graphic Section */}
        <section className="py-12 md:py-20">
            <div className="container px-4 md:px-6">
                <div className="relative aspect-video max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden border">
                    <Image
                        src="https://placehold.co/1200x675.png"
                        alt="CollabSlideSyncAI App Preview"
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="app interface presentation"
                    />
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-muted/40">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
                Why CollabSlideSyncAI?
              </h2>
              <p className="mt-3 max-w-2xl mx-auto text-md text-foreground/70">
                Discover features designed to boost your productivity and creativity.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card key={feature.title} className="shadow-lg hover:shadow-xl transition-shadow text-center">
                  <CardHeader className="items-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-4 inline-block">
                      {feature.icon}
                    </div>
                    <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground/70">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-20 md:py-28">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Ready to Transform Your Presentations?
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-lg text-foreground/80">
              Join CollabSlideSyncAI today and experience the future of collaborative presentation design.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow">
                <Link href="/signup">Sign Up Now</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t bg-muted/50">
        <div className="container px-4 md:px-6 flex flex-col md:flex-row justify-between items-center text-sm text-foreground/60">
          <p>&copy; {new Date().getFullYear()} CollabSlideSyncAI. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link href="#" className="hover:text-primary">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
