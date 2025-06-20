
"use client";

import { useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import PptxGenJS from "pptxgenjs";
import { useRouter } from 'next/navigation';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Presentation, PresentationAccessRole, User as AppUser, SlideElement, Slide as SlideType } from "@/types";
import { updatePresentationShareSettingsAction } from '@/app/editor/actions';
import { Globe, Lock, Link as LinkIcon, UserPlus, Users, Trash2, Edit, Loader2, Copy, FileText as FileTextIcon, Image as ImageIconSvg, Film } from 'lucide-react';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


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
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  
  const [initialState, formAction] = useActionState(updatePresentationShareSettingsAction, {
    success: false,
    message: "",
    updatedPresentation: null,
  });

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isPublic: presentation?.settings.isPublic || false,
      passwordProtected: presentation?.settings.passwordProtected || false,
      password: '', 
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
      } else if (!initialState.success) {
        toast({ title: "Update Failed", description: initialState.message, variant: "destructive" });
      }
    }
  }, [initialState, toast, onPresentationUpdated]);

  if (!presentation || !currentUser) return null;

  const presentationLink = `${window.location.origin}/present/${presentation.id}`; 
  const embedLink = `${window.location.origin}/present/${presentation.id}?embed=true`;


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

  const handleExportPDF = () => {
    if (!presentation) return;
    setIsExporting(true);
    toast({ title: "Preparing PDF Export...", description: "Your browser's print dialog will open. Please select 'Save as PDF'." });
    const printWindow = window.open(`/present/${presentation.id}?print=true`, '_blank');
    if (printWindow) {
        const timer = setInterval(() => { // Check if window is closed by user manually
            if (printWindow.closed) {
                clearInterval(timer);
                setIsExporting(false);
            }
        }, 500);
        printWindow.onload = () => {
            setTimeout(() => { 
                printWindow.print();
                // Note: We can't reliably know when the print dialog closes.
                // So, setIsExporting(false) might happen prematurely if we put it here.
                // User will close the print window manually.
                // For simplicity, let's assume it's quick or handle timeout.
                 setTimeout(() => setIsExporting(false), 3000); // Reset after a delay
            }, 1000); 
        };
    } else {
        toast({ title: "Popup Blocked?", description: "Please allow popups for this site to export as PDF.", variant: "destructive"});
        setIsExporting(false);
    }
  };

  const handleExportPPT = async () => {
    if (!presentation) return;
    setIsExporting(true);
    toast({ title: "Generating PPTX...", description: "This might take a moment for larger presentations." });

    try {
        const pptx = new PptxGenJS();
        pptx.layout = "LAYOUT_16X9";
        pptx.author = currentUser?.name || "CollabDeck User";
        pptx.company = "CollabDeck";
        pptx.title = presentation.title;

        const CANVAS_BASE_WIDTH = 960; // Your editor's canvas base width
        const CANVAS_BASE_HEIGHT = 540; // Your editor's canvas base height

        for (const slideData of presentation.slides) {
            const slide = pptx.addSlide();
            
            // Background
            if (slideData.backgroundGradient) {
                // Basic gradient support - PptxGenJS gradient support is limited
                 slide.background = { color: slideData.backgroundGradient.startColor.replace('#', '') }; // Use start color as fallback
                 console.warn("PPTX Export: Full gradient background export is complex and not fully supported. Using start color as solid background.");
            } else if (slideData.backgroundImageUrl) {
                // PptxGenJS addImage for background is tricky, often better to add as full-slide image
                // For simplicity, we might just set a fallback color or leave default
                slide.background = { color: "FFFFFF" }; // Default white
                // Or attempt to add image as a full-slide element if needed (complex positioning)
                 console.warn("PPTX Export: Background image export to PPTX is not implemented. Slide will have default background.");
            } else {
                slide.background = { color: slideData.backgroundColor?.replace('#', '') || "FFFFFF" };
            }


            for (const element of slideData.elements) {
                const elX = (element.position.x / CANVAS_BASE_WIDTH) * 100; 
                const elY = (element.position.y / CANVAS_BASE_HEIGHT) * 100; 
                const elW = (element.size.width / CANVAS_BASE_WIDTH) * 100;
                const elH = (element.size.height / CANVAS_BASE_HEIGHT) * 100;

                const options: any = {
                    x: `${elX}%`, y: `${elY}%`, w: `${elW}%`, h: `${elH}%`,
                    rotate: element.rotation || 0,
                };

                if (element.type === 'text') {
                    options.color = element.style.color?.replace('#', '') || '000000';
                    options.fontFace = element.style.fontFamily || 'Arial';
                    
                    let fontSize = parseFloat(element.style.fontSize || '18');
                    // PPTX font sizes are in points. Rough conversion: 1px approx 0.75pt.
                    // However, direct use of pixel value often works okay if scaling is relative.
                    // For better accuracy, use a mapping or a fixed scale factor.
                    // Let's try a simple pixel-to-point assumption for now, may need adjustment.
                    options.fontSize = Math.max(8, fontSize * 0.75); // Ensure min font size
                    
                    options.align = element.style.textAlign || 'left';
                    options.bold = element.style.fontWeight === 'bold';
                    options.italic = element.style.fontStyle === 'italic';
                    options.underline = element.style.textDecoration === 'underline';
                    
                    // Transparency for text is not directly supported in pptxgenjs text objects.
                    // It would require exporting text as an image or using more complex methods.
                    // options.transparency = Math.round((1 - (element.style.opacity ?? 1)) * 100);
                    
                    slide.addText((element.content as string) || "", options);

                } else if (element.type === 'image' && typeof element.content === 'string') {
                    try {
                        // For data URIs (like AI generated icons), ensure correct handling
                        if (element.content.startsWith('data:image')) {
                             slide.addImage({ ...options, data: element.content });
                        } else {
                             slide.addImage({ ...options, path: element.content });
                        }
                    } catch (imgError) {
                        console.error("Error adding image to PPTX:", element.content, imgError);
                        // Add a placeholder if image fails
                        slide.addText("[Image Error]", { ...options, color: "FF0000", fontSize: 10 });
                    }
                } else if (element.type === 'shape') {
                    const shapeFillColor = element.style.backgroundColor?.replace('#', '') || 'CCCCCC';
                    const shapeOptions: any = {
                        ...options,
                        fill: { color: shapeFillColor },
                    };
                    if (element.style.borderWidth && element.style.borderColor) {
                        shapeOptions.line = {
                            color: element.style.borderColor.replace('#', ''),
                            width: element.style.borderWidth,
                        };
                    }
                    // Transparency for shapes
                    if (element.style.opacity !== undefined && element.style.opacity < 1) {
                        shapeOptions.fill.transparency = Math.round((1 - element.style.opacity) * 100);
                    }

                    if (element.style.shapeType === 'rectangle') {
                        slide.addShape(pptx.shapes.RECTANGLE, shapeOptions);
                    } else if (element.style.shapeType === 'circle') {
                        slide.addShape(pptx.shapes.OVAL, shapeOptions);
                    } else if (element.style.shapeType === 'triangle') {
                         slide.addShape(pptx.shapes.TRIANGLE, shapeOptions);
                    }
                }
            }
        }
        await pptx.writeFile({ fileName: `${presentation.title || 'presentation'}.pptx` });
        toast({ title: "PPTX Exported", description: "Presentation downloaded successfully." });
    } catch (error: any) {
        console.error("PPTX Export Error:", error);
        toast({ title: "PPTX Export Failed", description: error.message || "Could not generate PPTX.", variant: "destructive" });
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportImages = () => {
    if (!presentation) return;
    setIsExporting(true); 
    router.push(`/present/${presentation.id}?exportAllImages=true`);
    // No need to call onOpenChange(false) here, as the navigation will handle it.
    // setIsExporting will be reset on the PresentPage after export.
  };


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
        <Form {...form}>
        <form action={formAction} className="space-y-6 py-4">
            <input type="hidden" name="presentationId" value={presentation.id} />
            
            <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-muted/30">
                <h3 className="text-lg font-semibold flex items-center"><LinkIcon className="mr-2 h-5 w-5 text-primary"/> Link Sharing</h3>
                <FormField
                    control={form.control}
                    name="isPublic"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel htmlFor="isPublicSwitch" className="text-base flex items-center"><Globe className="mr-2 h-4 w-4"/> Public Access</FormLabel>
                            <FormDescription className="text-xs">Anyone with the link can view this presentation.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch id="isPublicSwitch" checked={field.value} onCheckedChange={field.onChange} name={field.name} disabled={!isCurrentUserOwner}/>
                        </FormControl>
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
                            <FormLabel htmlFor="passwordProtectedSwitch" className="text-base flex items-center"><Lock className="mr-2 h-4 w-4"/> Password Protect</FormLabel>
                            <FormDescription className="text-xs">Require a password to view this public presentation.</FormDescription>
                            </div>
                             <FormControl>
                               <Switch id="passwordProtectedSwitch" checked={field.value} onCheckedChange={field.onChange} name={field.name} disabled={!isCurrentUserOwner}/>
                             </FormControl>
                        </FormItem>
                        )}
                    />
                )}
                {form.watch('isPublic') && form.watch('passwordProtected') && (
                    <div className="ml-8 space-y-1">
                    <FormLabel htmlFor="password">Set Password</FormLabel>
                    <FormControl>
                      <Input id="password" name="password" type="password" placeholder="Enter a strong password" disabled={!isCurrentUserOwner} />
                    </FormControl>
                    {presentation.settings.password && <FormDescription className="text-xs">A password is currently set. Enter a new one to change it, or uncheck "Password Protect" to remove it.</FormDescription>}
                    <FormMessage />
                    </div>
                )}
                <div className="p-2 bg-background rounded-md border">
                    <FormLabel>Shareable Link</FormLabel>
                    <div className="flex items-center gap-2 mt-1">
                        <Input type="text" readOnly value={presentationLink} className="text-sm bg-muted"/>
                        <Button type="button" variant="outline" size="icon" onClick={() => handleCopyToClipboard(presentationLink)} title="Copy link">
                            <Copy className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
            </div>
            
            <Separator />

            <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-muted/30">
                 <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/> Manage Collaborators</h3>
                {isCurrentUserOwner && (
                    <div className="space-y-3 p-3 bg-background rounded-md border">
                        <h4 className="font-medium flex items-center"><UserPlus className="mr-2 h-4 w-4"/> Invite New Collaborator</h4>
                        <div className="flex items-end gap-2">
                            <div className="flex-grow">
                                <FormField
                                    control={form.control}
                                    name="inviteEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel htmlFor="inviteEmail">Email Address</FormLabel>
                                        <FormControl>
                                            <Input id="inviteEmail" type="email" placeholder="user@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div>
                                <FormField
                                    control={form.control}
                                    name="inviteRole"
                                    defaultValue="viewer"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel htmlFor="inviteRole">Role</FormLabel>
                                        <Select name={field.name} onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                            <SelectTrigger id="inviteRole" className="w-[120px]">
                                                <SelectValue placeholder="Role" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="viewer">Viewer</SelectItem>
                                                <SelectItem value="editor">Editor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
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

            <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-muted/30">
                <h3 className="text-lg font-semibold flex items-center"><FileTextIcon className="mr-2 h-5 w-5 text-primary"/> Export Presentation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button type="button" variant="outline" onClick={handleExportPDF} disabled={isExporting}>
                        {isExporting ? <Loader2 className="animate-spin mr-2"/> : <FileTextIcon className="mr-2 h-4 w-4" />} Export as PDF
                    </Button>
                    <Button type="button" variant="outline" onClick={handleExportPPT} disabled={isExporting}>
                        {isExporting ? <Loader2 className="animate-spin mr-2"/> : <Film className="mr-2 h-4 w-4" />} Export as PPTX
                    </Button>
                    <Button type="button" variant="outline" onClick={handleExportImages} disabled={isExporting}>
                         {isExporting ? <Loader2 className="animate-spin mr-2"/> : <ImageIconSvg className="mr-2 h-4 w-4" />} Export Images (ZIP)
                    </Button>
                </div>
            </div>
            
            <Separator />

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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>Cancel</Button>
            {isCurrentUserOwner && <SubmitButton />}
          </DialogFooter>
        </form>
        </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
