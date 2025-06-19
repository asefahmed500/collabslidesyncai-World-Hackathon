
"use client";
import { SiteHeader } from '@/components/shared/SiteHeader'; // Assuming you want the authed header if user is logged in
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Zap } from 'lucide-react';
import Link from 'next/link';

export default function TemplatesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Zap className="mx-auto h-16 w-16 text-primary mb-4" />
          <h1 className="font-headline text-4xl font-bold text-primary sm:text-5xl">
            Presentation Templates
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/70">
            Browse our collection of professionally designed templates to kickstart your next presentation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="aspect-[16/9] bg-muted rounded-md mb-3 flex items-center justify-center">
                  <LayoutDashboard className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <CardTitle>Template Title {index + 1}</CardTitle>
                <CardDescription>A short description of what this template is best for.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" disabled>
                  Use Template (Coming Soon)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground">More templates are on the way!</p>
          <Button asChild variant="link" className="mt-2">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t">
        © {new Date().getFullYear()} CollabDeck. Template Library.
      </footer>
    </div>
  );
}
