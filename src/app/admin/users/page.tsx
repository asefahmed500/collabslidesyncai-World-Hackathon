
"use client";

import { useEffect, useState, useCallback } from 'react';
import type { User } from '@/types';
import { getAllUsersFromMongoDB } from '@/lib/mongoUserService'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, UserCircle, Edit, Trash2, ShieldCheck, ShieldOff, RefreshCcw, EyeOff, Eye, Search, MoreVertical, Briefcase } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';

export default function AdminUsersPage() {
  const [users, setUsers = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers = useState<User[]>([]);
  const [isLoading, setIsLoading = useState(true);
  const [searchTerm, setSearchTerm = useState('');
  const [userToModify, setUserToModify = useState<User | null>(null);
  const [actionType, setActionType = useState<'delete' | 'toggleAdmin' | 'toggleStatus' | 'resetPassword' | null>(null);
  const [isSubmitting, setIsSubmitting = useState(false);

  const { toast } = useToast();
  const { currentUser } = useAuth();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await getAllUsersFromMongoDB();
      setUsers(fetchedUsers);
      setFilteredUsers(fetchedUsers); // Initialize filtered list
    } catch (error) {
      console.error("Error fetching users from MongoDB:", error);
      toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    setFilteredUsers(
      users.filter(user =>
        (user.name?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (user.email?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (user.id?.toLowerCase() || '').includes(lowerSearchTerm) ||
        (user.teamId?.toLowerCase() || '').includes(lowerSearchTerm)
      )
    );
  }, [searchTerm, users]);

  const handleUserAction = async () => {
    if (!userToModify || !actionType || !currentUser) return;
    setIsSubmitting(true);
    let success = false;
    let message = "";

    try {
      let response;
      let payload: any = { actorUserId: currentUser.id };

      switch (actionType) {
        case 'toggleAdmin':
          payload.isAppAdmin = !userToModify.isAppAdmin;
          response = await fetch(`/api/admin/users/${userToModify.id}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          break;
        case 'toggleStatus':
          payload.disabled = !(userToModify.disabled || false);
          response = await fetch(`/api/admin/users/${userToModify.id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          break;
        case 'resetPassword':
          response = await fetch(`/api/admin/users/${userToModify.id}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload), // actorUserId is needed
          });
          break;
        case 'delete':
          response = await fetch(`/api/admin/users/${userToModify.id}?actorUserId=${currentUser.id}`, {
            method: 'DELETE',
          });
          break;
        default:
          setIsSubmitting(false);
          return;
      }

      const result = await response.json();
      success = result.success;
      message = result.message;

      if (success) {
        toast({ title: "Action Successful", description: message });
        fetchUsers(); // Re-fetch users to update the list
      } else {
        toast({ title: "Action Failed", description: message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setUserToModify(null);
      setActionType(null);
    }
  };
  
  const getDialogContent = () => {
    if (!userToModify || !actionType) return { title: "", description: "" };
    const userName = userToModify.name || userToModify.email || userToModify.id;
    switch (actionType) {
      case 'toggleAdmin':
        return {
          title: `${userToModify.isAppAdmin ? 'Demote from' : 'Promote to'} Platform Admin?`,
          description: `Are you sure you want to ${userToModify.isAppAdmin ? 'demote' : 'promote'} ${userName} ${userToModify.isAppAdmin ? 'from' : 'to'} a Platform Admin?`,
        };
      case 'toggleStatus':
        return {
          title: `${userToModify.disabled ? 'Enable' : 'Disable'} User Account?`,
          description: `Are you sure you want to ${userToModify.disabled ? 'enable' : 'disable'} the account for ${userName}? This will affect their ability to log in via Firebase Authentication and their status in the application database.`,
        };
      case 'resetPassword':
        return {
          title: `Reset Password for ${userName}?`,
          description: `This will generate a password reset link for ${userName} that you can provide to them. The user will then be able to set a new password.`,
        };
      case 'delete':
        return {
          title: `Delete User ${userName}?`,
          description: "This action cannot be undone. This will permanently delete the user account from Firebase Authentication and the application database. If the user owns any teams, deletion will be blocked.",
        };
      default: return { title: "", description: "" };
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5"/>All Users ({filteredUsers.length} / {users.length})</CardTitle>
          <CardDescription>Browse and manage all registered users in the system.</CardDescription>
        </div>
        <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search users by name, email, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
        </div>
      </CardHeader>
      <CardContent>
        {filteredUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {searchTerm ? "No users match your search." : "No users found in the system."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Team &amp; Role</TableHead>
                  <TableHead>Platform Admin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.profilePictureUrl || undefined} alt={user.name || 'User'} data-ai-hint="profile avatar small"/>
                          <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : <UserCircle size={18}/>}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium truncate max-w-[150px]" title={user.name || user.id}>{user.name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-[100px]" title={user.id}>{user.id.substring(0,12)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="truncate max-w-[180px]" title={user.email || undefined}>{user.email}</TableCell>
                    <TableCell>
                      {user.teamId ? (
                        <div className="flex flex-col">
                            <Badge variant={user.role === 'owner' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'} className="capitalize text-xs w-fit">
                                {user.role || 'guest'}
                            </Badge>
                            <Link href={`/admin/teams?searchTerm=${user.teamId}`} className="text-xs text-muted-foreground font-mono mt-1 truncate max-w-[100px] hover:underline" title={`Team ID: ${user.teamId}`}>
                                <Briefcase className="inline h-3 w-3 mr-1"/> {user.teamId.substring(0,12)}...
                            </Link>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">No Team</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isAppAdmin ? <Badge variant="destructive" className="text-xs">Platform Admin</Badge> : <Badge variant="outline" className="text-xs">User</Badge>}
                    </TableCell>
                    <TableCell>
                      {user.disabled ? <Badge variant="outline" className="text-xs text-orange-600 border-orange-600/50"><EyeOff className="mr-1 h-3 w-3"/>Disabled</Badge> : <Badge variant="outline" className="text-xs text-green-600 border-green-600/50"><Eye className="mr-1 h-3 w-3"/>Active</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {user.createdAt ? format(new Date(user.createdAt), 'PP') : 'N/A'} <br/>
                      <span className="text-muted-foreground">{user.lastActive ? formatDistanceToNowStrict(new Date(user.lastActive), { addSuffix: true }) : 'Never'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.id !== currentUser?.id ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">User Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setUserToModify(user); setActionType('toggleAdmin'); }}>
                              {user.isAppAdmin ? <ShieldOff className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                              {user.isAppAdmin ? 'Demote from Admin' : 'Promote to Admin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setUserToModify(user); setActionType('toggleStatus'); }}>
                              {user.disabled ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                              {user.disabled ? 'Enable Account' : 'Disable Account'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setUserToModify(user); setActionType('resetPassword'); }}>
                              <RefreshCcw className="mr-2 h-4 w-4" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => { setUserToModify(user); setActionType('delete'); }}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Badge variant="outline" className="text-xs">Current Admin</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {userToModify && actionType && (
        <AlertDialog open={!!userToModify} onOpenChange={(open) => { if (!open) { setUserToModify(null); setActionType(null); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{getDialogContent().title}</AlertDialogTitle>
              <AlertDialogDescription>
                {getDialogContent().description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setUserToModify(null); setActionType(null);}} disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUserAction}
                disabled={isSubmitting}
                className={actionType === 'delete' ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
