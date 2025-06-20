
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { Presentation, Slide, SlideElement, SlideComment, ActiveCollaboratorInfo, User as AppUser, SlideElementType, PresentationActivity, ChartContent, IconContent, SuggestedChartConfig, SlideBackgroundGradient } from '@/types';
import { AlertTriangle, Home, RotateCcw, Save, Share2, Users, FileText, Loader2, Zap, WifiOff, ShieldAlert, Sparkles, LayoutTemplate, Trash2, Copy, ShieldX, Settings, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  deleteSlideFromPresentation as apiDeleteSlide,
  duplicateSlideInPresentation as apiDuplicateSlide,
  moveSlideInPresentation as apiMoveSlide,
  updateElementInSlide as apiUpdateElement,
  addElementToSlide as apiAddElementToSlide,
  deleteElementFromSlide as apiDeleteElementFromSlide,
  addCommentToSlide as apiAddComment,
  resolveCommentOnSlide as apiResolveComment,
  updateUserPresence,
  removeUserPresence,
  updateUserCursorPosition,
  acquireLock as apiAcquireLock,
  releaseLock as apiReleaseLock,
  releaseExpiredLocks,
  getNextUserColor,
  logPresentationActivity,
  getPresentationById,
  getPresentationByIdAdmin,
  uuidv4,
  convertTimestamps, // Import convertTimestamps
} from '@/lib/firestoreService';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { throttle } from 'lodash';
import { ShareDialog } from '@/components/editor/ShareDialog';
import { PasswordPromptDialog } from '@/components/editor/PasswordPromptDialog';
import { TemplateSelectionDialog } from '@/components/editor/TemplateSelectionDialog';
import { slideTemplates } from '@/lib/slideTemplates';
import { useIsMobile } from '@/hooks/use-mobile';

