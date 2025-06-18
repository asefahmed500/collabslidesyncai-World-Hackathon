
"use client";

import { useEffect, useState } from 'react';
import type { User } from '@/types';
import { getAllUsersFromMongoDB } from '@/lib/mongoUserService'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, UserCircle, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    getAllUsersFromMongoDB()
      .then(setUsers)
      .catch(error => {
        console.error("Error fetching users from MongoDB:", error);
        toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Users ({users.length})</CardTitle>
        <CardDescription>Browse and manage all registered users in the system (from MongoDB).</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-muted-foreground text-center">No users found in MongoDB.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Team Role</TableHead>
                <TableHead>Team ID</TableHead>
                <TableHead>App Admin</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profilePictureUrl || undefined} alt={user.name || 'User'} data-ai-hint="profile avatar small" />
                        <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : <UserCircle size={16}/>}</AvatarFallback>
                      </Avatar>
                      {user.name || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'owner' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'} className="capitalize">
                      {user.role || 'guest'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{user.teamId || 'N/A'}</TableCell>
                  <TableCell>
                    {user.isAppAdmin ? <Badge variant="destructive">Yes</Badge> : <Badge variant="outline">No</Badge>}
                  </TableCell>
                  <TableCell>
                    {user.createdAt ? format(new Date(user.createdAt), 'PP') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" disabled title="Edit User (Placeholder)">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled title="Delete User (Placeholder)">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

    