
"use client";
import { LandingHeader } from '@/components/landing/LandingHeader'; // Use LandingHeader for public pages
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Zap, Target, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function AboutUsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main className="flex-grow">
        <section className="py-20 md:py-28 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container px-4 md:px-6 text-center">
            <Zap className="mx-auto h-20 w-20 text-primary mb-6" />
            <h1 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl">
              About CollabDeck
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-lg text-foreground/80 md:text-xl">
              Revolutionizing how teams create, collaborate on, and deliver impactful presentations with the power of AI.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl mb-6">Our Mission</h2>
                <p className="text-foreground/70 text-lg mb-4">
                  At CollabDeck, our mission is to empower individuals and teams to communicate their ideas more effectively and efficiently. We believe that presentations are a powerful medium for sharing knowledge, driving decisions, and inspiring action.
                </p>
                <p className="text-foreground/70 text-lg">
                  We're building the next generation of presentation software by seamlessly integrating real-time collaboration with cutting-edge AI assistance, making the creation process faster, smarter, and more enjoyable.
                </p>
              </div>
              <div className="relative aspect-square max-w-md mx-auto rounded-xl shadow-xl overflow-hidden">
                <Image
                  src="https://placehold.co/600x600.png"
                  alt="Team collaborating"
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint="teamwork collaboration"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl">Our Values</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: <Users className="h-10 w-10 text-primary" />, title: "Collaboration First", description: "We champion teamwork and believe the best ideas come from working together." },
                { icon: <Lightbulb className="h-10 w-10 text-primary" />, title: "Innovation Driven", description: "We constantly explore new technologies, especially AI, to enhance user experience." },
                { icon: <Target className="h-10 w-10 text-primary" />, title: "User-Centric Design", description: "Our users are at the heart of every decision we make, ensuring an intuitive and powerful platform." },
              ].map(value => (
                <Card key={value.title} className="text-center p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="p-4 bg-primary/10 rounded-full inline-block mb-4">
                    {value.icon}
                  </div>
                  <CardTitle className="font-headline text-xl mb-2">{value.title}</CardTitle>
                  <CardDescription>{value.description}</CardDescription>
                </Card>
              ))}
            </div>
          </div>
        </section>
        
        <section className="py-16 md:py-24 text-center">
            <div className="container px-4 md:px-6">
                <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl mb-6">Join Our Journey</h2>
                <p className="text-foreground/70 text-lg max-w-2xl mx-auto mb-8">
                    We're always looking for passionate individuals to join our team and help shape the future of presentations.
                </p>
                <Button size="lg" variant="outline" disabled>
                    View Open Positions (Coming Soon)
                </Button>
                 <p className="text-sm text-muted-foreground mt-4">(Placeholder for Careers Section)</p>
            </div>
        </section>

      </main>
      <LandingFooter />
    </div>
  );
}
