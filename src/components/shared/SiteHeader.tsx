
"use client";

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Zap, LayoutDashboard, UserCircle, LogOut, Settings, User, Users, ShieldCheck, LifeBuoy, Menu, Sparkles, LayoutDashboardIcon, Users2Icon, BellIcon, Library, Brain, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/app/(auth)/actions';
import { useToast } from '@/hooks/use-toast';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
  condition?: (user: User | null) => boolean;
  isDropdown?: boolean;
  dropdownItems?: NavLink[];
}

export function SiteHeader() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/login');
      router.refresh();
    } else {
      toast({ title: 'Logout Failed', description: result.message, variant: 'destructive' });
    }
    setIsMobileMenuOpen(false);
  };

  const canManageTeam = currentUser && currentUser.teamId && (currentUser.role === 'owner' || currentUser.role === 'admin');

  const mainNavLinks: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
    { href: "/templates", label: "Templates", icon: Library },
  ];

  if (canManageTeam) {
    mainNavLinks.push({ href: "/dashboard/manage-team", label: "Team Settings", icon: Users2Icon, condition: (user) => !!(user && user.teamId && (user.role === 'owner' || user.role === 'admin')) });
  }
  
  const aiToolsLinks: NavLink[] = [
    { href: "#ai-design", label: "Design Assist", icon: Sparkles, condition: () => false }, // Example: links to editor section or toasts
    { href: "#ai-content", label: "Content Writer", icon: FileText, condition: () => false },
    { href: "#ai-tips", label: "Smart Tips", icon: Brain, condition: () => false },
  ];

  const userDropdownLinks: NavLink[] = [
    { href: '/dashboard/profile', label: "Profile", icon: UserCircle },
    { href: '/dashboard/profile', label: "Subscription", icon: Settings }, // Points to profile where billing is
    { href: '/dashboard/help', label: "Help Center", icon: LifeBuoy },
  ];
  
  if (currentUser?.isAppAdmin) {
    userDropdownLinks.push({ href: '/admin', label: "Admin Dashboard", icon: ShieldCheck });
  }

  const renderNavLink = (link: NavLink, isMobile: boolean = false) => {
    const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
    if (link.condition && !link.condition(currentUser)) return null;

    if (link.isDropdown) {
      return (
        <DropdownMenu key={link.label}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size={isMobile ? "default" : "sm"} className={cn(isMobile && "w-full justify-start", isActive && "font-semibold text-primary bg-primary/10")}>
              <link.icon className="mr-2 h-4 w-4" /> {link.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={5}>
            {link.dropdownItems?.map(item => (
              <DropdownMenuItem key={item.label} onClick={() => {
                if (item.href.startsWith("#")) {
                  toast({ title: "AI Tool", description: `${item.label} accessed from editor AI Panel.`});
                } else {
                  router.push(item.href);
                }
                setIsMobileMenuOpen(false);
              }}>
                <item.icon className="mr-2 h-4 w-4" /> {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Button
        key={link.href}
        variant={isMobile ? (isActive ? "secondary" : "ghost") : "ghost"}
        size={isMobile ? "default" : "sm"}
        asChild
        className={cn(isMobile && "w-full justify-start", !isMobile && isActive && "font-semibold text-primary bg-primary/10")}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <Link href={link.href}>
          <link.icon className="mr-2 h-4 w-4" /> {link.label}
        </Link>
      </Button>
    );
  };


  if (loading && !currentUser) {
     return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href={currentUser ? "/dashboard" : "/"} className="flex items-center space-x-2">
                    <Zap className="h-7 w-7 text-primary" />
                    <span className="font-headline text-2xl font-bold text-primary hidden sm:inline-block">
                        CollabDeck
                    </span>
                </Link>
                <div className="h-9 w-9 bg-muted rounded-full animate-pulse"></div>
            </div>
        </header>
     );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={currentUser ? "/dashboard" : "/"} className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-headline text-2xl font-bold text-primary hidden sm:inline-block">
            CollabDeck
          </span>
        </Link>

        {/* Desktop Navigation */}
        {currentUser && (
          <nav className="hidden md:flex items-center space-x-1">
            {mainNavLinks.map(link => renderNavLink(link))}
            {renderNavLink({ label: "AI Tools", icon: Sparkles, isDropdown: true, dropdownItems: aiToolsLinks })}
          </nav>
        )}

        <div className="flex items-center space-x-2 sm:space-x-3">
          {currentUser && <NotificationBell />}
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={currentUser.profilePictureUrl || undefined } alt={currentUser.name || 'User'} data-ai-hint="profile avatar"/>
                    <AvatarFallback>{currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4"/>}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {userDropdownLinks.map(link => (
                    <DropdownMenuItem key={link.label} onClick={() => {router.push(link.href); setIsMobileMenuOpen(false);}}>
                      <link.icon className="mr-2 h-4 w-4" />
                      <span>{link.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
             <Link href="/login" passHref legacyBehavior>
                <Button variant="ghost" className="text-sm">Login</Button>
             </Link>
             <Link href="/signup" passHref legacyBehavior>
                <Button className="text-sm">Sign Up</Button>
             </Link>
            </>
          )}
          {/* Mobile Navigation Trigger */}
          {currentUser && (
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
                            <Link href="/dashboard" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
                                <Zap className="h-6 w-6 text-primary" />
                                <span className="font-headline text-xl font-bold text-primary">CollabDeck</span>
                            </Link>
                        </SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="flex-grow">
                      <nav className="flex flex-col space-y-1 p-4">
                          {mainNavLinks.map(link => renderNavLink(link, true))}
                          {renderNavLink({ label: "AI Tools", icon: Sparkles, isDropdown: true, dropdownItems: aiToolsLinks }, true)}
                          <DropdownMenuSeparator className="my-2"/>
                          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Account</p>
                          {userDropdownLinks.map(link => (
                              <Button key={link.href} variant={pathname === link.href ? "secondary" : "ghost"} asChild className="justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                                  <Link href={link.href}>
                                      <link.icon className="mr-2 h-4 w-4"/>{link.label}
                                  </Link>
                              </Button>
                          ))}
                          <Button variant="ghost" onClick={handleSignOut} className="justify-start text-destructive hover:text-destructive focus:text-destructive">
                              <LogOut className="mr-2 h-4 w-4" /> Log out
                          </Button>
                      </nav>
                    </ScrollArea>
                    </SheetContent>
                </Sheet>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
