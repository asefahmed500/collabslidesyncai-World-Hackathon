
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Presentation as PresentationIcon } from 'lucide-react'; // Changed Slideshow to Presentation

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
        <div className="mt-16 relative flex items-center justify-center aspect-video max-w-3xl mx-auto rounded-xl overflow-hidden">
          {/* Replaced placeholder image with a large Presentation icon */}
          <PresentationIcon className="h-48 w-48 sm:h-64 sm:w-64 md:h-80 md:w-80 text-primary opacity-20" strokeWidth={1.5} />
          <div className="absolute inset-0 bg-gradient-to-t from-background/5 via-transparent to-transparent pointer-events-none"></div>
        </div>
      </div>
    </section>
  );
}
