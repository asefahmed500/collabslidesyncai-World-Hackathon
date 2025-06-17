
"use client";

import { useState } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Team, TeamMember, TeamRole, User as AppUser } from "@/types";
import { addTeamMemberByEmail, updateTeamMemberRole, removeTeamMember } from '@/app/teams/actions'; // Adjust path
import { Loader2, UserPlus, Edit, Trash2, UserCircle, ShieldQuestion } from 'lucide-react';

const addMemberSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  role: z.custom<TeamRole>((val) => ['admin', 'editor', 'viewer'].includes(val as string), {
    message: "Invalid role selected.",
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
  const [editingMember, setEditingMember] = useState<{ id: string, currentRole: TeamRole } | null>(null);
  const [newRole, setNewRole] = useState<TeamRole | ''>('');
  
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: "", role: "editor" },
  });

  const canManageMembers = team.members[currentUser.id]?.role === 'owner' || team.members[currentUser.id]?.role === 'admin';
  const isCurrentUserOwner = team.members[currentUser.id]?.role === 'owner';

  const handleAddMember = async (data: AddMemberFormValues) => {
    setIsSubmitting(true);
    const result = await addTeamMemberByEmail(team.id, data.email, data.role);
    if (result.success && result.updatedTeamMembers) {
      toast({ title: "Member Added", description: `${data.email} has been added to the team.` });
      onMembersUpdated(result.updatedTeamMembers);
      reset();
      setIsAddMemberDialogOpen(false);
    } else {
      toast({ title: "Failed to Add Member", description: result.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleRoleChange = async (memberId: string) => {
    if (!newRole || !editingMember || newRole === editingMember.currentRole) {
        setEditingMember(null);
        setNewRole('');
        return;
    }
    setIsSubmitting(true);
    const result = await updateTeamMemberRole(team.id, memberId, newRole as TeamRole);
     if (result.success && result.updatedTeamMembers) {
      toast({ title: "Role Updated", description: `Role for member has been updated.` });
      onMembersUpdated(result.updatedTeamMembers);
    } else {
      toast({ title: "Failed to Update Role", description: result.message, variant: "destructive" });
    }
    setEditingMember(null);
    setNewRole('');
    setIsSubmitting(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    setIsSubmitting(true);
    const result = await removeTeamMember(team.id, memberId);
    if (result.success && result.updatedTeamMembers) {
      toast({ title: "Member Removed", description: `Member has been removed from the team.` });
      onMembersUpdated(result.updatedTeamMembers);
    } else {
      toast({ title: "Failed to Remove Member", description: result.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const teamMemberList = Object.entries(team.members).map(([id, member]) => ({ id, ...member }));

  return (
    <div className="space-y-6">
      {canManageMembers && (
        <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="mr-2 h-4 w-4" /> Add Member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Team Member</DialogTitle>
              <DialogDescription>
                Enter the email address of the user you want to add and assign them a role. They must have an existing CollabSlideSyncAI account.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleAddMember)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                <Input id="email" type="email" {...register("email")} className="mt-1"/>
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger id="role" className="mt-1">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                {isCurrentUserOwner && <SelectItem value="admin">Admin</SelectItem>}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.role && <p className="text-xs text-destructive mt-1">{errors.role.message}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddMemberDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add Member"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {canManageMembers && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamMemberList.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.profilePictureUrl || undefined} alt={member.name || 'User'} data-ai-hint="profile avatar small" />
                    <AvatarFallback>{member.name ? member.name.charAt(0).toUpperCase() : <UserCircle size={16}/>}</AvatarFallback>
                  </Avatar>
                  {member.name || 'N/A'} {member.id === currentUser.id && "(You)"}
                </div>
              </TableCell>
              <TableCell>{member.email || 'N/A'}</TableCell>
              <TableCell>
                {editingMember?.id === member.id ? (
                    <div className="flex items-center gap-2">
                        <Select value={newRole || member.role} onValueChange={(value) => setNewRole(value as TeamRole)}>
                            <SelectTrigger className="h-8 w-[120px]">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                {isCurrentUserOwner && member.role !== 'owner' && <SelectItem value="admin">Admin</SelectItem>}
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                {member.role === 'owner' && <SelectItem value="owner" disabled>Owner</SelectItem>}
                            </SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => handleRoleChange(member.id)} disabled={isSubmitting || !newRole || newRole === member.role}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => {setEditingMember(null); setNewRole('');}}>Cancel</Button>
                    </div>
                ) : (
                  <span className="capitalize">{member.role}</span>
                )}
              </TableCell>
              <TableCell>{member.joinedAt ? new Date(member.joinedAt as Date).toLocaleDateString() : 'N/A'}</TableCell>
              {canManageMembers && (
                <TableCell className="text-right">
                  {member.id !== team.ownerId && member.id !== currentUser.id && ( // Cannot edit owner or self here
                    <>
                      {editingMember?.id !== member.id && (
                        <Button variant="ghost" size="icon" onClick={() => { setEditingMember({ id: member.id, currentRole: member.role }); setNewRole(member.role); }} disabled={isSubmitting || (member.role === 'owner' && !isCurrentUserOwner)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)} disabled={isSubmitting || (member.role === 'owner')}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                  {member.id === team.ownerId && <Badge variant="secondary">Owner</Badge>}
                  {member.id === currentUser.id && member.role !== 'owner' && <Badge variant="outline">You</Badge>}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {teamMemberList.length === 0 && <p className="text-center text-muted-foreground py-4">No members in this team yet.</p>}
    </div>
  );
}

