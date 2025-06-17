
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, LayoutDashboard, UserCircle, LogOut, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth'; // Using real auth
import { signOut } from '@/app/(auth)/actions';
import { useToast } from '@/hooks/use-toast';

export function SiteHeader() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/login'); // Redirect to login page
      router.refresh(); // Force refresh to update auth state across app
    } else {
      toast({ title: 'Logout Failed', description: result.message, variant: 'destructive' });
    }
  };
  
  // To prevent flash of login button before auth state is loaded
  if (loading && !currentUser) {
     return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/dashboard" className="flex items-center space-x-2">
                    <Zap className="h-7 w-7 text-primary" />
                    <span className="font-headline text-2xl font-bold text-primary hidden sm:inline-block">
                        CollabSlideSyncAI
                    </span>
                </Link>
                <div className="h-9 w-9 bg-muted rounded-full animate-pulse"></div> {/* Skeleton for avatar */}
            </div>
        </header>
     );
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={currentUser ? "/dashboard" : "/"} className="flex items-center space-x-2">
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-headline text-2xl font-bold text-primary hidden sm:inline-block">
            CollabSlideSyncAI
          </span>
        </Link>
        
        <nav className="flex items-center space-x-4">
          {currentUser && (
             <Link href="/dashboard" passHref legacyBehavior>
                <Button variant="ghost" className="hidden md:inline-flex">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
            </Link>
          )}
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={currentUser.profilePictureUrl || `https://placehold.co/40x40.png?text=${currentUser.name?.charAt(0).toUpperCase()}`} alt={currentUser.name || 'User'} data-ai-hint="profile avatar" />
                    <AvatarFallback>{currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="h-4 w-4"/>}</AvatarFallback>
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
                <DropdownMenuItem onClick={() => router.push('/profile')}> {/* Placeholder for profile page */}
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                 <DropdownMenuItem disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" passHref legacyBehavior>
              <Button>Login</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
