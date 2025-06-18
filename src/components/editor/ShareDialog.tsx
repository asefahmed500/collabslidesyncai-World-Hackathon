
"use client";

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Presentation, PresentationAccessRole, User as AppUser } from "@/types";
import { updatePresentationShareSettingsAction } from '@/app/editor/actions';
import { Globe, Lock, Link as LinkIcon, UserPlus, Users, Trash2, Edit, Loader2, Copy, FileText, Image as ImageIconSvg, Film } from 'lucide-react'; // Renamed ImageIcon
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface ShareDialogProps {
  presentation: Presentation | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPresentationUpdated: (updatedPresentation: Presentation) => void;
  currentUser: AppUser | null;
}

const formSchema = z.object({
  isPublic: z.boolean(),
  passwordProtected: z.boolean(),
  password: z.string().optional(),
  inviteEmail: z.string().email({ message: "Invalid email." }).optional().or(z.literal('')),
  inviteRole: z.custom<PresentationAccessRole>((val) => ['editor', 'viewer'].includes(val as string)).optional(),
});
type FormSchemaType = z.infer<typeof formSchema>;


function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
    </Button>
  );
}

export function ShareDialog({ presentation, isOpen, onOpenChange, onPresentationUpdated, currentUser }: ShareDialogProps) {
  const { toast } = useToast();
  
  const [initialState, formAction] = useFormState(updatePresentationShareSettingsAction, {
    success: false,
    message: "",
    updatedPresentation: null,
  });

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isPublic: presentation?.settings.isPublic || false,
      passwordProtected: presentation?.settings.passwordProtected || false,
      password: '', // Don't prefill password for security
      inviteEmail: '',
      inviteRole: 'viewer',
    },
  });

  useEffect(() => {
    if (presentation) {
      form.reset({
        isPublic: presentation.settings.isPublic,
        passwordProtected: presentation.settings.passwordProtected,
        password: '',
        inviteEmail: '',
        inviteRole: 'viewer',
      });
    }
  }, [presentation, form]);
  
  useEffect(() => {
    if (initialState?.message) {
      if (initialState.success && initialState.updatedPresentation) {
        toast({ title: "Settings Updated", description: initialState.message });
        onPresentationUpdated(initialState.updatedPresentation as Presentation);
        // onOpenChange(false); // Optionally close dialog on success
      } else if (!initialState.success) {
        toast({ title: "Update Failed", description: initialState.message, variant: "destructive" });
      }
    }
  }, [initialState, toast, onPresentationUpdated, onOpenChange]);

  if (!presentation || !currentUser) return null;

  const presentationLink = `${window.location.origin}/editor/${presentation.id}`; 
  const embedLink = `${window.location.origin}/editor/${presentation.id}?embed=true`;


  const handleCopyToClipboard = (link: string, message: string = "Link copied to clipboard.") => {
    navigator.clipboard.writeText(link)
      .then(() => toast({ title: "Copied!", description: message }))
      .catch(err => toast({ title: "Copy Failed", description: "Could not copy link.", variant: "destructive" }));
  };
  
  const isCurrentUserOwner = presentation.creatorId === currentUser.id || (presentation.access && presentation.access[currentUser.id] === 'owner');


  const collaborators = presentation.access ? Object.entries(presentation.access)
    .map(([userId, role]) => ({ userId, role, 
        name: presentation.activeCollaborators?.[userId]?.name || userId.substring(0,8), 
        email: presentation.activeCollaborators?.[userId]?.email || 'Email not available',
        profilePictureUrl: presentation.activeCollaborators?.[userId]?.profilePictureUrl
    })) : [];


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">Share "{presentation.title}"</DialogTitle>
          <DialogDescription>
            Manage access, sharing, export and embed options for this presentation.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-2 -mr-2"> 
        <form action={formAction} className="space-y-6 py-4">
            <input type="hidden" name="presentationId" value={presentation.id} />
            
            {/* Link Sharing Section */}
            <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-muted/30">
                <h3 className="text-lg font-semibold flex items-center"><LinkIcon className="mr-2 h-5 w-5 text-primary"/> Link Sharing</h3>
                <FormField
                    control={form.control}
                    name="isPublic"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label htmlFor="isPublicSwitch" className="text-base flex items-center"><Globe className="mr-2 h-4 w-4"/> Public Access</Label>
                            <p className="text-xs text-muted-foreground">Anyone with the link can view this presentation.</p>
                        </div>
                        <Switch id="isPublicSwitch" checked={field.value} onCheckedChange={field.onChange} name={field.name} disabled={!isCurrentUserOwner}/>
                        </FormItem>
                    )}
                />

                {form.watch('isPublic') && (
                    <FormField
                        control={form.control}
                        name="passwordProtected"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-3 shadow-sm ml-4">
                            <div className="space-y-0.5">
                            <Label htmlFor="passwordProtectedSwitch" className="text-base flex items-center"><Lock className="mr-2 h-4 w-4"/> Password Protect</Label>
                            <p className="text-xs text-muted-foreground">Require a password to view this public presentation.</p>
                            </div>
                            <Switch id="passwordProtectedSwitch" checked={field.value} onCheckedChange={field.onChange} name={field.name} disabled={!isCurrentUserOwner}/>
                        </FormItem>
                        )}
                    />
                )}
                {form.watch('isPublic') && form.watch('passwordProtected') && (
                    <div className="ml-8 space-y-1">
                    <Label htmlFor="password">Set Password</Label>
                    <Input id="password" name="password" type="password" placeholder="Enter a strong password" disabled={!isCurrentUserOwner} />
                    {presentation.settings.password && <p className="text-xs text-muted-foreground">A password is currently set. Enter a new one to change it, or uncheck "Password Protect" to remove it.</p>}
                    </div>
                )}
                <div className="p-2 bg-background rounded-md border">
                    <Label>Shareable Link</Label>
                    <div className="flex items-center gap-2 mt-1">
                        <Input type="text" readOnly value={presentationLink} className="text-sm bg-muted"/>
                        <Button type="button" variant="outline" size="icon" onClick={() => handleCopyToClipboard(presentationLink)} title="Copy link">
                            <Copy className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
            </div>
            
            <Separator />

            {/* Manage Collaborators Section */}
            <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-muted/30">
                 <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/> Manage Collaborators</h3>
                {isCurrentUserOwner && (
                    <div className="space-y-3 p-3 bg-background rounded-md border">
                        <h4 className="font-medium flex items-center"><UserPlus className="mr-2 h-4 w-4"/> Invite New Collaborator</h4>
                        <div className="flex items-end gap-2">
                            <div className="flex-grow">
                                <Label htmlFor="inviteEmail">Email Address</Label>
                                <Input id="inviteEmail" name="inviteEmail" type="email" placeholder="user@example.com" {...form.register("inviteEmail")} />
                                {form.formState.errors.inviteEmail && <p className="text-xs text-destructive mt-1">{form.formState.errors.inviteEmail.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="inviteRole">Role</Label>
                                 <Controller
                                    name="inviteRole"
                                    control={form.control}
                                    defaultValue="viewer"
                                    render={({ field }) => (
                                        <Select name={field.name} onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger id="inviteRole" className="w-[120px]">
                                                <SelectValue placeholder="Role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="viewer">Viewer</SelectItem>
                                                <SelectItem value="editor">Editor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                )}
                
                <h4 className="font-medium mt-4 pt-3 border-t">Current Collaborators ({collaborators.length})</h4>
                {collaborators.length === 0 && <p className="text-sm text-muted-foreground">No collaborators yet besides the owner.</p>}
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {collaborators.map(collab => (
                    <li key={collab.userId} className="flex items-center justify-between p-2.5 rounded-md border bg-background shadow-sm">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                                <AvatarImage src={collab.profilePictureUrl || undefined} alt={collab.name || 'User'} data-ai-hint="profile avatar small"/>
                                <AvatarFallback>{collab.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium leading-tight">{collab.name} {collab.userId === currentUser.id && "(You)"}</p>
                                <p className="text-xs text-muted-foreground">{collab.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                        {collab.userId !== presentation.creatorId && isCurrentUserOwner ? (
                            <>
                                <Select 
                                    name={`accessRole[${collab.userId}]`}
                                    defaultValue={collab.role}
                                    disabled={!isCurrentUserOwner}
                                >
                                    <SelectTrigger className="h-8 text-xs w-[100px]">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                        <SelectItem value="editor">Editor</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button type="submit" name={`accessRole[${collab.userId}]`} value="remove" variant="ghost" size="icon" title="Remove collaborator" disabled={!isCurrentUserOwner}>
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                            </>
                        ) : (
                            <span className="text-xs capitalize bg-primary/10 text-primary px-2 py-1 rounded-full">{collab.role}</span>
                        )}
                        </div>
                    </li>
                    ))}
                </ul>
            </div>

            <Separator />

            {/* Export Section */}
            <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-muted/30">
                <h3 className="text-lg font-semibold flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/> Export Presentation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button type="button" variant="outline" disabled>
                        <FileText className="mr-2 h-4 w-4" /> Export as PDF (Soon)
                    </Button>
                    <Button type="button" variant="outline" disabled>
                        <Film className="mr-2 h-4 w-4" /> Export as PPT (Soon)
                    </Button>
                    <Button type="button" variant="outline" disabled>
                        <ImageIconSvg className="mr-2 h-4 w-4" /> Export Images (Soon)
                    </Button>
                </div>
            </div>
            
            <Separator />

            {/* Embed Section */}
            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-muted/30">
                <h3 className="text-lg font-semibold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                    Embed Presentation
                </h3>
                 <p className="text-xs text-muted-foreground">Copy and paste this code to embed the presentation on your website (view-only).</p>
                <div className="p-2 bg-background rounded-md border">
                    <Input 
                        type="text" 
                        readOnly 
                        value={`<iframe src="${embedLink}" width="800" height="600" frameborder="0" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>`}
                        className="text-xs bg-muted font-mono h-auto py-1.5"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => handleCopyToClipboard(`<iframe src="${embedLink}" width="800" height="600" frameborder="0" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>`, "Embed code copied!")} className="mt-1">
                    <Copy className="mr-2 h-4 w-4" /> Copy Embed Code
                </Button>
            </div>


          <DialogFooter className="pt-4 border-t sticky bottom-0 bg-background py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            {isCurrentUserOwner && <SubmitButton />}
          </DialogFooter>
        </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
