
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-background via-secondary/10 to-background">
      <div className="container px-4 md:px-6 text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl lg:text-7xl">
          Create Stunning Presentations Collaboratively with AI Power
        </h1>
        <p className="mt-6 max-w-3xl mx-auto text-lg text-foreground/80 md:text-xl">
          CollabDeck empowers your team to design, build, and deliver impactful presentations faster than ever with intelligent AI assistance and seamless real-time collaboration.
        </p>
        <div className="mt-10">
          <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow px-8 py-3 text-lg">
            <Link href="/signup">Get Started Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
        <div className="mt-16 relative aspect-video max-w-5xl mx-auto rounded-xl shadow-2xl overflow-hidden border-2 border-primary/20">
          <Image
            src="https://placehold.co/1280x720.png"
            alt="CollabDeck Application Interface Mockup"
            layout="fill"
            objectFit="cover"
            data-ai-hint="app interface presentation"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
        </div>
      </div>
    </section>
  );
}
