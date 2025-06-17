import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-8 text-center">
      <header className="mb-12">
        <h1 className="font-headline text-6xl font-bold text-primary mb-4 flex items-center justify-center">
          <Zap className="w-16 h-16 mr-3 text-accent" />
          SlideSync AI
        </h1>
        <p className="text-xl text-foreground/80 max-w-2xl mx-auto">
          Craft stunning presentations collaboratively, supercharged by AI. Real-time editing, intelligent design suggestions, and seamless teamwork.
        </p>
      </header>

      <main className="space-y-8">
        <section className="bg-card p-8 rounded-xl shadow-2xl max-w-md mx-auto">
          <h2 className="font-headline text-3xl font-semibold text-primary mb-6">Get Started</h2>
          <div className="space-y-4">
            <Link href="/dashboard" legacyBehavior passHref>
              <Button size="lg" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
            <Link href="/login" legacyBehavior passHref>
              <Button variant="outline" size="lg" className="w-full">
                Login / Sign Up
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-16 text-foreground/70">
          <p>&copy; {new Date().getFullYear()} SlideSync AI. Revolutionizing presentations.</p>
        </section>
      </main>
    </div>
  );
}
