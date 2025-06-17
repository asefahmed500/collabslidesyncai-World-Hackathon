
"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { SlideThumbnailList } from '@/components/editor/SlideThumbnailList';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';
import { AIAssistantPanel } from '@/components/editor/AIAssistantPanel';
import { CollaborationBar } from '@/components/editor/CollaborationBar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { Presentation, Slide, SlideElement, SlideComment } from '@/types';
import { AlertTriangle, Home, RotateCcw, Save, Share2, Users, FileText, Loader2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/hooks/useAuth';
import { 
  getPresentationById as apiGetPresentationById, 
  updatePresentation as apiUpdatePresentation,
  addSlideToPresentation as apiAddSlide,
  updateElementInSlide as apiUpdateElement, // We'll use this for element property changes
  addCommentToSlide as apiAddComment,
  resolveCommentOnSlide as apiResolveComment
} from '@/lib/firestoreService';


export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();
  const presentationId = params.id as string;

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<'properties' | 'ai' | null>('properties');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    if (presentationId && currentUser) {
      setIsLoading(true);
      apiGetPresentationById(presentationId)
        .then(data => {
          if (data) {
            const hasAccess = data.creatorId === currentUser.id || (data.access && data.access[currentUser.id]);
            if (!hasAccess && !data.settings.isPublic) {
                 toast({ title: "Access Denied", description: "You don't have permission to view this presentation.", variant: "destructive" });
                 router.push('/dashboard');
                 return;
            }
            // Ensure slides and elements have default styles if missing
            const presentationWithDefaults = {
                ...data,
                slides: (data.slides || []).map(slide => ({
                    ...slide,
                    backgroundColor: slide.backgroundColor || '#FFFFFF',
                    elements: (slide.elements || []).map(el => ({
                        ...el,
                        zIndex: el.zIndex === undefined ? 0 : el.zIndex,
                        style: {
                            fontFamily: el.style?.fontFamily || 'PT Sans',
                            fontSize: el.style?.fontSize || '16px',
                            color: el.style?.color || '#000000',
                            backgroundColor: el.style?.backgroundColor || 'transparent',
                            ...el.style,
                        }
                    }))
                }))
            };
            setPresentation(presentationWithDefaults);
            if (presentationWithDefaults.slides.length > 0 && !currentSlideId) {
              setCurrentSlideId(presentationWithDefaults.slides[0].id);
            } else if (presentationWithDefaults.slides.length === 0) {
              setCurrentSlideId(null);
            }
          } else {
            toast({ title: "Error", description: "Presentation not found.", variant: "destructive" });
            router.push('/dashboard');
          }
        })
        .catch(error => {
          console.error("Error fetching presentation:", error);
          toast({ title: "Error", description: "Could not load presentation.", variant: "destructive" });
          router.push('/dashboard');
        })
        .finally(() => setIsLoading(false));
    }
  }, [presentationId, currentUser, router, toast, authLoading, currentSlideId]);

  const currentSlide = presentation?.slides.find(s => s.id === currentSlideId) || null;

  const handleToolSelect = (tool: string) => {
    toast({ title: "Tool Selected", description: `${tool} functionality not fully implemented.`, duration: 2000});
    if (tool === 'ai-design' || tool === 'ai-content') {
      setIsRightPanelOpen('ai');
    }
  };

  const handleAction = (action: string) => {
    toast({ title: "Action Triggered", description: `${action} functionality not fully implemented.`, duration: 2000 });
     if (action === 'comments') {
       setIsRightPanelOpen(isRightPanelOpen === 'properties' && currentSlide ? 'properties' : (currentSlide ? 'properties' : null)); 
    }
  };

  const handleSlideSelect = (slideId: string) => {
    setCurrentSlideId(slideId);
    setSelectedElementId(null); 
  };

  const handleAddSlide = async () => {
    if (!presentation || !currentUser) return;
    setIsSaving(true);
    try {
      const newSlideId = await apiAddSlide(presentation.id);
      // Re-fetch presentation to get the new slide with all defaults from backend
      const updatedPresentation = await apiGetPresentationById(presentation.id);
      if (updatedPresentation) {
        setPresentation(updatedPresentation);
        setCurrentSlideId(newSlideId);
        toast({ title: "Slide Added", description: `New slide created.` });
      }
    } catch (error) {
      console.error("Error adding slide:", error);
      toast({ title: "Error", description: "Could not add slide.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUpdateElement = useCallback(async (updatedElementPartial: Partial<SlideElement>) => {
    if (!presentation || !currentSlideId || !updatedElementPartial.id) return;
    
    // Optimistic UI update
    const oldPresentation = JSON.parse(JSON.stringify(presentation)); 
    setPresentation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        slides: prev.slides.map(s => {
          if (s.id === currentSlideId) {
            return {
              ...s,
              elements: s.elements.map(el => 
                el.id === updatedElementPartial.id ? { ...el, ...updatedElementPartial, style: {...el.style, ...updatedElementPartial.style} } : el
              ),
            };
          }
          return s;
        }),
      };
    });

    try {
      await apiUpdateElement(presentation.id, currentSlideId, updatedElementPartial);
      // Minor toast, or rely on main save button
      // toast({ title: "Element Updated", description: `Element ${updatedElementPartial.id?.slice(0,8)} saved.`, duration: 1000, variant:"default" });
    } catch (error) {
      console.error("Error updating element:", error);
      toast({ title: "Sync Error", description: "Could not save element change. Reverted.", variant: "destructive" });
      setPresentation(oldPresentation); // Revert
    }
  }, [presentation, currentSlideId, toast]);
  
  const handleAddComment = async (text: string) => {
    if (!presentation || !currentSlideId || !currentUser) return;
    setIsSaving(true);
    const newComment: Omit<SlideComment, 'createdAt' | 'id'> = { // createdAt will be server timestamp
      userId: currentUser.id,
      userName: currentUser.name || 'Anonymous',
      userAvatarUrl: currentUser.profilePictureUrl || `https://placehold.co/40x40.png?text=${(currentUser.name || 'A').charAt(0).toUpperCase()}`,
      text,
      resolved: false,
    };
    
    // Firestore will add id and createdAt
    const tempCommentId = `temp-comment-${Date.now()}`;
    const optimisticComment: SlideComment = { ...newComment, id: tempCommentId, createdAt: new Date() };

    setPresentation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        slides: prev.slides.map(s => 
          s.id === currentSlideId ? { ...s, comments: [...(s.comments || []), optimisticComment] } : s
        ),
      };
    });

    try {
      await apiAddComment(presentation.id, currentSlideId, newComment as SlideComment); // Cast as Firestore will fill missing server fields
      toast({ title: "Comment Added"});
       // Re-fetch to get server-generated ID and timestamp
      const updatedData = await apiGetPresentationById(presentation.id);
      if (updatedData) setPresentation(updatedData);
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({ title: "Error", description: "Could not post comment. Reverting.", variant: "destructive" });
      setPresentation(prev => { // Revert optimistic update
         if (!prev) return null;
         return {
           ...prev,
           slides: prev.slides.map(s => 
             s.id === currentSlideId ? { ...s, comments: (s.comments || []).filter(c => c.id !== tempCommentId) } : s
           ),
         };
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolveComment = async (commentId: string) => {
     if (!presentation || !currentSlideId) return;
     setIsSaving(true);
     const oldPresentation = JSON.parse(JSON.stringify(presentation));
     setPresentation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        slides: prev.slides.map(s => 
          s.id === currentSlideId ? { ...s, comments: s.comments.map(c => c.id === commentId ? {...c, resolved: true} : c) } : s
        ),
      };
    });
    try {
      await apiResolveComment(presentation.id, currentSlideId, commentId);
      toast({ title: "Comment Resolved"});
    } catch (error) {
      console.error("Error resolving comment:", error);
      toast({ title: "Error", description: "Could not resolve comment.", variant: "destructive" });
      setPresentation(oldPresentation);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSavePresentation = async () => {
    if (!presentation) return;
    setIsSaving(true);
    try {
      // The presentation state already reflects all local changes to slides and elements
      await apiUpdatePresentation(presentation.id, { 
        title: presentation.title, 
        slides: presentation.slides 
      });
      toast({ title: "Presentation Saved", description: "Your changes have been saved to the server."});
    } catch (error) {
      console.error("Error saving presentation:", error);
      toast({ title: "Save Error", description: "Could not save presentation.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUpdateSlideBackgroundColor = (color: string) => {
    if (!presentation || !currentSlideId) return;
     setPresentation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        slides: prev.slides.map(s => 
          s.id === currentSlideId ? { ...s, backgroundColor: color } : s
        ),
      };
    });
    // This change will be saved with the next call to handleSavePresentation or if we add specific slide update logic
  };


  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <SiteHeader />
        <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading presentation...</p>
        </div>
      </div>
    );
  }

  if (!presentation && !isLoading) { // Should be covered by redirect in useEffect, but as a fallback
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <SiteHeader />
        <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
            <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="font-headline text-3xl mb-2">Presentation Not Found</h1>
            <p className="text-muted-foreground mb-6">We couldn&apos;t load the presentation you were looking for.</p>
            <Button onClick={() => router.push('/dashboard')}>
                <Home className="mr-2 h-4 w-4" /> Go to Dashboard
            </Button>
        </div>
      </div>
    );
  }
  
  const EditorHeader = () => (
    <div className="bg-background border-b px-4 py-2 h-16 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Zap className="h-8 w-8 text-primary hover:text-accent transition-colors" />
        </Link>
        <div>
          <input 
            type="text"
            value={presentation?.title || ''}
            onChange={(e) => setPresentation(p => p ? {...p, title: e.target.value} : null)}
            onBlur={handleSavePresentation} 
            className="font-headline text-xl font-semibold leading-tight bg-transparent border-none focus:ring-0 p-0 w-full max-w-xs sm:max-w-md"
            disabled={isSaving}
          />
          <p className="text-xs text-muted-foreground">
            {presentation?.version ? `Version ${presentation.version} - ` : ''}
            Last saved: {presentation?.lastUpdatedAt ? new Date(presentation.lastUpdatedAt).toLocaleTimeString() : 'Not saved yet'}
            {isSaving && <Loader2 className="inline-block ml-2 h-3 w-3 animate-spin" />}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {presentation?.collaborators && currentUser && <CollaborationBar collaborators={presentation.collaborators} currentUser={currentUser} />}
        <Button variant="outline" size="sm" onClick={handleSavePresentation} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
            Save
        </Button>
        <Button variant="outline" size="sm" disabled><Share2 className="mr-2 h-4 w-4" /> Share</Button>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Editor Menu">
                    <FileText className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSavePresentation} disabled={isSaving}><Save className="mr-2 h-4 w-4" /> Save Now</DropdownMenuItem>
                <DropdownMenuItem disabled><RotateCcw className="mr-2 h-4 w-4" /> Version History</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled><Users className="mr-2 h-4 w-4" /> Manage Collaborators</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );


  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <EditorHeader />
      <EditorToolbar onToolSelect={handleToolSelect} onAction={handleAction} />
      <div className="flex flex-grow overflow-hidden">
        <SlideThumbnailList
          slides={presentation?.slides || []}
          currentSlideId={currentSlideId}
          onSlideSelect={handleSlideSelect}
          onAddSlide={handleAddSlide}
          disabled={isSaving}
        />
        <EditorCanvas 
            slide={currentSlide} 
            onElementSelect={setSelectedElementId} 
            selectedElementId={selectedElementId} 
            onUpdateElement={handleUpdateElement} 
            disabled={isSaving}
        />
        
        {isRightPanelOpen === 'properties' && currentSlide && (
           <PropertiesPanel
              selectedElement={currentSlide.elements.find(el => el.id === selectedElementId) || null}
              currentSlide={currentSlide}
              onUpdateElement={handleUpdateElement}
              onAddComment={handleAddComment}
              onResolveComment={handleResolveComment}
              onUpdateSlideBackgroundColor={handleUpdateSlideBackgroundColor}
              disabled={isSaving}
            />
        )}
        {isRightPanelOpen === 'ai' && (
          <AIAssistantPanel currentSlide={currentSlide} currentPresentation={presentation} />
        )}

      </div>
        <div className="md:hidden"> {/* Mobile AI Assistant Panel Toggle */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="fixed bottom-4 right-4 z-50 shadow-lg rounded-full p-3 h-auto">
                <Zap className="h-6 w-6 text-primary" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[75vh]">
              <SheetHeader>
                <SheetTitle className="font-headline">AI Assistant</SheetTitle>
                <SheetDescription>
                  Get design suggestions and smart tips for your presentation.
                </SheetDescription>
              </SheetHeader>
              <div className="py-4 h-[calc(100%-4rem)]"> {/* Ensure content area is scrollable if needed */}
                 <AIAssistantPanel currentSlide={currentSlide} currentPresentation={presentation} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
    </div>
  );
}

