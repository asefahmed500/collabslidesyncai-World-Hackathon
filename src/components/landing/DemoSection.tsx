
import Image from 'next/image';
import { PlayCircle } from 'lucide-react';

export function DemoSection() {
  return (
    <section id="demo" className="py-16 md:py-24 bg-muted/30">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
            See CollabDeck in Action
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-md text-foreground/70">
            Watch a quick overview of our editor, collaboration tools, and AI features. (Demo video placeholder)
          </p>
        </div>
        <div className="relative aspect-video max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden border-2 border-primary/20 group">
          <Image
            src="https://placehold.co/1200x675.png"
            alt="CollabDeck Product Demo Video Thumbnail"
            layout="fill"
            objectFit="cover"
            data-ai-hint="product demo video"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <PlayCircle className="h-20 w-20 text-white/80 group-hover:text-white" />
          </div>
        </div>
      </div>
    </section>
  );
}
