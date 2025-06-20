
"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Zap, Menu, Home, Lightbulb, Tag, LayoutDashboard, Info, MessageSquare, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth

const publicNavLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/#features", label: "Features", icon: Lightbulb },
  { href: "/#pricing", label: "Pricing", icon: Tag },
  { href: "/templates", label: "Templates", icon: LayoutDashboard },
  { href: "/about", label: "About Us", icon: Info },
  { href: "/blog", label: "Blog", icon: MessageSquare },
  { href: "/dashboard/help", label: "Support", icon: HelpCircle },
];

export function LandingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { currentUser } = useAuth(); // Get currentUser state

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-headline text-2xl font-bold text-primary">
            CollabDeck
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {publicNavLinks.map((link) => (
            <Button key={link.href} variant="ghost" asChild size="sm"
              className={cn(pathname === link.href && "font-semibold text-primary bg-primary/10")}
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-2">
          {currentUser ? (
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          )}
        </div>

        {/* Mobile Navigation Trigger */}
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0 flex flex-col">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>
                    <Link href="/" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
                        <Zap className="h-6 w-6 text-primary" />
                        <span className="font-headline text-xl font-bold text-primary">CollabDeck</span>
                    </Link>
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-grow">
                <nav className="flex flex-col space-y-2 p-4">
                  {publicNavLinks.map((link) => (
                    <Button
                      key={link.href}
                      variant={pathname === link.href ? "secondary" : "ghost"}
                      asChild
                      className="justify-start"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link href={link.href}>
                        <link.icon className="mr-2 h-4 w-4" />
                        {link.label}
                      </Link>
                    </Button>
                  ))}
                  <hr className="my-3"/>
                  {currentUser ? (
                    <Button variant="default" asChild onClick={() => setIsMobileMenuOpen(false)}>
                      <Link href="/dashboard">Go to Dashboard</Link>
                    </Button>
                  ) : (
                    <Button variant="default" asChild onClick={() => setIsMobileMenuOpen(false)}>
                      <Link href="/signup">Sign Up</Link>
                    </Button>
                  )}
                </nav>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
