
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, LayoutDashboard, UserCircle, LogOut, Settings, User, Users, ShieldCheck } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/app/(auth)/actions';
import { useToast } from '@/hooks/use-toast';
import { NotificationBell } from '@/components/notifications/NotificationBell'; // Import NotificationBell

export function SiteHeader() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/login');
      router.refresh(); // Ensure full state refresh
    } else {
      toast({ title: 'Logout Failed', description: result.message, variant: 'destructive' });
    }
  };

  if (loading && !currentUser) {
     return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href={currentUser ? "/dashboard" : "/"} className="flex items-center space-x-2">
                    <Zap className="h-7 w-7 text-primary" />
                    <span className="font-headline text-2xl font-bold text-primary hidden sm:inline-block">
                        CollabSlideSyncAI
                    </span>
                </Link>
                <div className="h-9 w-9 bg-muted rounded-full animate-pulse"></div> {/* Placeholder for avatar */}
            </div>
        </header>
     );
  }

  const canManageTeam = currentUser && currentUser.teamId && (currentUser.role === 'owner' || currentUser.role === 'admin');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={currentUser ? "/dashboard" : "/"} className="flex items-center space-x-2">
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-headline text-2xl font-bold text-primary hidden sm:inline-block">
            CollabSlideSyncAI
          </span>
        </Link>

        <nav className="flex items-center space-x-2 sm:space-x-4">
          {currentUser && (
            <>
              <Link href="/dashboard" passHref legacyBehavior>
                  <Button variant="ghost" className="hidden md:inline-flex text-sm">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
              </Link>
              <NotificationBell /> {/* Add NotificationBell here */}
            </>
          )}
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
                <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                {canManageTeam && ( 
                  <DropdownMenuItem onClick={() => router.push(`/dashboard/manage-team`)}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Manage Team</span>
                  </DropdownMenuItem>
                )}
                {currentUser.isAppAdmin && (
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </DropdownMenuItem>
                )}
                 <DropdownMenuItem disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>App Settings (soon)</span>
                </DropdownMenuItem>
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
        </nav>
      </div>
    </header>
  );
}
