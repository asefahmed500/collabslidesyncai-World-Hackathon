
"use client";
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Rss, CalendarDays, UserCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const blogPosts = [
  {
    id: 1,
    title: "The Future of Presentations: AI and Collaboration",
    date: "October 26, 2023",
    author: "Jane Doe",
    excerpt: "Discover how artificial intelligence and real-time collaboration are reshaping the way we create and deliver presentations...",
    imageUrl: "https://placehold.co/600x400.png",
    aiHint: "technology abstract"
  },
  {
    id: 2,
    title: "5 Tips for Designing Engaging Slides",
    date: "October 15, 2023",
    author: "John Smith",
    excerpt: "Learn five key principles to make your presentation slides more visually appealing and effective in conveying your message.",
    imageUrl: "https://placehold.co/600x400.png",
    aiHint: "design process"
  },
  {
    id: 3,
    title: "Maximizing Team Productivity with CollabDeck",
    date: "September 28, 2023",
    author: "Alice Brown",
    excerpt: "A deep dive into CollabDeck's collaborative features and how they can streamline your team's workflow for presentations.",
    imageUrl: "https://placehold.co/600x400.png",
    aiHint: "team meeting"
  },
];

export default function BlogPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main className="flex-grow">
        <section className="py-20 md:py-28 bg-gradient-to-br from-secondary/10 via-background to-primary/10">
          <div className="container px-4 md:px-6 text-center">
            <Rss className="mx-auto h-20 w-20 text-primary mb-6" />
            <h1 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl">
              CollabDeck Blog
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-lg text-foreground/80 md:text-xl">
              Insights, tips, and updates on presentations, collaboration, AI, and the CollabDeck platform.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <Card key={post.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                  <div className="aspect-[16/10] relative">
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint={post.aiHint}
                    />
                  </div>
                  <CardHeader className="flex-grow">
                    <CardTitle className="font-headline text-xl leading-tight hover:text-primary transition-colors">
                      <Link href="#">{post.title} (Placeholder)</Link>
                    </CardTitle>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-2">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{post.date}</span>
                      <span className="px-1">|</span>
                      <UserCircle className="h-3.5 w-3.5" />
                      <span>By {post.author}</span>
                    </div>
                    <CardDescription className="mt-2 text-sm line-clamp-3">{post.excerpt}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="link" asChild className="p-0 h-auto text-primary">
                       <Link href="#">Read More (Placeholder) &rarr;</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-16 text-center">
              <Button variant="outline" size="lg" disabled>
                Load More Posts (Coming Soon)
              </Button>
            </div>
          </div>
        </section>
        
         <section className="py-16 md:py-24 bg-muted/30 text-center">
            <div className="container px-4 md:px-6">
                <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl mb-6">Stay Updated</h2>
                <p className="text-foreground/70 text-lg max-w-xl mx-auto mb-8">
                    Subscribe to our newsletter to get the latest articles, tips, and CollabDeck news delivered to your inbox.
                </p>
                <form className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                    <Input type="email" placeholder="Enter your email" className="flex-grow text-base" disabled />
                    <Button type="submit" size="lg" disabled>Subscribe (Placeholder)</Button>
                </form>
            </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
