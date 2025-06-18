
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import type { Presentation, Slide, SlideElement, ActiveCollaboratorInfo } from '@/types';
import { getPresentationById } from '@/lib/firestoreService';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, ShieldAlert, EyeOff, Home, ChevronLeft, ChevronRight, Expand, Minimize, NotepadText, X } from 'lucide-react';
import { PasswordPromptDialog } from '@/components/editor/PasswordPromptDialog'; // Reusing for consistency
import { cn } from '@/lib/utils';

const renderElementForPresentation = (element: SlideElement, zoom: number) => {
  const style = element.style || {};
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${element.position.x * zoom}px`,
    top: `${element.position.y * zoom}px`,
    width: `${element.size.width * zoom}px`,
    height: `${element.size.height * zoom}px`,
    fontFamily: style.fontFamily || 'PT Sans',
    fontSize: style.fontSize ? `${parseFloat(style.fontSize) * zoom}px` : `${16 * zoom}px`,
    color: style.color || '#000000',
    backgroundColor: style.backgroundColor || 'transparent',
    borderWidth: style.borderWidth ? `${style.borderWidth * zoom}px` : '0px',
    borderStyle: style.borderWidth && style.borderWidth > 0 ? 'solid' : 'none',
    borderColor: style.borderColor || 'transparent',
    borderRadius: style.borderRadius ? `${style.borderRadius * zoom}px` : '0px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    zIndex: element.zIndex || 0,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    opacity: style.opacity === undefined ? 1 : style.opacity,
    textAlign: style.textAlign || 'left',
    fontWeight: style.fontWeight || 'normal',
    fontStyle: style.fontStyle || 'normal',
    textDecoration: style.textDecoration || 'none',
  };

  switch (element.type) {
    case 'text':
      return (
        <div key={element.id} style={baseStyle} className="flex items-center justify-center p-1 whitespace-pre-wrap break-words">
          {element.content || "Text"}
        </div>
      );
    case 'image':
      return (
        <div key={element.id} style={baseStyle}>
          <Image
            src={element.content || "https://placehold.co/200x150.png?text=Image"}
            alt={typeof element.content === 'string' && element.content.startsWith('http') ? 'Slide image' : 'Placeholder'}
            layout="fill"
            objectFit="cover"
            data-ai-hint="slide image presentation"
            draggable="false"
          />
        </div>
      );
    case 'shape':
      const shapeStyle: React.CSSProperties = { ...baseStyle };
      if (style.shapeType === 'circle') shapeStyle.borderRadius = '50%';
      return (
        <div key={element.id} style={shapeStyle}>
          {style.shapeType === 'triangle' && <div className="w-full h-full text-xs flex items-center justify-center text-muted-foreground/50">[Triangle]</div>}
        </div>
      );
    // Add cases for chart and icon if basic rendering is desired
    default:
      return <div key={element.id} style={baseStyle} className="border border-dashed flex items-center justify-center text-muted-foreground/50 text-xs">Unsupported Element</div>;
  }
};


export default function PresentationViewPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();
  const presentationId = params.id as string;

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [passwordVerifiedInSession, setPasswordVerifiedInSession] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);
  const [zoom, setZoom] = useState(1);

  const presentationAreaRef = useRef<HTMLDivElement>(null);
  const unsubscribePresentationListener = useRef<(() => void) | null>(null);

  const calculateZoom = useCallback(() => {
    if (presentationAreaRef.current && presentation) {
      const containerWidth = presentationAreaRef.current.clientWidth;
      const containerHeight = presentationAreaRef.current.clientHeight;
      const baseSlideWidth = 960; // Match EditorCanvas base
      const baseSlideHeight = 540; // Match EditorCanvas base

      const scaleX = containerWidth / baseSlideWidth;
      const scaleY = containerHeight / baseSlideHeight;
      setZoom(Math.min(scaleX, scaleY) * 0.95); // 95% to leave some padding
    }
  }, [presentation]);

  useEffect(() => {
    window.addEventListener('resize', calculateZoom);
    return () => window.removeEventListener('resize', calculateZoom);
  }, [calculateZoom]);

  useEffect(() => {
    if (presentation) calculateZoom();
  }, [presentation, calculateZoom, showSpeakerNotes]); // Recalculate zoom if speaker notes visibility changes


  const checkAccessAndLoad = useCallback(async (presData: Presentation) => {
    let hasAccess = false;
    if (presData.settings.isPublic) {
      if (presData.settings.passwordProtected) {
        const sessionVerified = sessionStorage.getItem(`passwordVerified_${presData.id}`) === 'true';
        setPasswordVerifiedInSession(sessionVerified);
        if (!sessionVerified) {
          setIsPasswordPromptOpen(true);
          setIsLoading(false); // Stop loading to show prompt
          return false;
        }
      }
      hasAccess = true;
    } else if (currentUser) {
      if (presData.creatorId === currentUser.id || (presData.access && presData.access[currentUser.id])) {
        hasAccess = true;
      } else if (presData.teamId && presData.teamId === currentUser.teamId) {
         // Assuming team members get at least viewer access by default
         // More granular team roles for presentations could be added to `presentation.access`
         hasAccess = true;
      }
    }

    if (hasAccess) {
      setAccessDenied(false);
      return true;
    } else {
      setAccessDenied(true);
      setIsLoading(false);
      if (!presData.settings.isPublic) { // Only toast if not public, to avoid annoying for password prompt cases
        toast({ title: "Access Denied", description: "You don't have permission to view this presentation.", variant: "destructive" });
      }
      return false;
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (authLoading) return; // Wait for auth state to resolve

    if (!presentationId) {
      setAccessDenied(true);
      setIsLoading(false);
      toast({ title: "Error", description: "Presentation ID is missing.", variant: "destructive" });
      return;
    }

    // If already password verified, proceed to load
    if (passwordVerifiedInSession || (presentation && !presentation.settings.passwordProtected)) {
      setIsPasswordPromptOpen(false); // Ensure prompt is closed if verification happened
    }


    setIsLoading(true);
    const presRef = doc(db, 'presentations', presentationId);
    unsubscribePresentationListener.current = onSnapshot(presRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Omit<Presentation, 'id'>;
        const currentPresData = { id: docSnap.id, ...data } as Presentation;
        setPresentation(currentPresData);
        
        // Initial access check or re-check if not password verified
        if (!passwordVerifiedInSession && currentPresData.settings.isPublic && currentPresData.settings.passwordProtected) {
           const canView = await checkAccessAndLoad(currentPresData);
           if (!canView && isPasswordPromptOpen) { /* Stay on prompt */ }
           else if (!canView) { setIsLoading(false); } // If prompt not open and still no access
           else { setIsLoading(false); } // Access granted
        } else if (passwordVerifiedInSession || !currentPresData.settings.isPublic || !currentPresData.settings.passwordProtected) {
           await checkAccessAndLoad(currentPresData); // Standard check or re-check if public status changed
           setIsLoading(false);
        }

      } else {
        toast({ title: "Error", description: "Presentation not found.", variant: "destructive" });
        setAccessDenied(true);
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Error fetching presentation:", error);
      toast({ title: "Error", description: "Could not load presentation data.", variant: "destructive" });
      setAccessDenied(true);
      setIsLoading(false);
    });

    return () => {
      if (unsubscribePresentationListener.current) {
        unsubscribePresentationListener.current();
      }
    };
  }, [presentationId, authLoading, checkAccessAndLoad, passwordVerifiedInSession, toast]);
  

  const handlePasswordVerified = () => {
    setPasswordVerifiedInSession(true);
    sessionStorage.setItem(`passwordVerified_${presentationId}`, 'true');
    setIsPasswordPromptOpen(false);
    // Data loading and access check will re-trigger due to useEffect dependency on passwordVerifiedInSession
  };

  const nextSlide = useCallback(() => {
    if (presentation && currentSlideIndex < presentation.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  }, [presentation, currentSlideIndex]);

  const prevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  }, [currentSlideIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isPasswordPromptOpen) return; // Don't navigate while prompt is open
      if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'PageDown') {
        nextSlide();
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        prevSlide();
      } else if (event.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, isFullscreen, isPasswordPromptOpen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => console.error(err));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(err => console.error(err));
      }
    }
  };
  
  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);


  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading Presentation...</p>
      </div>
    );
  }

  if (isPasswordPromptOpen && presentation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <PasswordPromptDialog
            presentationId={presentation.id}
            isOpen={isPasswordPromptOpen}
            onOpenChange={(open) => {
                setIsPasswordPromptOpen(open);
                if (!open && !passwordVerifiedInSession) router.push('/dashboard'); // Go back if prompt closed without verification
            }}
            onPasswordVerified={handlePasswordVerified}
        />
         <p className="mt-2 text-muted-foreground">Presentation is password protected.</p>
      </div>
    );
  }
  
  if (accessDenied || !presentation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="font-headline text-3xl mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You do not have permission to view this presentation, it requires a password, or it could not be found.
        </p>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          <Home className="mr-2 h-4 w-4" /> Go to Dashboard
        </Button>
      </div>
    );
  }
  
  const currentSlide = presentation.slides[currentSlideIndex];
  if (!currentSlide) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="font-headline text-3xl mb-2">No Slides Found</h1>
        <p className="text-muted-foreground mb-6">This presentation has no slides or the current slide is unavailable.</p>
         <Button onClick={() => router.push(`/editor/${presentation.id}`)} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Editor
        </Button>
      </div>
    );
  }


  return (
    <div className="fixed inset-0 bg-background text-foreground flex flex-col overflow-hidden isolate">
      {/* Presentation Area */}
      <div ref={presentationAreaRef} className="flex-grow flex items-center justify-center relative p-2 md:p-4 overflow-hidden" onClick={(e) => {
          if (e.target === presentationAreaRef.current || (e.target as HTMLElement).classList.contains('slide-render-area')) {
            if (e.clientX > window.innerWidth / 2) nextSlide(); else prevSlide();
          }
        }}>
        <div 
          className="slide-render-area relative shadow-2xl overflow-hidden transition-all duration-300"
          style={{
            width: `${960 * zoom}px`,
            height: `${540 * zoom}px`,
            backgroundColor: currentSlide.backgroundColor || '#FFFFFF',
          }}
        >
          {(currentSlide.elements || []).sort((a,b) => (a.zIndex || 0) - (b.zIndex || 0)).map(element =>
            renderElementForPresentation(element, zoom)
          )}
        </div>
      </div>

      {/* Controls & Info Bar */}
      <div className={cn(
          "absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-2 md:p-3 text-xs md:text-sm transition-transform duration-300 ease-in-out z-10",
          showSpeakerNotes ? "translate-y-0" : "translate-y-full"
        )}
        style={{ maxHeight: '40vh', display: showSpeakerNotes ? 'block' : 'none' }} // Control visibility with display
      >
        <div className="container mx-auto max-w-4xl">
           <div className="flex justify-between items-center mb-1">
             <h3 className="font-semibold flex items-center"><NotepadText className="mr-2 h-4 w-4"/> Speaker Notes</h3>
             <Button variant="ghost" size="icon" onClick={() => setShowSpeakerNotes(false)} className="h-7 w-7">
                <X className="h-4 w-4" />
             </Button>
           </div>
          <div className="overflow-y-auto p-2 bg-muted rounded max-h-[calc(40vh-50px)] text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {currentSlide.speakerNotes || "No speaker notes for this slide."}
          </div>
        </div>
      </div>
      
      {/* Static Controls (always visible at bottom or top) */}
      <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-background/80 backdrop-blur-sm p-1.5 rounded-full shadow-lg z-20">
         <Button variant="ghost" size="icon" onClick={prevSlide} disabled={currentSlideIndex === 0} title="Previous Slide (ArrowLeft)">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {currentSlideIndex + 1} / {presentation.slides.length}
        </span>
        <Button variant="ghost" size="icon" onClick={nextSlide} disabled={currentSlideIndex === presentation.slides.length - 1} title="Next Slide (ArrowRight/Space)">
          <ChevronRight className="h-5 w-5" />
        </Button>
         <Button variant="ghost" size="icon" onClick={() => setShowSpeakerNotes(!showSpeakerNotes)} title={showSpeakerNotes ? "Hide Speaker Notes" : "Show Speaker Notes"}>
            <NotepadText className={cn("h-5 w-5", showSpeakerNotes && "text-primary")} />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}>
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
        </Button>
         <Button variant="ghost" size="icon" onClick={() => router.push(`/editor/${presentation.id}`)} title="Exit Presentation">
          <X className="h-5 w-5 text-destructive" />
        </Button>
      </div>
       {/* Invisible click areas for navigation */}
        <div 
            className="absolute left-0 top-0 bottom-0 w-1/4 z-0 cursor-pointer" 
            onClick={prevSlide}
            title="Previous slide"
        />
        <div 
            className="absolute right-0 top-0 bottom-0 w-1/4 z-0 cursor-pointer" 
            onClick={nextSlide}
            title="Next slide"
        />

    </div>
  );
}

