"use client";

import { useEffect, useState } from 'react';
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
import { getPresentationById, mockUser } from '@/lib/mock-data';
import type { Presentation, Slide, SlideElement, SlideComment } from '@/types';
import { AlertTriangle, Home, RotateCcw, Save, Share2, Users, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Zap } from 'lucide-react';

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const presentationId = params.id as string;

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<'properties' | 'ai' | null>('properties');


  useEffect(() => {
    if (presentationId) {
      const data = getPresentationById(presentationId);
      if (data) {
        setPresentation(data);
        if (data.slides.length > 0) {
          setCurrentSlideId(data.slides[0].id);
        }
      } else {
        toast({ title: "Error", description: "Presentation not found.", variant: "destructive" });
        // router.push('/dashboard'); // Consider redirecting
      }
    }
  }, [presentationId, router, toast]);

  const currentSlide = presentation?.slides.find(s => s.id === currentSlideId) || null;
  const selectedElement = currentSlide?.elements.find(el => el.id === selectedElementId) || null;

  const handleToolSelect = (tool: string) => {
    toast({ title: "Tool Selected", description: `${tool} functionality not fully implemented.`, duration: 2000});
    if (tool === 'ai-design' || tool === 'ai-content') {
      setIsRightPanelOpen('ai');
    }
    // Mock element creation or tool activation
  };

  const handleAction = (action: string) => {
    toast({ title: "Action Triggered", description: `${action} functionality not fully implemented.`, duration: 2000 });
     if (action === 'comments') {
       setIsRightPanelOpen(isRightPanelOpen === 'properties' ? null : 'properties'); // Toggle or ensure properties panel is open for comments
    }
  };

  const handleSlideSelect = (slideId: string) => {
    setCurrentSlideId(slideId);
    setSelectedElementId(null); // Deselect element when changing slides
  };

  const handleAddSlide = () => {
    if (!presentation) return;
    const newSlideId = `slide-${presentation.id}-${presentation.slides.length + 1}`;
    const newSlide: Slide = {
      id: newSlideId,
      presentationId: presentation.id,
      slideNumber: presentation.slides.length + 1,
      elements: [{
        id: `elem-${newSlideId}-1`,
        type: 'text',
        content: `New Slide ${presentation.slides.length + 1}`,
        position: { x: 50, y: 50 },
        size: { width: 400, height: 50 },
        style: { fontFamily: 'Space Grotesk', fontSize: '36px' }
      }],
      speakerNotes: "",
      comments: [],
      thumbnailUrl: `https://placehold.co/160x90.png?text=NewSlide`,
      backgroundColor: '#FFFFFF',
    };
    setPresentation(prev => prev ? { ...prev, slides: [...prev.slides, newSlide] } : null);
    setCurrentSlideId(newSlideId);
    toast({ title: "Slide Added", description: `New slide created.`, duration: 2000 });
  };
  
  const handleUpdateElement = (updatedElement: Partial<SlideElement>) => {
    if (!presentation || !currentSlideId || !updatedElement.id) return;

    setPresentation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        slides: prev.slides.map(s => {
          if (s.id === currentSlideId) {
            return {
              ...s,
              elements: s.elements.map(el => 
                el.id === updatedElement.id ? { ...el, ...updatedElement } : el
              ),
            };
          }
          return s;
        }),
      };
    });
    // toast({ title: "Element Updated (Mock)", description: `Element ${updatedElement.id?.slice(0,8)} updated.`, duration: 1500 });
  };
  
  const handleAddComment = (text: string) => {
    if (!presentation || !currentSlideId) return;
    const newComment: SlideComment = {
      id: `comment-${Date.now()}`,
      userId: mockUser.id,
      userName: mockUser.name,
      userAvatarUrl: mockUser.profilePictureUrl,
      text,
      createdAt: new Date(),
      resolved: false,
    };
    setPresentation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        slides: prev.slides.map(s => 
          s.id === currentSlideId ? { ...s, comments: [...s.comments, newComment] } : s
        ),
      };
    });
    toast({ title: "Comment Added", description: `Your comment has been posted.`});
  };

  const handleResolveComment = (commentId: string) => {
     if (!presentation || !currentSlideId) return;
     setPresentation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        slides: prev.slides.map(s => 
          s.id === currentSlideId ? { ...s, comments: s.comments.map(c => c.id === commentId ? {...c, resolved: true} : c) } : s
        ),
      };
    });
    toast({ title: "Comment Resolved"});
  }


  if (!presentation) {
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
          <h1 className="font-headline text-xl font-semibold leading-tight">{presentation.title}</h1>
          <p className="text-xs text-muted-foreground">Version {presentation.version} - Last saved: {new Date(presentation.lastUpdatedAt).toLocaleTimeString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {presentation.collaborators && <CollaborationBar collaborators={presentation.collaborators} currentUser={mockUser} />}
        <Button variant="outline" size="sm"><Share2 className="mr-2 h-4 w-4" /> Share</Button>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Editor Menu">
                    <FileText className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem><Save className="mr-2 h-4 w-4" /> Save Version</DropdownMenuItem>
                <DropdownMenuItem><RotateCcw className="mr-2 h-4 w-4" /> Version History</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem><Users className="mr-2 h-4 w-4" /> Manage Collaborators</DropdownMenuItem>
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
          slides={presentation.slides}
          currentSlideId={currentSlideId}
          onSlideSelect={handleSlideSelect}
          onAddSlide={handleAddSlide}
        />
        <EditorCanvas slide={currentSlide} onElementSelect={setSelectedElementId} selectedElementId={selectedElementId} />
        
        {/* Right Panel: Properties or AI */}
        {/* This toggles between Properties and AI panel or closes them */}
        {/* A more robust solution might use a Sheet or resizable panes */}
        {isRightPanelOpen === 'properties' && (
           <PropertiesPanel
              selectedElement={selectedElement}
              currentSlide={currentSlide}
              onUpdateElement={handleUpdateElement}
              onAddComment={handleAddComment}
              onResolveComment={handleResolveComment}
            />
        )}
        {isRightPanelOpen === 'ai' && (
          <AIAssistantPanel currentSlide={currentSlide} currentPresentation={presentation} />
        )}
        {/* Button to toggle right panel if needed, or manage via toolbar actions */}

      </div>
       {/* Mobile/Small screen AI Panel using Sheet */}
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
              <div className="py-4 h-[calc(100%-4rem)]"> {/* Adjust height to fit content */}
                 <AIAssistantPanel currentSlide={currentSlide} currentPresentation={presentation} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
    </div>
  );
}
