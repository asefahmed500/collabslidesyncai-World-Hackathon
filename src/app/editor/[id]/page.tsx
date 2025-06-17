
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
  updateElementInSlide as apiUpdateElement,
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
            // Basic access check: current user must be owner or have access defined
            const hasAccess = data.creatorId === currentUser.id || (data.access && data.access[currentUser.id]);
            if (!hasAccess && !data.settings.isPublic) {
                 toast({ title: "Access Denied", description: "You don't have permission to view this presentation.", variant: "destructive" });
                 router.push('/dashboard');
                 return;
            }
            setPresentation(data);
            if (data.slides.length > 0) {
              setCurrentSlideId(data.slides[0].id);
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
  }, [presentationId, currentUser, router, toast, authLoading]);

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
       setIsRightPanelOpen(isRightPanelOpen === 'properties' ? null : 'properties'); 
    }
  };

  const handleSlideSelect = (slideId: string) => {
    setCurrentSlideId(slideId);
    setSelectedElementId(null); 
  };

  const handleAddSlide = async () => {
    if (!presentation || !currentUser) return;
    const newSlideId = `slide-${presentation.id}-${Date.now()}`;
    const newSlide: Slide = {
      id: newSlideId,
      presentationId: presentation.id,
      slideNumber: (presentation.slides?.length || 0) + 1,
      elements: [{
        id: `elem-${newSlideId}-1`,
        type: 'text',
        content: `New Slide`,
        position: { x: 50, y: 50 },
        size: { width: 400, height: 50 },
        style: { fontFamily: 'Space Grotesk', fontSize: '36px', color: '#333333' }
      }],
      speakerNotes: "",
      comments: [],
      thumbnailUrl: `https://placehold.co/160x90.png?text=New`,
      backgroundColor: '#FFFFFF',
    };
    
    try {
      // Optimistically update UI
      const updatedSlides = [...(presentation.slides || []), newSlide];
      setPresentation(prev => prev ? { ...prev, slides: updatedSlides } : null);
      setCurrentSlideId(newSlideId);

      await apiAddSlide(presentation.id, newSlide);
      toast({ title: "Slide Added", description: `New slide created.`, duration: 2000 });
    } catch (error) {
      console.error("Error adding slide:", error);
      toast({ title: "Error", description: "Could not add slide.", variant: "destructive" });
      // Revert optimistic update if necessary
      setPresentation(prev => prev ? { ...prev, slides: presentation.slides } : null);
      if (presentation.slides.length > 0) setCurrentSlideId(presentation.slides[presentation.slides.length -1].id); else setCurrentSlideId(null);

    }
  };
  
  const handleUpdateElement = useCallback(async (updatedElementPartial: Partial<SlideElement>) => {
    if (!presentation || !currentSlideId || !updatedElementPartial.id) return;
    
    // Optimistic UI update
    const oldPresentation = JSON.parse(JSON.stringify(presentation)); // Deep copy for potential revert
    setPresentation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        slides: prev.slides.map(s => {
          if (s.id === currentSlideId) {
            return {
              ...s,
              elements: s.elements.map(el => 
                el.id === updatedElementPartial.id ? { ...el, ...updatedElementPartial } : el
              ),
            };
          }
          return s;
        }),
      };
    });

    try {
      await apiUpdateElement(presentation.id, currentSlideId, updatedElementPartial);
      // toast({ title: "Element Updated", description: `Element ${updatedElementPartial.id?.slice(0,8)} saved.`, duration: 1500 });
    } catch (error) {
      console.error("Error updating element:", error);
      toast({ title: "Error", description: "Could not save element changes.", variant: "destructive" });
      setPresentation(oldPresentation); // Revert
    }
  }, [presentation, currentSlideId, toast]);
  
  const handleAddComment = async (text: string) => {
    if (!presentation || !currentSlideId || !currentUser) return;
    const newComment: SlideComment = {
      id: `comment-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name || 'Anonymous',
      userAvatarUrl: currentUser.profilePictureUrl || `https://placehold.co/40x40.png?text=${(currentUser.name || 'A').charAt(0).toUpperCase()}`,
      text,
      createdAt: new Date(), // Will be converted to Timestamp by Firestore
      resolved: false,
    };

    const oldPresentation = JSON.parse(JSON.stringify(presentation));
    setPresentation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        slides: prev.slides.map(s => 
          s.id === currentSlideId ? { ...s, comments: [...(s.comments || []), newComment] } : s
        ),
      };
    });

    try {
      await apiAddComment(presentation.id, currentSlideId, newComment);
      toast({ title: "Comment Added", description: `Your comment has been posted.`});
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({ title: "Error", description: "Could not post comment.", variant: "destructive" });
      setPresentation(oldPresentation); // Revert
    }
  };

  const handleResolveComment = async (commentId: string) => {
     if (!presentation || !currentSlideId) return;

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
      setPresentation(oldPresentation); // Revert
    }
  };
  
  const handleSavePresentation = async () => {
    if (!presentation) return;
    try {
      await apiUpdatePresentation(presentation.id, { slides: presentation.slides, title: presentation.title /* add other fields */ });
      toast({ title: "Presentation Saved", description: "Your changes have been saved."});
    } catch (error) {
      console.error("Error saving presentation:", error);
      toast({ title: "Save Error", description: "Could not save presentation.", variant: "destructive" });
    }
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

  if (!presentation && !isLoading) {
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
            value={presentation.title}
            onChange={(e) => setPresentation(p => p ? {...p, title: e.target.value} : null)}
            onBlur={handleSavePresentation} // Save on blur
            className="font-headline text-xl font-semibold leading-tight bg-transparent border-none focus:ring-0 p-0"
          />
          <p className="text-xs text-muted-foreground">Version {presentation.version} - Last saved: {new Date(presentation.lastUpdatedAt).toLocaleTimeString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {presentation.collaborators && currentUser && <CollaborationBar collaborators={presentation.collaborators} currentUser={currentUser} />}
        <Button variant="outline" size="sm" onClick={handleSavePresentation}><Save className="mr-2 h-4 w-4" /> Save</Button>
        <Button variant="outline" size="sm" disabled><Share2 className="mr-2 h-4 w-4" /> Share</Button>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Editor Menu">
                    <FileText className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSavePresentation}><Save className="mr-2 h-4 w-4" /> Save Now</DropdownMenuItem>
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
          slides={presentation.slides || []}
          currentSlideId={currentSlideId}
          onSlideSelect={handleSlideSelect}
          onAddSlide={handleAddSlide}
        />
        <EditorCanvas slide={currentSlide} onElementSelect={setSelectedElementId} selectedElementId={selectedElementId} onUpdateElement={handleUpdateElement} />
        
        {isRightPanelOpen === 'properties' && currentSlide && (
           <PropertiesPanel
              selectedElement={currentSlide.elements.find(el => el.id === selectedElementId) || null}
              currentSlide={currentSlide}
              onUpdateElement={handleUpdateElement}
              onAddComment={handleAddComment}
              onResolveComment={handleResolveComment}
            />
        )}
        {isRightPanelOpen === 'ai' && (
          <AIAssistantPanel currentSlide={currentSlide} currentPresentation={presentation} />
        )}

      </div>
        <div className="md:hidden">
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
              <div className="py-4 h-[calc(100%-4rem)]">
                 <AIAssistantPanel currentSlide={currentSlide} currentPresentation={presentation} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
    </div>
  );
}
