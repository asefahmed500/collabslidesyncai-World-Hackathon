
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Team, TeamMember, TeamRole, User as AppUser } from "@/types";
// Removed direct import of server actions
import { Loader2, UserPlus, Edit, Trash2, UserCircle, ShieldQuestion, Crown, Mail, Save, X } from 'lucide-react';
import { Label } from '../ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';

const addMemberSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  role: z.custom<TeamRole>((val) => ['admin', 'editor', 'viewer'].includes(val as string), {
    message: "Invalid role selected for invitation.",
  }),
});
type AddMemberFormValues = z.infer<typeof addMemberSchema>;

interface TeamMembersManagerProps {
  team: Team;
  currentUser: AppUser;
  onMembersUpdated: (updatedMembers: { [userId: string]: TeamMember }) => void;
}

export function TeamMembersManager({ team, currentUser, onMembersUpdated }: TeamMembersManagerProps) {
  const { toast } = useToast();
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<TeamRole | ''>('');
  const [memberToRemove, setMemberToRemove] = useState<({id: string, name?: string | null}) | null>(null);
  const [transferTarget, setTransferTarget] = useState<({id: string, name?: string | null}) | null>(null); // Transfer ownership stub

  const addMemberForm = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: "", role: "editor" },
  });

  const isCurrentUserOwner = team.members[currentUser.id]?.role === 'owner';
  const isCurrentUserAdmin = team.members[currentUser.id]?.role === 'admin';
  const canManageHigherRoles = isCurrentUserOwner; 
  const canManageMembers = isCurrentUserOwner || isCurrentUserAdmin;

  const onAddMemberSubmit: SubmitHandler<AddMemberFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/teams/${team.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, actorUserId: currentUser.id }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        toast({ title: "Member Action", description: result.message });
        if(result.members) onMembersUpdated(result.members);
        addMemberForm.reset();
        setIsAddMemberDialogOpen(false);
      } else {
        toast({ title: "Failed to Add Member", description: result.message || "An unknown error occurred.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not add member. Please try again.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleInitiateRoleChange = (memberId: string, currentRole: TeamRole) => {
    setEditingMemberId(memberId);
    setSelectedNewRole(currentRole);
  };

  const handleSaveRoleChange = async () => {
    if (!editingMemberId || !selectedNewRole || selectedNewRole === team.members[editingMemberId]?.role) {
      setEditingMemberId(null);
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/teams/${team.id}/members/${editingMemberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole: selectedNewRole, actorUserId: currentUser.id }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast({ title: "Role Updated", description: result.message });
        if(result.members) onMembersUpdated(result.members);
      } else {
        toast({ title: "Failed to Update Role", description: result.message || "An unknown error occurred.", variant: "destructive" });
      }
    } catch (error) {
       toast({ title: "Error", description: "Could not update role. Please try again.", variant: "destructive" });
    }
    setEditingMemberId(null);
    setSelectedNewRole('');
    setIsSubmitting(false);
  };
  
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/teams/${team.id}/members/${memberToRemove.id}?actorUserId=${currentUser.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast({ title: "Member Removed", description: result.message });
         if(result.members) onMembersUpdated(result.members);
      } else {
        toast({ title: "Failed to Remove Member", description: result.message || "An unknown error occurred.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not remove member. Please try again.", variant: "destructive" });
    }
    setMemberToRemove(null);
    setIsSubmitting(false);
  };

  const handleConfirmTransferOwnership = async () => { // Stub for now
    if (!transferTarget) return;
    setIsSubmitting(true);
    // const result = await transferTeamOwnershipAction(team.id, transferTarget.id); // This was a server action
    // For API route:
    // const response = await fetch(`/api/teams/${team.id}/transfer-ownership`, { method: 'POST', body: JSON.stringify({ newOwnerId: transferTarget.id, actorUserId: currentUser.id }) });
    // const result = await response.json();
    toast({ title: "Feature Incomplete", description: "Team ownership transfer via API route is not fully implemented yet.", variant: "info" });
    // if (result.success && result.updatedTeam) { onMembersUpdated(result.updatedTeam.members); }
    setTransferTarget(null);
    setIsSubmitting(false);
  }

  const teamMemberList = Object.entries(team.members).map(([id, memberData]) => ({
    id,
    ...memberData,
  })).sort((a,b) => { 
      if (a.role === 'owner') return -1; if (b.role === 'owner') return 1;
      if (a.role === 'admin' && b.role !== 'admin') return -1; if (b.role === 'admin' && a.role !== 'admin') return 1;
      return (a.name || a.email || '').localeCompare(b.name || b.email || '');
  });

  return (
    <div className="space-y-6">
      {canManageMembers && (
        <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="mr-2 h-4 w-4" /> Add New Member</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Team Member</DialogTitle>
              <DialogDescription>
                Enter the email address of the user to invite. They must have an existing CollabSlideSyncAI account.
              </DialogDescription>
            </DialogHeader>
            <Form {...addMemberForm}>
                <form onSubmit={addMemberForm.handleSubmit(onAddMemberSubmit)} className="space-y-4 py-2">
                <FormField
                    control={addMemberForm.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <Label htmlFor="add-member-email">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <FormControl>
                                <Input id="add-member-email" type="email" placeholder="user@example.com" {...field} className="pl-10"/>
                            </FormControl>
                        </div>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={addMemberForm.control}
                    name="role"
                    render={({ field }) => (
                    <FormItem>
                        <Label htmlFor="add-member-role">Assign Role</Label>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger id="add-member-role" className="mt-1">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                {canManageHigherRoles && <SelectItem value="admin">Admin</SelectItem>}
                            </SelectContent>
                        </Select>
                         <FormMessage />
                    </FormItem>
                    )}
                />
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => {setIsAddMemberDialogOpen(false); addMemberForm.reset();}} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add Member"}
                    </Button>
                </DialogFooter>
                </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead className="w-[40%]">Member</TableHead>
                <TableHead className="w-[25%]">Role</TableHead>
                <TableHead className="hidden sm:table-cell w-[20%]">Joined</TableHead>
                {(canManageMembers || isCurrentUserOwner) && <TableHead className="text-right w-[15%] min-w-[120px]">Actions</TableHead>}
            </TableRow>
            </TableHeader>
            <TableBody>
            {teamMemberList.map((member) => (
                <TableRow key={member.id}>
                <TableCell>
                    <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={member.profilePictureUrl || undefined} alt={member.name || 'User'} data-ai-hint="profile avatar small"/>
                        <AvatarFallback>{member.name ? member.name.charAt(0).toUpperCase() : <UserCircle size={18}/>}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium truncate max-w-[120px] sm:max-w-xs">{member.name || 'N/A'} {member.id === currentUser.id && <span className="text-xs text-muted-foreground">(You)</span>}</p>
                        <p className="text-xs text-muted-foreground truncate  max-w-[120px] sm:max-w-xs">{member.email || 'N/A'}</p>
                    </div>
                    </div>
                </TableCell>
                <TableCell>
                    {editingMemberId === member.id ? (
                         <Select value={selectedNewRole} onValueChange={(value) => setSelectedNewRole(value as TeamRole)}>
                            <SelectTrigger className="h-9 text-xs w-full max-w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                {canManageHigherRoles && <SelectItem value="admin">Admin</SelectItem>}
                                {member.role === 'owner' && <SelectItem value="owner" disabled>Owner</SelectItem>}
                            </SelectContent>
                        </Select>
                    ) : (
                    <Badge variant={member.role === 'owner' ? 'default' : member.role === 'admin' ? 'secondary' : 'outline'} className="capitalize">
                        {member.role === 'owner' && <Crown className="mr-1 h-3 w-3"/>}
                        {member.role}
                    </Badge>
                    )}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}
                </TableCell>
                {(canManageMembers || isCurrentUserOwner) && (
                    <TableCell className="text-right space-x-1">
                    {editingMemberId === member.id ? (
                        <>
                            <Button size="icon" variant="ghost" onClick={handleSaveRoleChange} disabled={isSubmitting || selectedNewRole === member.role} title="Save role change"><Save className="h-4 w-4"/></Button>
                            <Button size="icon" variant="ghost" onClick={() => {setEditingMemberId(null); setSelectedNewRole('');}} title="Cancel edit"><X className="h-4 w-4"/></Button>
                        </>
                    ) : (
                        <>
                        {member.id !== currentUser.id && member.role !== 'owner' && (isCurrentUserOwner || (isCurrentUserAdmin && member.role !== 'admin')) && (
                            <>
                            <Button variant="ghost" size="icon" onClick={() => handleInitiateRoleChange(member.id, member.role)} disabled={isSubmitting} title="Edit role">
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setMemberToRemove({id: member.id, name: member.name})} disabled={isSubmitting} title="Remove member">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            </>
                        )}
                        {isCurrentUserOwner && member.role !== 'owner' && (
                            <Button variant="ghost" size="icon" onClick={() => setTransferTarget({id: member.id, name: member.name})} disabled={isSubmitting} title="Transfer Ownership (Stub)">
                                <Crown className="h-4 w-4 text-amber-500" />
                            </Button>
                        )}
                        </>
                    )}
                    </TableCell>
                )}
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </div>
      {teamMemberList.length === 0 && <p className="text-center text-muted-foreground py-4">No members in this team yet.</p>}

      {memberToRemove && (
        <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Remove {memberToRemove.name || 'Member'}?</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to remove {memberToRemove.name || 'this member'} from the team? This action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setMemberToRemove(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmRemoveMember} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Remove Member"}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
      {transferTarget && (
         <AlertDialog open={!!transferTarget} onOpenChange={(open) => !open && setTransferTarget(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Transfer Ownership to {transferTarget.name || 'this member'}?</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to transfer team ownership to {transferTarget.name || transferTarget.id}? 
                    This action is irreversible and you will become an admin. 
                    (Note: This feature's backend logic is complex and currently a placeholder.)
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTransferTarget(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmTransferOwnership} className="bg-amber-500 hover:bg-amber-600 text-white" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Confirm Transfer (Stub)"}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
    