
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
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
import type { Presentation, Slide, SlideElement, SlideComment, ActiveCollaboratorInfo } from '@/types';
import { AlertTriangle, Home, RotateCcw, Save, Share2, Users, FileText, Loader2, Zap, WifiOff } from 'lucide-react';
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
  updatePresentation as apiUpdatePresentation,
  addSlideToPresentation as apiAddSlide,
  updateElementInSlide as apiUpdateElement, 
  addCommentToSlide as apiAddComment,
  resolveCommentOnSlide as apiResolveComment,
  updateUserPresence,
  removeUserPresence,
  updateUserCursorPosition,
  acquireLock as apiAcquireLock,
  releaseLock as apiReleaseLock,
  releaseExpiredLocks,
  getNextUserColor,
} from '@/lib/firestoreService';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { throttle } from 'lodash'; 


const LOCK_CHECK_INTERVAL = 15000; 

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
  const [isOnline, setIsOnline] = useState(true); // Assume online initially
  const [collaboratorColor, setCollaboratorColor] = useState<string>('');


  const unsubscribePresentationListener = useRef<(() => void) | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lockCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      setCollaboratorColor(getNextUserColor());
    }
  }, [currentUser]);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
      return;
    }

    if (presentationId && currentUser && collaboratorColor) {
      setIsLoading(true);
      
      const presRef = doc(db, 'presentations', presentationId);
      unsubscribePresentationListener.current = onSnapshot(presRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Omit<Presentation, 'id'>;
          
          const hasAccess = data.creatorId === currentUser.id || 
                            (data.access && data.access[currentUser.id]) ||
                            (data.teamId && currentUser.teamId === data.teamId); 
          
          if (!hasAccess && !data.settings.isPublic) {
            toast({ title: "Access Denied", description: "You don't have permission to view this presentation.", variant: "destructive" });
            router.push('/dashboard');
            return;
          }

          const presentationWithDefaults: Presentation = {
            id: docSnap.id,
            ...data,
            slides: (data.slides || []).map(slide => ({
              ...slide,
              backgroundColor: slide.backgroundColor || '#FFFFFF',
              elements: (slide.elements || []).map(el => ({
                ...el,
                zIndex: el.zIndex === undefined ? 0 : el.zIndex,
                lockedBy: el.lockedBy || null,
                lockTimestamp: el.lockTimestamp || null,
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
          } else if (currentSlideId && !presentationWithDefaults.slides.find(s => s.id === currentSlideId)) {
            // If current slide was deleted, select first available slide or null
            setCurrentSlideId(presentationWithDefaults.slides[0]?.id || null);
            setSelectedElementId(null);
          }
          setIsLoading(false);
        } else {
          toast({ title: "Error", description: "Presentation not found.", variant: "destructive" });
          router.push('/dashboard');
          setIsLoading(false);
        }
      }, (error) => {
        console.error("Error fetching presentation with listener:", error);
        toast({ title: "Error", description: "Could not load presentation data.", variant: "destructive" });
        router.push('/dashboard');
        setIsLoading(false);
      });

      updateUserPresence(presentationId, currentUser.id, { 
        name: currentUser.name || 'Anonymous', 
        profilePictureUrl: currentUser.profilePictureUrl,
        color: collaboratorColor,
      });

      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = setInterval(() => {
         updateUserPresence(presentationId, currentUser.id, { 
            name: currentUser.name || 'Anonymous', 
            profilePictureUrl: currentUser.profilePictureUrl,
            color: collaboratorColor
        });
      }, 30000); 

      if (lockCheckIntervalRef.current) clearInterval(lockCheckIntervalRef.current);
      lockCheckIntervalRef.current = setInterval(() => {
        releaseExpiredLocks(presentationId);
      }, LOCK_CHECK_INTERVAL);


      const handleBeforeUnload = () => {
        removeUserPresence(presentationId, currentUser.id);
        if (presentation && currentSlideId) {
            presentation.slides.forEach(slide => {
                slide.elements.forEach(el => {
                    if (el.lockedBy === currentUser.id) {
                        apiReleaseLock(presentationId, slide.id, el.id, currentUser.id);
                    }
                });
            });
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        if (unsubscribePresentationListener.current) {
          unsubscribePresentationListener.current();
        }
        if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
        if (lockCheckIntervalRef.current) clearInterval(lockCheckIntervalRef.current);
        removeUserPresence(presentationId, currentUser.id);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentationId, currentUser, authLoading, router, toast, collaboratorColor]); 

  const currentSlide = presentation?.slides.find(s => s.id === currentSlideId) || null;
  const selectedElement = currentSlide?.elements.find(el => el.id === selectedElementId) || null;

  const handleToolSelect = (tool: string) => {
    if (tool === 'ai-design' || tool === 'ai-content' || tool.startsWith('ai-')) {
      setIsRightPanelOpen('ai');
    } else {
      setIsRightPanelOpen('properties'); // Default to properties for other tools
      toast({ title: "Tool Selected", description: \`\${tool} functionality not fully implemented.\`, duration: 2000});
    }
  };

  const handleAction = (action: string) => {
     if (action === 'comments') {
       setIsRightPanelOpen(isRightPanelOpen === 'properties' ? null : 'properties'); 
    } else {
      toast({ title: "Action Triggered", description: \`\${action} functionality not fully implemented.\`, duration: 2000 });
    }
  };

  const handleSlideSelect = useCallback(async (slideId: string) => {
    if (selectedElement && currentUser && currentSlideId) { 
        await apiReleaseLock(presentationId, currentSlideId, selectedElement.id, currentUser.id);
    }
    setCurrentSlideId(slideId);
    setSelectedElementId(null); 
  }, [presentationId, currentSlideId, selectedElement, currentUser]);

  const handleElementSelect = useCallback(async (elementId: string | null) => {
    if (!currentUser || !currentSlideId || !presentation) return;

    if (selectedElementId && selectedElementId !== elementId) {
        const prevSelectedElement = presentation.slides.find(s => s.id === currentSlideId)?.elements.find(el => el.id === selectedElementId);
        if (prevSelectedElement && prevSelectedElement.lockedBy === currentUser.id) {
            await apiReleaseLock(presentationId, currentSlideId, selectedElementId, currentUser.id);
        }
    }
    
    setSelectedElementId(elementId);

    if (elementId) {
        const success = await apiAcquireLock(presentationId, currentSlideId, elementId, currentUser.id);
        if (!success) {
            const currentLocker = presentation.slides.find(s => s.id === currentSlideId)
                                      ?.elements.find(el => el.id === elementId)?.lockedBy;
            const lockerName = currentLocker ? presentation.activeCollaborators?.[currentLocker]?.name || "another user" : "another user";
            toast({ title: "Element Locked", description: \`This element is currently being edited by \${lockerName}.\`, variant: "destructive", duration: 3000 });
        }
    }
  }, [currentUser, currentSlideId, presentation, selectedElementId, presentationId, toast]);

  const handleAddSlide = async () => {
    if (!presentation || !currentUser) return;
    setIsSaving(true);
    try {
      const newSlideId = await apiAddSlide(presentation.id); 
      // setCurrentSlideId(newSlideId); // onSnapshot will handle this if preferred, or optimistically.
      // Let's allow onSnapshot to manage currentSlideId setting upon new slide creation.
      toast({ title: "Slide Added", description: "New slide created." });
    } catch (error) {
      console.error("Error adding slide:", error);
      toast({ title: "Error", description: "Could not add slide.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUpdateElement = useCallback(async (updatedElementPartial: Partial<SlideElement>) => {
    if (!presentation || !currentSlideId || !updatedElementPartial.id || !currentUser) return;
    
    const targetElement = presentation.slides.find(s => s.id === currentSlideId)?.elements.find(el => el.id === updatedElementPartial.id);
    if (targetElement && targetElement.lockedBy && targetElement.lockedBy !== currentUser.id) {
        const locker = presentation.activeCollaborators?.[targetElement.lockedBy]?.name || "another user";
        toast({ title: "Update Failed", description: \`Element is locked by \${locker}.\`, variant: "destructive" });
        return;
    }
    try {
      await apiUpdateElement(presentation.id, currentSlideId, updatedElementPartial);
    } catch (error) {
      console.error("Error updating element:", error);
      toast({ title: "Sync Error", description: "Could not save element change.", variant: "destructive" });
    }
  }, [presentation, currentSlideId, toast, currentUser]);
  
  const handleAddComment = async (text: string) => {
    if (!presentation || !currentSlideId || !currentUser) return;
    setIsSaving(true);
    const newCommentData: Omit<SlideComment, 'id' | 'createdAt'> = { 
      userId: currentUser.id,
      userName: currentUser.name || 'Anonymous',
      userAvatarUrl: currentUser.profilePictureUrl || \`https://placehold.co/40x40.png?text=\${(currentUser.name || 'A').charAt(0).toUpperCase()}\`,
      text,
      resolved: false,
    };
    try {
      await apiAddComment(presentation.id, currentSlideId, newCommentData); 
      toast({ title: "Comment Added"});
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({ title: "Error", description: "Could not post comment.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolveComment = async (commentId: string) => {
     if (!presentation || !currentSlideId) return;
     setIsSaving(true);
    try {
      await apiResolveComment(presentation.id, currentSlideId, commentId);
      toast({ title: "Comment Resolved"});
    } catch (error) {
      console.error("Error resolving comment:", error);
      toast({ title: "Error", description: "Could not resolve comment.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSavePresentation = async () => {
    if (!presentation) return;
    setIsSaving(true);
    try {
      await apiUpdatePresentation(presentation.id, { 
        title: presentation.title, 
      });
      toast({ title: "Presentation Title Saved", description: "Your title change has been saved."});
    } catch (error) {
      console.error("Error saving presentation title:", error);
      toast({ title: "Save Error", description: "Could not save presentation title.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUpdateSlideBackgroundColor = async (color: string) => {
    if (!presentation || !currentSlideId) return;
    const updatedSlides = presentation.slides.map(s => 
        s.id === currentSlideId ? { ...s, backgroundColor: color } : s
    );
    await apiUpdatePresentation(presentation.id, { slides: updatedSlides });
  };

  const throttledUpdateCursor = useCallback(throttle((slideId: string, position: {x: number, y: number}) => {
    if (presentationId && currentUser && isOnline) {
      updateUserCursorPosition(presentationId, currentUser.id, slideId, position);
    }
  }, 100), [presentationId, currentUser, isOnline]);

  const handleMouseMoveOnCanvas = (position: { x: number; y: number } | null) => {
    if (currentSlideId && position && currentUser) {
      throttledUpdateCursor(currentSlideId, position);
    }
  };
  
  useEffect(() => { 
    return () => {
        if (presentation && selectedElementId && currentUser && currentSlideId) {
            const currentSelectedElement = presentation.slides.find(s => s.id === currentSlideId)?.elements.find(el => el.id === selectedElementId);
            if (currentSelectedElement && currentSelectedElement.lockedBy === currentUser.id) {
                 apiReleaseLock(presentation.id, currentSlideId, selectedElementId, currentUser.id);
            }
        }
    }
  }, [presentationId, currentSlideId, selectedElementId, currentUser, presentation]);

  const handleApplyAITextUpdate = (elementId: string, newContent: string) => {
    if (selectedElement && selectedElement.id === elementId) {
        handleUpdateElement({ id: elementId, content: newContent });
        toast({title: "AI Update Applied", description: "Text element updated with AI suggestion."});
    }
  };

  const handleApplyAISpeakerNotes = (notes: string) => {
    if (presentation && currentSlideId) {
        const updatedSlides = presentation.slides.map(s =>
            s.id === currentSlideId ? { ...s, speakerNotes: notes } : s
        );
        apiUpdatePresentation(presentation.id, { slides: updatedSlides });
        toast({title: "AI Notes Applied", description: "Speaker notes updated."});
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

  if (!isOnline) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <SiteHeader />
        <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
            <WifiOff className="w-16 h-16 text-destructive mb-4" />
            <h1 className="font-headline text-3xl mb-2">You are offline</h1>
            <p className="text-muted-foreground mb-6">Please check your internet connection to continue editing.</p>
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
            value={presentation?.title || ''}
            onChange={(e) => setPresentation(p => p ? {...p, title: e.target.value} : null)} 
            onBlur={handleSavePresentation} 
            className="font-headline text-xl font-semibold leading-tight bg-transparent border-none focus:ring-0 p-0 w-full max-w-xs sm:max-w-md"
            disabled={isSaving}
          />
          <p className="text-xs text-muted-foreground">
            {presentation?.version ? \`Version \${presentation.version} - \` : ''}
            Last server update: {presentation?.lastUpdatedAt ? new Date((presentation.lastUpdatedAt as Timestamp).toDate()).toLocaleTimeString() : 'Syncing...'}
            {isSaving && <Loader2 className="inline-block ml-2 h-3 w-3 animate-spin" />}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {currentUser && <CollaborationBar activeCollaborators={presentation?.activeCollaborators || {}} currentUser={currentUser} />}
        <Button variant="outline" size="sm" onClick={handleSavePresentation} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
            Save Title
        </Button>
        <Button variant="outline" size="sm" disabled><Share2 className="mr-2 h-4 w-4" /> Share</Button>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Editor Menu">
                    <FileText className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSavePresentation} disabled={isSaving}><Save className="mr-2 h-4 w-4" /> Save Title Now</DropdownMenuItem>
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
          disabled={isSaving || !isOnline}
        />
        <EditorCanvas 
            slide={currentSlide} 
            onElementSelect={handleElementSelect} 
            selectedElementId={selectedElementId} 
            onUpdateElement={handleUpdateElement} 
            disabled={isSaving || !isOnline}
            activeCollaborators={presentation?.activeCollaborators || {}}
            currentUser={currentUser}
            onMouseMove={handleMouseMoveOnCanvas}
            canvasBaseWidth={960} 
            canvasBaseHeight={540}
        />
        
        {isRightPanelOpen === 'properties' && currentSlide && currentUser && (
           <PropertiesPanel
              selectedElement={selectedElement}
              currentSlide={currentSlide}
              onUpdateElement={handleUpdateElement}
              onAddComment={handleAddComment}
              onResolveComment={handleResolveComment}
              onUpdateSlideBackgroundColor={handleUpdateSlideBackgroundColor}
              disabled={isSaving || !isOnline || (selectedElement?.lockedBy !== null && selectedElement?.lockedBy !== currentUser.id)}
              currentUserId={currentUser.id}
            />
        )}
        {isRightPanelOpen === 'ai' && (
          <AIAssistantPanel 
            currentSlide={currentSlide} 
            currentPresentation={presentation}
            selectedElement={selectedElement}
            onApplyAITextUpdate={handleApplyAITextUpdate}
            onApplyAISpeakerNotes={handleApplyAISpeakerNotes}
          />
        )}

      </div>
        <div className="md:hidden"> 
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="fixed bottom-4 right-4 z-50 shadow-lg rounded-full p-3 h-auto">
                <Sparkles className="h-6 w-6 text-primary" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[75vh] flex flex-col">
              <SheetHeader className="pb-2">
                <SheetTitle className="font-headline">AI Assistant</SheetTitle>
                <SheetDescription>
                  Get design suggestions and smart tips for your presentation.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-grow overflow-hidden"> 
                 <AIAssistantPanel 
                    currentSlide={currentSlide} 
                    currentPresentation={presentation}
                    selectedElement={selectedElement}
                    onApplyAITextUpdate={handleApplyAITextUpdate}
                    onApplyAISpeakerNotes={handleApplyAISpeakerNotes}
                  />
              </div>
            </SheetContent>
          </Sheet>
        </div>
    </div>
  );
}