const LOCK_CHECK_INTERVAL = 15000;
const PRESENCE_UPDATE_INTERVAL = 30000;

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();
  const presentationId = params.id as string;

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<'properties' | 'ai' | null>(null); // Can be 'properties', 'ai', or null
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [collaboratorColor, setCollaboratorColor] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isTakenDown, setIsTakenDown] = useState(false);
  const [passwordVerifiedInSession, setPasswordVerifiedInSession] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<Slide | null>(null);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);

  const isMobile = useIsMobile();

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

  const checkAccessAndLoad = useCallback(async (presData: Presentation, user: AppUser | null) => {
    if (presData.moderationStatus === 'taken_down' && (!user || !user.isAppAdmin)) {
        setIsTakenDown(true);
        setAccessDenied(true);
        toast({ title: "Presentation Unavailable", description: "This presentation is currently unavailable.", variant: "destructive" });
        return false;
    }
    setIsTakenDown(false);

    let hasAccess = false;
    let accessMethod: PresentationActivity['details']['accessMethod'] = 'direct';

    if (presData.settings.isPublic) {
      accessMethod = 'public_link';
      if (presData.settings.passwordProtected) {
        const sessionVerified = sessionStorage.getItem(`passwordVerified_${presData.id}`) === 'true';
        setPasswordVerifiedInSession(sessionVerified);
        if (!sessionVerified) {
          setIsPasswordPromptOpen(true);
          setIsLoading(false);
          return false;
        }
      }
      hasAccess = true;
    } else if (user) {
      if (presData.creatorId === user.id || (presData.access && presData.access[user.id])) {
        hasAccess = true;
        accessMethod = presData.teamId === user.teamId && presData.creatorId !== user.id ? 'team_access' : 'direct';
      } else if (presData.teamId && presData.teamId === user.teamId) {
         hasAccess = true;
         accessMethod = 'team_access';
      }
    }

    if (hasAccess || (user && user.isAppAdmin)) {
      setAccessDenied(false);
      if (user && !(user.isAppAdmin && presData.creatorId !== user.id)) {
         logPresentationActivity(presData.id, user.id, 'presentation_viewed', { accessMethod });
      } else if (presData.settings.isPublic && !presData.settings.passwordProtected && !user) {
         logPresentationActivity(presData.id, 'guest', 'presentation_viewed', { accessMethod: 'public_link_anonymous' });
      }
      return true;
    } else {
      setAccessDenied(true);
      toast({ title: "Access Denied", description: "You don't have permission to view or edit this presentation.", variant: "destructive" });
      return false;
    }
  }, [toast]);


  useEffect(() => {
    if (!authLoading && !currentUser && !presentation?.settings.isPublic) {
      router.push('/login');
      return;
    }

    if (presentationId && collaboratorColor && (currentUser || presentation?.settings.isPublic || passwordVerifiedInSession)) {
      setIsLoading(true);

      const presRef = doc(db, 'presentations', presentationId);
      unsubscribePresentationListener.current = onSnapshot(presRef, async (docSnap) => {
        if (docSnap.exists()) {
          const rawFirestoreData = docSnap.data() as Omit<Presentation, 'id'>;
          const data = convertTimestamps(rawFirestoreData) as Omit<Presentation, 'id'>; // Convert Timestamps to JS Dates

          const presentationWithDefaults: Presentation = {
            id: docSnap.id,
            ...data, // Use converted data
            moderationStatus: data.moderationStatus || 'active',
            slides: (data.slides || []).map(slide => ({ // slide objects are now from converted data
              ...slide,
              backgroundColor: slide.backgroundColor || '#FFFFFF',
              backgroundImageUrl: slide.backgroundImageUrl || undefined,
              backgroundGradient: slide.backgroundGradient || null,
              elements: (slide.elements || []).map(el => ({ // el objects are now from converted data
                ...el,
                zIndex: el.zIndex === undefined ? 0 : el.zIndex,
                lockedBy: el.lockedBy || null,
                lockTimestamp: el.lockTimestamp || null, // Will be a JS Date if present
                rotation: el.rotation || 0,
                style: {
                  fontFamily: el.style?.fontFamily || 'PT Sans',
                  fontSize: el.style?.fontSize || '16px',
                  color: el.style?.color || '#000000',
                  backgroundColor: el.style?.backgroundColor || 'transparent',
                  textAlign: el.style?.textAlign || 'left',
                  fontWeight: el.style?.fontWeight || 'normal',
                  fontStyle: el.style?.fontStyle || 'normal',
                  textDecoration: el.style?.textDecoration || 'none',
                  opacity: el.style?.opacity === undefined ? 1 : el.style.opacity,
                  shapeType: el.style?.shapeType || 'rectangle',
                  borderColor: el.style?.borderColor,
                  borderWidth: el.style?.borderWidth,
                  borderRadius: el.style?.borderRadius,
                  ...el.style,
                }
              }))
            }))
          };
          setPresentation(presentationWithDefaults);

          const canView = await checkAccessAndLoad(presentationWithDefaults, currentUser);

          if (canView) {
            if (presentationWithDefaults.slides.length > 0 && (!currentSlideId || !presentationWithDefaults.slides.find(s => s.id === currentSlideId))) {
              setCurrentSlideId(presentationWithDefaults.slides[0].id);
            } else if (presentationWithDefaults.slides.length === 0) {
              setCurrentSlideId(null);
              setSelectedElementId(null);
            }
          }
          setIsLoading(false);
        } else {
          toast({ title: "Error", description: "Presentation not found.", variant: "destructive" });
          setAccessDenied(true);
          setIsLoading(false);
        }
      }, (error) => {
        console.error("Error fetching presentation with listener:", error);
        toast({ title: "Error", description: "Could not load presentation data.", variant: "destructive" });
        setAccessDenied(true);
        setIsLoading(false);
      });

      if (currentUser) {
        updateUserPresence(presentationId, currentUser.id, {
          name: currentUser.name || 'Anonymous',
          profilePictureUrl: currentUser.profilePictureUrl,
          color: collaboratorColor,
          email: currentUser.email || undefined,
        });

        if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = setInterval(() => {
          if (currentUser) {
            updateUserPresence(presentationId, currentUser.id, {
                name: currentUser.name || 'Anonymous',
                profilePictureUrl: currentUser.profilePictureUrl,
                color: collaboratorColor,
                email: currentUser.email || undefined,
            });
          }
        }, PRESENCE_UPDATE_INTERVAL);
      }


      if (lockCheckIntervalRef.current) clearInterval(lockCheckIntervalRef.current);
      lockCheckIntervalRef.current = setInterval(() => {
        releaseExpiredLocks(presentationId);
      }, LOCK_CHECK_INTERVAL);


      const handleBeforeUnload = () => {
        if (currentUser) removeUserPresence(presentationId, currentUser.id);
        if (presentation && currentSlideId && selectedElementId && currentUser) {
             apiReleaseLock(presentationId, currentSlideId, selectedElementId, currentUser.id);
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        if (unsubscribePresentationListener.current) {
          unsubscribePresentationListener.current();
        }
        if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
        if (lockCheckIntervalRef.current) clearInterval(lockCheckIntervalRef.current);
        if (currentUser) {
            removeUserPresence(presentationId, currentUser.id);
            if (presentation && currentSlideId && selectedElementId) {
                apiReleaseLock(presentationId, currentSlideId, selectedElementId, currentUser.id);
            }
        }
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentationId, currentUser, authLoading, collaboratorColor, checkAccessAndLoad, passwordVerifiedInSession]);

  const currentSlide = presentation?.slides.find(s => s.id === currentSlideId) || null;
  const selectedElement = currentSlide?.elements.find(el => el.id === selectedElementId) || null;

  const handleToolSelect = (tool: string | null) => {
    setSelectedTool(tool);
    if (tool === 'ai-design' || tool === 'ai-content' || (tool && tool.startsWith('ai-'))) {
      setIsRightPanelOpen('ai');
    } else if (tool === 'templates') {
      handleShowSlideTemplates();
    } else if (tool !== null && !selectedElement) { // If a creation tool is selected and no element is selected
      setIsRightPanelOpen(null); // Close panels to make space for potential canvas click
    } else if (selectedElement) {
       setIsRightPanelOpen('properties');
    }
  };

  const handleAction = (action: string) => {
     if (action === 'comments') {
       setIsRightPanelOpen(prev => prev === 'properties' && selectedElement === null ? null : 'properties');
    } else if (action === 'ai-panel') {
       setIsRightPanelOpen(prev => prev === 'ai' ? null : 'ai');
    } else if (action === 'share') {
      setIsShareDialogOpen(true);
    } else if (action === 'undo' || action === 'redo') {
        toast({ title: "Coming Soon!", description: `${action.charAt(0).toUpperCase() + action.slice(1)} functionality is under development.`, duration: 2000 });
    }
  };

  const handleSlideSelect = useCallback(async (slideId: string) => {
    if (selectedElementId && currentUser && currentSlideId) {
        await apiReleaseLock(presentationId, currentSlideId, selectedElementId, currentUser.id);
    }
    setCurrentSlideId(slideId);
    setSelectedElementId(null);
    setSelectedTool(null);
    setIsRightPanelOpen('properties'); // Default to properties (slide properties) when a slide is selected
  }, [presentationId, currentSlideId, selectedElementId, currentUser]);

 const handleElementSelect = useCallback(async (elementId: string | null) => {
    if (!currentUser || !currentSlideId || !presentation) return;

    if (selectedElementId && selectedElementId !== elementId) {
        const prevSelectedElement = presentation.slides.find(s => s.id === currentSlideId)?.elements.find(el => el.id === selectedElementId);
        if (prevSelectedElement && prevSelectedElement.lockedBy === currentUser.id) {
            await apiReleaseLock(presentationId, currentSlideId, selectedElementId, currentUser.id);
        }
    }

    setSelectedElementId(elementId);
    setSelectedTool(null);
    setIsRightPanelOpen(elementId ? 'properties' : 'properties'); // Always show properties panel, for element or slide

    if (elementId) {
        try {
            await apiAcquireLock(presentationId, currentSlideId, elementId, currentUser.id);
        } catch (error: any) {
            const currentLockerId = presentation.slides.find(s => s.id === currentSlideId)
                                      ?.elements.find(el => el.id === elementId)?.lockedBy;
            const lockerName = currentLockerId ? presentation.activeCollaborators?.[currentLockerId]?.name || "another user" : "another user";
            toast({ title: "Element Locked", description: `This element is currently being edited by ${lockerName}. You can view its properties.`, variant: "default", duration: 3000 });
        }
    }
}, [currentUser, currentSlideId, presentation, selectedElementId, presentationId, toast]);


  const handleAddSlide = async (elements?: Omit<SlideElement, 'id' | 'lockedBy' | 'lockTimestamp'>[]) => {
    if (!presentation || !currentUser) return;
    setIsSaving(true);
    try {
      const newSlideId = await apiAddSlide(presentation.id, { elements: elements?.length ? elements : undefined });
      toast({ title: "Slide Added", description: elements?.length ? "New slide from template created." : "New blank slide created." });
      setCurrentSlideId(newSlideId); // Switch to new slide
      setSelectedElementId(null);
      setIsRightPanelOpen('properties'); // Show slide properties for the new slide
      logPresentationActivity(presentation.id, currentUser.id, 'element_added', { elementType: 'slide', elementId: newSlideId });
    } catch (error: any) {
      console.error("Error adding slide:", error);
      toast({ title: "Error", description: error.message || "Could not add slide.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSlideFromTemplate = async (templateKey: string) => {
    const template = slideTemplates.find(t => t.key === templateKey);
    if (template) {
      await handleAddSlide(template.elements);
    } else {
      toast({title: "Error", description: "Template not found.", variant: "destructive"});
    }
    setShowTemplatesDialog(false);
  };

  const handleDeleteSlide = (slideIdToDelete: string) => {
    if (!presentation || !currentUser) return;
    const slide = presentation.slides.find(s => s.id === slideIdToDelete);
    if (!slide) return;
    setSlideToDelete(slide);
  };

  const confirmDeleteSlide = async () => {
    if (!presentation || !slideToDelete || !currentUser) return;
    setIsSaving(true);
    try {
      const updatedSlides = await apiDeleteSlide(presentation.id, slideToDelete.id);
      if (updatedSlides) {
        toast({ title: "Slide Deleted", description: `Slide ${slideToDelete.slideNumber} has been removed.` });
        logPresentationActivity(presentation.id, currentUser.id, 'element_deleted', { elementType: 'slide', elementId: slideToDelete.id });
        if (currentSlideId === slideToDelete.id) {
          if (updatedSlides.length > 0) {
            const currentIndex = presentation.slides.findIndex(s => s.id === slideToDelete.id);
            const nextSlideIndex = Math.max(0, Math.min(currentIndex -1, updatedSlides.length - 1));
            setCurrentSlideId(updatedSlides[nextSlideIndex]?.id || (updatedSlides[0]?.id || null));
          } else {
            setCurrentSlideId(null);
          }
          setSelectedElementId(null);
          setIsRightPanelOpen(null); // Close panel if current slide was deleted
        }
      } else {
         toast({ title: "Error", description: "Slide not found or could not be deleted.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error deleting slide:", error);
      toast({ title: "Error", description: error.message || "Could not delete slide.", variant: "destructive" });
    } finally {
      setIsSaving(false);
      setSlideToDelete(null);
    }
  };

  const handleDuplicateSlide = async (slideIdToDuplicate: string) => {
    if (!presentation || !currentUser) return;
    setIsSaving(true);
    try {
      const result = await apiDuplicateSlide(presentation.id, slideIdToDuplicate);
      if (result && result.newSlideId) {
        toast({ title: "Slide Duplicated", description: "Slide has been duplicated." });
        setCurrentSlideId(result.newSlideId);
        setSelectedElementId(null);
        setIsRightPanelOpen('properties'); // Show properties for new duplicated slide
        logPresentationActivity(presentation.id, currentUser.id, 'element_added', { elementType: 'slide', elementId: result.newSlideId, duplicatedFrom: slideIdToDuplicate });
      } else {
        toast({ title: "Error", description: "Could not duplicate slide.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error duplicating slide:", error);
      toast({ title: "Error", description: error.message || "Could not duplicate slide.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveSlide = async (slideId: string, direction: 'up' | 'down') => {
    if (!presentation || !currentUser) return;
    setIsSaving(true);
    try {
      const updatedSlides = await apiMoveSlide(presentation.id, slideId, direction);
      if (updatedSlides) {
        toast({ title: "Slide Moved", description: "Slide order updated."});
      } else {
        toast({ title: "Error", description: "Could not move slide or no change made.", variant: "default" });
      }
    } catch (error: any) {
       console.error("Error moving slide:", error);
       toast({ title: "Error Moving Slide", description: error.message || "Could not move slide.", variant: "destructive"});
    } finally {
       setIsSaving(false);
    }
  };

  const handleShowSlideTemplates = () => {
    setShowTemplatesDialog(true);
    setSelectedTool(null);
    setIsRightPanelOpen(null); // Close other panels when template dialog opens
  };

  const handleAddElement = async (position: {x: number, y: number}) => {
    if (!presentation || !currentSlideId || !selectedTool || !currentUser) return;
    if (selectedTool.startsWith('ai-') || selectedTool === 'templates') return;

    let newElementPartial: Omit<SlideElement, 'id'> = {
        type: 'text' as SlideElementType,
        content: '',
        position,
        size: { width: 150, height: 50 },
        style: { fontFamily: 'PT Sans', fontSize: '16px', color: '#333333', backgroundColor: 'transparent', textAlign: 'left', opacity: 1 },
        zIndex: (currentSlide?.elements.length || 0) + 1,
        rotation: 0,
        lockedBy: null,
        lockTimestamp: null,
    };

    if (selectedTool === 'text') {
        newElementPartial.type = 'text';
        newElementPartial.content = 'New Text';
        newElementPartial.size = { width: 200, height: 40 };
    } else if (selectedTool === 'image') {
        newElementPartial.type = 'image';
        newElementPartial.content = 'https://placehold.co/300x200.png?text=New+Image';
        (newElementPartial.style as any)['data-ai-hint'] = 'abstract image';
        newElementPartial.size = { width: 300, height: 200 };
    } else if (selectedTool === 'shape-rectangle') {
        newElementPartial.type = 'shape';
        newElementPartial.style = { ...newElementPartial.style, shapeType: 'rectangle', backgroundColor: '#CCCCCC', borderColor: '#666666', borderWidth: 1 };
    } else if (selectedTool === 'shape-circle') {
        newElementPartial.type = 'shape';
        newElementPartial.style = { ...newElementPartial.style, shapeType: 'circle', backgroundColor: '#CCCCCC', borderColor: '#666666', borderWidth: 1 };
        newElementPartial.size = { width: 100, height: 100 };
    } else if (selectedTool === 'chart') {
        newElementPartial.type = 'chart';
        newElementPartial.content = { type: 'bar', data: {}, label: 'New Chart' } as ChartContent;
        newElementPartial.size = { width: 400, height: 300 };
    } else if (selectedTool === 'icon') {
        newElementPartial.type = 'icon';
        newElementPartial.content = { name: 'smile' } as IconContent;
        newElementPartial.style = { ...newElementPartial.style, color: '#333333', fontSize: '48px' };
        newElementPartial.size = { width: 60, height: 60 };
    } else {
        return;
    }

    try {
        const newElementId = await apiAddElementToSlide(presentation.id, currentSlideId, newElementPartial);
        await handleElementSelect(newElementId);
        logPresentationActivity(presentation.id, currentUser.id, 'element_added', { elementType: newElementPartial.type, elementId: newElementId });
    } catch (error: any) {
        console.error("Error adding element:", error);
        toast({ title: "Error Adding Element", description: error.message || "Could not add the element.", variant: "destructive" });
    }
    setSelectedTool(null);
  };

  const handleDeleteElement = async (elementId: string) => {
    if (!presentation || !currentSlideId || !currentUser) return;
     const elementToDelete = currentSlide?.elements.find(el => el.id === elementId);
    if (!elementToDelete) return;

    if (elementToDelete.lockedBy && elementToDelete.lockedBy !== currentUser.id) {
        const lockerName = presentation.activeCollaborators?.[elementToDelete.lockedBy!]?.name || "another user";
        toast({ title: "Delete Failed", description: `Element is locked by ${lockerName}.`, variant: "destructive" });
        return;
    }

    try {
        await apiDeleteElementFromSlide(presentation.id, currentSlideId, elementId);
        toast({ title: "Element Deleted" });
        logPresentationActivity(presentation.id, currentUser.id, 'element_deleted', { elementType: elementToDelete.type, elementId });
        if (selectedElementId === elementId) {
            setSelectedElementId(null);
            setIsRightPanelOpen(null); // Close properties panel
        }
    } catch (error: any) {
        console.error("Error deleting element:", error);
        toast({ title: "Error Deleting Element", description: error.message || "Could not delete element.", variant: "destructive" });
    }
  };


  const handleUpdateElement = useCallback(async (updatedElementPartial: Partial<SlideElement>) => {
    if (!presentation || !currentSlideId || !updatedElementPartial.id || !currentUser) return;

    const targetElement = presentation.slides.find(s => s.id === currentSlideId)?.elements.find(el => el.id === updatedElementPartial.id);
    if (targetElement && targetElement.lockedBy && targetElement.lockedBy !== currentUser.id) {
        const locker = presentation.activeCollaborators?.[targetElement.lockedBy!]?.name || "another user";
        toast({ title: "Update Failed", description: `Element is locked by ${locker}.`, variant: "destructive" });
        return;
    }
    try {
      await apiUpdateElement(presentation.id, currentSlideId, updatedElementPartial);
      logPresentationActivity(presentation.id, currentUser.id, 'element_updated', { elementId: updatedElementPartial.id, elementType: targetElement?.type });
    } catch (error: any) {
      console.error("Error updating element:", error);
      toast({ title: "Sync Error", description: error.message || "Could not save element change.", variant: "destructive" });
    }
  }, [presentation, currentSlideId, toast, currentUser]);

  const handleAddComment = async (text: string) => {
    if (!presentation || !currentSlideId || !currentUser) return;
    setIsSaving(true);
    const newCommentData: Omit<SlideComment, 'id' | 'createdAt'> = {
      userId: currentUser.id,
      userName: currentUser.name || 'Anonymous',
      userAvatarUrl: currentUser.profilePictureUrl || `https://placehold.co/40x40.png?text=${(currentUser.name || 'A').charAt(0).toUpperCase()}`,
      text,
      resolved: false,
    };
    try {
      await apiAddComment(presentation.id, currentSlideId, newCommentData);
      toast({ title: "Comment Added"});
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast({ title: "Error", description: error.message || "Could not post comment.", variant: "destructive" });
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
    } catch (error: any) {
      console.error("Error resolving comment:", error);
      toast({ title: "Error", description: error.message || "Could not resolve comment.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePresentationTitle = async () => {
    if (!presentation || !currentUser) return;
    setIsSaving(true);
    try {
      await apiUpdatePresentation(presentation.id, {
        title: presentation.title,
      });
      toast({ title: "Presentation Title Saved", description: "Your title change has been saved."});
      logPresentationActivity(presentation.id, currentUser.id, 'sharing_settings_updated', { changedProperty: 'title' });
    } catch (error: any) {
      console.error("Error saving presentation title:", error);
      toast({ title: "Save Error", description: error.message || "Could not save presentation title.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSlideProperties = async (updates: { backgroundColor?: string; backgroundImageUrl?: string | null, backgroundGradient?: SlideBackgroundGradient | null }) => {
    if (!presentation || !currentSlideId || !currentUser) return;

    const updatedSlides = presentation.slides.map(s => {
        if (s.id === currentSlideId) {
            const newProps: Partial<Slide> = {};
            if (updates.hasOwnProperty('backgroundColor')) {
                newProps.backgroundColor = updates.backgroundColor;
                if (updates.backgroundColor !== undefined) { // If solid color is set, clear others
                    newProps.backgroundImageUrl = undefined;
                    newProps.backgroundGradient = null;
                }
            }
            if (updates.hasOwnProperty('backgroundImageUrl')) {
                newProps.backgroundImageUrl = updates.backgroundImageUrl === null ? undefined : updates.backgroundImageUrl;
                 if (updates.backgroundImageUrl !== null) { // If image is set, clear others
                    newProps.backgroundColor = undefined;
                    newProps.backgroundGradient = null;
                }
            }
            if (updates.hasOwnProperty('backgroundGradient')) {
                newProps.backgroundGradient = updates.backgroundGradient;
                 if (updates.backgroundGradient !== null) { // If gradient is set, clear others
                    newProps.backgroundColor = undefined;
                    newProps.backgroundImageUrl = undefined;
                }
            }
            return { ...s, ...newProps };
        }
        return s;
    });

    try {
        await apiUpdatePresentation(presentation.id, { slides: updatedSlides });
        logPresentationActivity(presentation.id, currentUser.id, 'slide_background_updated', {
            slideId: currentSlideId,
            newColor: updates.backgroundColor,
            newImage: updates.backgroundImageUrl,
            newGradient: updates.backgroundGradient,
        });
    } catch (e: any) {
        console.error("Error updating slide properties:", e);
        toast({title: "Error", description: e.message || "Could not update slide properties.", variant: "destructive"})
    }
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

  const handleAddImageElementFromAI = async (iconDataUri: string, description: string) => {
    if (!presentation || !currentSlideId || !currentUser) return;
    const newElementPartial: Omit<SlideElement, 'id'> = {
        type: 'image',
        content: iconDataUri,
        position: { x: 50, y: 50 },
        size: { width: 60, height: 60 },
        style: { (('data-ai-hint' as any)): description, opacity: 1, backgroundColor: 'transparent' },
        zIndex: (currentSlide?.elements.length || 0) + 1,
        rotation: 0,
        lockedBy: null,
        lockTimestamp: null,
    };
    try {
        const newElementId = await apiAddElementToSlide(presentation.id, currentSlideId, newElementPartial);
        await handleElementSelect(newElementId);
        logPresentationActivity(presentation.id, currentUser.id, 'element_added', { elementType: 'image', elementId: newElementId, source: 'ai_icon_generation' });
    } catch (error: any) {
        console.error("Error adding AI generated icon:", error);
        toast({ title: "Error Adding Icon", description: error.message || "Could not add the icon.", variant: "destructive" });
    }
  };

  const handleAddChartElementFromAI = async (suggestedConfig: SuggestedChartConfig) => {
    if (!presentation || !currentSlideId || !currentUser) return;
    const newElementPartial: Omit<SlideElement, 'id'> = {
        type: 'chart',
        content: {
            type: suggestedConfig.chartType,
            data: {},
            label: suggestedConfig.titleSuggestion || 'New Chart',
            aiSuggestionNotes: `Data Mapping: ${suggestedConfig.dataMapping}\nAdditional Notes: ${suggestedConfig.additionalNotes || 'None'}`,
        } as ChartContent,
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        style: { opacity: 1 },
        zIndex: (currentSlide?.elements.length || 0) + 1,
        rotation: 0,
        lockedBy: null,
        lockTimestamp: null,
    };
    try {
        const newElementId = await apiAddElementToSlide(presentation.id, currentSlideId, newElementPartial);
        await handleElementSelect(newElementId);
        logPresentationActivity(presentation.id, currentUser.id, 'element_added', { elementType: 'chart', elementId: newElementId, source: 'ai_chart_suggestion' });
    } catch (error: any) {
        console.error("Error adding AI suggested chart:", error);
        toast({ title: "Error Adding Chart", description: error.message || "Could not add the chart.", variant: "destructive" });
    }
  };

  const handleApplyAIBackgroundToSlide = (imageUrl: string) => {
    if (currentSlideId) {
        handleUpdateSlideProperties({ backgroundImageUrl: imageUrl, backgroundGradient: null, backgroundColor: undefined });
    }
  };


  const handlePasswordVerified = async () => {
    setPasswordVerifiedInSession(true);
    sessionStorage.setItem(`passwordVerified_${presentationId}`, 'true');
    setIsPasswordPromptOpen(false);
    setIsLoading(true);

    const presDataToLog = presentation || await getPresentationByIdAdmin(presentationId);

    if (presDataToLog && currentUser) {
        logPresentationActivity(presDataToLog.id, currentUser.id, 'presentation_viewed', { accessMethod: 'public_link_password' });
    } else if (presDataToLog) {
        logPresentationActivity(presDataToLog.id, 'guest_password_verified', 'presentation_viewed', { accessMethod: 'public_link_password' });
    }

    setIsLoading(false);
  };

  const mobileSheetOpen = isMobile && isRightPanelOpen !== null;
  const mobileSheetContentKey = isRightPanelOpen === 'ai' ? 'ai-panel' : (selectedElementId ? 'properties-panel' : 'slide-properties-panel');


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

  if (isPasswordPromptOpen && presentation) {
    return (
        <>
            <SiteHeader />
            <PasswordPromptDialog
                presentationId={presentation.id}
                isOpen={isPasswordPromptOpen}
                onOpenChange={setIsPasswordPromptOpen}
                onPasswordVerified={handlePasswordVerified}
            />
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="mt-2 text-muted-foreground">Awaiting password...</p>
            </div>
        </>
    );
  }

  if (isTakenDown) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <SiteHeader />
        <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
            <ShieldX className="w-16 h-16 text-destructive mb-4" />
            <h1 className="font-headline text-3xl mb-2">Presentation Unavailable</h1>
            <p className="text-muted-foreground mb-6">This presentation has been taken down by an administrator.</p>
            <Button onClick={() => router.push('/dashboard')}>
                <Home className="mr-2 h-4 w-4" /> Go to Dashboard
            </Button>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <SiteHeader />
        <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
            <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="font-headline text-3xl mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">You do not have permission to view this presentation, or it could not be found.</p>
            <Button onClick={() => router.push('/dashboard')}>
                <Home className="mr-2 h-4 w-4" /> Go to Dashboard
            </Button>
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
            onBlur={handleSavePresentationTitle}
            className="font-headline text-xl font-semibold leading-tight bg-transparent border-none focus:ring-0 p-0 w-full max-w-xs sm:max-w-md"
            disabled={isSaving || !currentUser || (presentation?.creatorId !== currentUser.id && presentation?.access[currentUser.id] !== 'owner' && presentation?.access[currentUser.id] !== 'editor')}
          />
          <p className="text-xs text-muted-foreground">
            {presentation?.version ? `Version ${presentation.version} - ` : ''}
            Last server update: {presentation?.lastUpdatedAt ? presentation.lastUpdatedAt.toLocaleTimeString() : 'Syncing...'}
            {isSaving && <Loader2 className="inline-block ml-2 h-3 w-3 animate-spin" />}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {currentUser && <CollaborationBar activeCollaborators={presentation?.activeCollaborators || {}} currentUser={currentUser} />}
        <Button variant="outline" size="sm" onClick={() => handleAction('share')}>
            <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Editor Menu">
                    <FileText className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleSavePresentationTitle} disabled={isSaving}><Save className="mr-2 h-4 w-4" /> Save Title Now</DropdownMenuItem>
                <DropdownMenuItem disabled><RotateCcw className="mr-2 h-4 w-4" /> Version History</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)}><Users className="mr-2 h-4 w-4" /> Manage Collaborators</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );


  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <EditorHeader />
      <EditorToolbar
        presentationId={presentationId}
        onToolSelect={handleToolSelect}
        onAction={handleAction}
        onShowSlideTemplates={handleShowSlideTemplates}
        selectedTool={selectedTool}
      />
      <div className="flex flex-grow overflow-hidden">
        <SlideThumbnailList
          slides={presentation?.slides || []}
          currentSlideId={currentSlideId}
          onSlideSelect={handleSlideSelect}
          onAddSlide={() => handleAddSlide()}
          onDeleteSlide={handleDeleteSlide}
          onDuplicateSlide={handleDuplicateSlide}
          onMoveSlide={handleMoveSlide}
          disabled={isSaving || !isOnline || !currentUser || (presentation?.creatorId !== currentUser.id && presentation?.access[currentUser.id] !== 'owner' && presentation?.access[currentUser.id] !== 'editor')}
        />
        <EditorCanvas
            slide={currentSlide}
            onElementSelect={handleElementSelect}
            onCanvasClickToAddElement={handleAddElement}
            selectedElementId={selectedElementId}
            onUpdateElement={handleUpdateElement}
            disabled={isSaving || !isOnline || !currentUser || (presentation?.creatorId !== currentUser.id && presentation?.access[currentUser.id] !== 'owner' && presentation?.access[currentUser.id] !== 'editor')}
            activeCollaborators={presentation?.activeCollaborators || {}}
            currentUser={currentUser}
            onMouseMove={handleMouseMoveOnCanvas}
            canvasBaseWidth={960}
            canvasBaseHeight={540}
            selectedTool={selectedTool}
        />

        {/* Desktop Right Panels */}
        {!isMobile && isRightPanelOpen === 'properties' && currentSlide && currentUser && (
           <PropertiesPanel
              selectedElement={selectedElement}
              currentSlide={currentSlide}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onAddComment={handleAddComment}
              onResolveComment={handleResolveComment}
              onUpdateSlideProperties={handleUpdateSlideProperties}
              disabled={isSaving || !isOnline || (presentation?.creatorId !== currentUser.id && presentation?.access[currentUser.id] !== 'owner' && presentation?.access[currentUser.id] !== 'editor')}
              currentUserId={currentUser.id}
            />
        )}
        {!isMobile && isRightPanelOpen === 'ai' && (
          <AIAssistantPanel
            currentSlide={currentSlide}
            currentPresentation={presentation}
            selectedElement={selectedElement}
            onApplyAITextUpdate={handleApplyAITextUpdate}
            onApplyAISpeakerNotes={handleApplyAISpeakerNotes}
            onAddImageElementFromAI={handleAddImageElementFromAI}
            onAddChartElementFromAI={handleAddChartElementFromAI}
            onApplyAIBackgroundToSlide={handleApplyAIBackgroundToSlide}
          />
        )}
      </div>

      {/* Mobile Panels as Bottom Sheet */}
      {isMobile && (
        <Sheet open={mobileSheetOpen} onOpenChange={(open) => { if (!open) setIsRightPanelOpen(null); }}>
          <SheetContent side="bottom" className="h-[75vh] flex flex-col p-0" key={mobileSheetContentKey}>
            {isRightPanelOpen === 'ai' && (
              <>
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary" /> AI Assistant</SheetTitle>
                </SheetHeader>
                <div className="flex-grow overflow-auto">
                  <AIAssistantPanel
                    currentSlide={currentSlide}
                    currentPresentation={presentation}
                    selectedElement={selectedElement}
                    onApplyAITextUpdate={handleApplyAITextUpdate}
                    onApplyAISpeakerNotes={handleApplyAISpeakerNotes}
                    onAddImageElementFromAI={handleAddImageElementFromAI}
                    onAddChartElementFromAI={handleAddChartElementFromAI}
                    onApplyAIBackgroundToSlide={handleApplyAIBackgroundToSlide}
                  />
                </div>
              </>
            )}
            {isRightPanelOpen === 'properties' && currentSlide && currentUser && (
              <>
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center">
                    {selectedElement ? <Settings className="mr-2 h-5 w-5 text-primary" /> : <MessageSquare className="mr-2 h-5 w-5 text-primary" />}
                    {selectedElement ? 'Element Properties' : 'Slide Properties & Comments'}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-grow overflow-auto">
                   <PropertiesPanel
                      selectedElement={selectedElement}
                      currentSlide={currentSlide}
                      onUpdateElement={handleUpdateElement}
                      onDeleteElement={handleDeleteElement}
                      onAddComment={handleAddComment}
                      onResolveComment={handleResolveComment}
                      onUpdateSlideProperties={handleUpdateSlideProperties}
                      disabled={isSaving || !isOnline || (presentation?.creatorId !== currentUser.id && presentation?.access[currentUser.id] !== 'owner' && presentation?.access[currentUser.id] !== 'editor')}
                      currentUserId={currentUser.id}
                    />
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      )}

      {presentation && currentUser && (
        <ShareDialog
            presentation={presentation}
            isOpen={isShareDialogOpen}
            onOpenChange={setIsShareDialogOpen}
            onPresentationUpdated={(updatedPres) => setPresentation(updatedPres)}
            currentUser={currentUser}
        />
      )}
      {presentation && isPasswordPromptOpen && !passwordVerifiedInSession && (
         <PasswordPromptDialog
            presentationId={presentation.id}
            isOpen={isPasswordPromptOpen}
            onOpenChange={setIsPasswordPromptOpen}
            onPasswordVerified={handlePasswordVerified}
        />
      )}
      {slideToDelete && (
        <AlertDialog open={!!slideToDelete} onOpenChange={(open) => !open && setSlideToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center"><Trash2 className="mr-2 h-5 w-5 text-destructive"/>Delete Slide {slideToDelete.slideNumber || ''}?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the slide and its content.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSlideToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteSlide} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    Delete Slide
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
      <TemplateSelectionDialog
        isOpen={showTemplatesDialog}
        onOpenChange={setShowTemplatesDialog}
        onSelectTemplate={handleAddSlideFromTemplate}
      />
    </div>
  );
}
