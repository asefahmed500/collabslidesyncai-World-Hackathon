
import { db } from './firebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  Timestamp,
  writeBatch,
  FieldValue,
  deleteField,
} from 'firebase/firestore';
import type { Presentation, Slide, SlideElement, SlideComment, User, Team, ActiveCollaboratorInfo } from '@/types';

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#2AB7CA',
  '#F0B67F', '#8A6EAF', '#A3D9FF', '#FF9671', '#C44569'
];
let userColorIndex = 0;

const getNextUserColor = () => {
  const color = USER_COLORS[userColorIndex % USER_COLORS.length];
  userColorIndex++;
  return color;
};


const convertTimestamps = (data: any): any => {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Timestamp) {
    return data.toDate();
  }
  if (Array.isArray(data)) {
    return data.map(convertTimestamps);
  }
  const converted: { [key: string]: any } = {};
  for (const key in data) {
    converted[key] = convertTimestamps(data[key]);
  }
  return converted;
};

const usersCollection = collection(db, 'users');
const teamsCollection = collection(db, 'teams');
const presentationsCollection = collection(db, 'presentations');

export async function createTeam(teamName: string, ownerId: string, ownerName: string): Promise<string> {
  const newTeamData: Omit<Team, 'id'> = {
    name: teamName,
    ownerId: ownerId,
    memberIds: [ownerId],
    branding: {
      colors: ['#3F51B5', '#FFC107', '#4CAF50'],
      fonts: ['Space Grotesk', 'PT Sans'],
      logoUrl: `https://placehold.co/200x100.png?text=${teamName.charAt(0).toUpperCase()}`
    },
    settings: {
      allowGuestEdits: false,
      aiFeaturesEnabled: true,
    },
    createdAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(teamsCollection, newTeamData);
  return docRef.id;
}

export async function createPresentation(userId: string, title: string, teamId?: string, description: string = ''): Promise<string> {
  const initialSlideId = `slide-initial-${Date.now()}`;
  const newSlide: Omit<Slide, 'presentationId'> = {
    id: initialSlideId,
    slideNumber: 1,
    elements: [{
      id: `elem-${initialSlideId}-1`,
      type: 'text',
      content: `Welcome to '${title}'!`,
      position: { x: 50, y: 50 },
      size: { width: 700, height: 100 },
      style: { fontFamily: 'Space Grotesk', fontSize: '36px', color: '#333333', backgroundColor: 'transparent' },
      zIndex: 1,
    }],
    speakerNotes: "",
    comments: [],
    thumbnailUrl: `https://placehold.co/160x90.png?text=S1`,
    backgroundColor: '#FFFFFF',
  };
  
  const newPresentationData: Omit<Presentation, 'id' | 'slides' | 'activeCollaborators'> & { slides: Omit<Slide, 'presentationId'>[] } = {
    title,
    description,
    creatorId: userId,
    teamId: teamId || '',
    access: { [userId]: 'owner' },
    settings: {
      isPublic: false,
      passwordProtected: false,
      commentsAllowed: true,
    },
    thumbnailUrl: `https://placehold.co/320x180.png?text=${title.substring(0,10)}`,
    version: 1,
    createdAt: serverTimestamp() as Timestamp,
    lastUpdatedAt: serverTimestamp() as Timestamp,
    slides: [newSlide],
  };

  const docRef = await addDoc(presentationsCollection, newPresentationData);
  
  const finalSlide: Slide = {
    ...newSlide,
    presentationId: docRef.id,
  };
  await updateDoc(docRef, { slides: [finalSlide], lastUpdatedAt: serverTimestamp() });
  
  return docRef.id;
}

export async function getPresentationsForUser(userId: string): Promise<Presentation[]> {
  const user = await getUserProfile(userId);
  if (!user) return [];

  const queries = [];
  queries.push(query(presentationsCollection, where('creatorId', '==', userId)));
  queries.push(query(presentationsCollection, where(`access.${userId}`, 'in', ['owner', 'editor', 'viewer'])));
  
  if (user.teamId) {
    queries.push(query(presentationsCollection, where('teamId', '==', user.teamId)));
  }

  const allSnapshots = await Promise.all(queries.map(q => getDocs(q)));
  
  const presentationsMap = new Map<string, Presentation>();
  allSnapshots.forEach(snapshot => {
    snapshot.docs.forEach(docSnap => {
      if (!presentationsMap.has(docSnap.id)) {
        presentationsMap.set(docSnap.id, { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Presentation);
      }
    });
  });
  
  return Array.from(presentationsMap.values());
}


export async function getPresentationById(presentationId: string): Promise<Presentation | null> {
  const docRef = doc(db, 'presentations', presentationId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Presentation;
  }
  return null;
}

export async function updatePresentation(presentationId: string, data: Partial<Presentation>): Promise<void> {
  const docRef = doc(db, 'presentations', presentationId);
  if (data.slides) {
    data.slides = data.slides.map(slide => ({
      ...slide,
      elements: slide.elements.map(el => ({
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
    }));
  }
  await updateDoc(docRef, { ...data, lastUpdatedAt: serverTimestamp() });
}

export async function deletePresentation(presentationId: string): Promise<void> {
  const docRef = doc(db, 'presentations', presentationId);
  await deleteDoc(docRef);
}

export async function addSlideToPresentation(presentationId: string, newSlideData: Partial<Omit<Slide, 'id' | 'presentationId' | 'slideNumber'>> = {}): Promise<string> {
  const presRef = doc(db, 'presentations', presentationId);
  const presDoc = await getDoc(presRef);

  if (!presDoc.exists()) {
    throw new Error("Presentation not found");
  }
  const presentation = presDoc.data() as Presentation;
  const slideId = `slide-${presentationId}-${Date.now()}`;
  const slideNumber = (presentation.slides?.length || 0) + 1;

  const defaultElementId = `elem-${slideId}-default-${Date.now()}`;
  const defaultElement: SlideElement = {
    id: defaultElementId,
    type: 'text',
    content: `Slide ${slideNumber}`,
    position: { x: 50, y: 50 },
    size: { width: 400, height: 50 },
    style: { fontFamily: 'Space Grotesk', fontSize: '24px', color: '#333333', backgroundColor: 'transparent' },
    zIndex: 1,
  };

  const newSlide: Slide = {
    id: slideId,
    presentationId: presentationId,
    slideNumber: slideNumber,
    elements: newSlideData.elements || [defaultElement],
    speakerNotes: newSlideData.speakerNotes || "",
    comments: newSlideData.comments || [],
    thumbnailUrl: newSlideData.thumbnailUrl || `https://placehold.co/160x90.png?text=S${slideNumber}`,
    backgroundColor: newSlideData.backgroundColor || '#FFFFFF',
    aiSuggestions: newSlideData.aiSuggestions || [],
  };

  await updateDoc(presRef, {
    slides: arrayUnion(newSlide),
    lastUpdatedAt: serverTimestamp()
  });
  return slideId;
}

export async function updateElementInSlide(presentationId: string, slideId: string, updatedElementPartial: Partial<SlideElement>): Promise<void> {
  if (!updatedElementPartial.id) {
    console.error("updateElementInSlide called without element ID");
    return;
  }
  const presRef = doc(db, 'presentations', presentationId);
  // This operation should ideally be part of a transaction if multiple users can update elements concurrently.
  // For simplicity, we'll do a read-then-write, relying on element locking to prevent direct conflicts.
  const presDoc = await getDoc(presRef);

  if (presDoc.exists()) {
    const presentationData = presDoc.data() as Presentation;
    let slideFound = false;
    const updatedSlides = presentationData.slides.map(s => {
      if (s.id === slideId) {
        slideFound = true;
        let elementFound = false;
        const newElements = s.elements.map(el => {
          if (el.id === updatedElementPartial.id) {
            elementFound = true;
            return { 
                ...el, 
                ...updatedElementPartial,
                style: { 
                    ...(el.style || {}),
                    ...(updatedElementPartial.style || {}),
                    fontFamily: updatedElementPartial.style?.fontFamily || el.style?.fontFamily || 'PT Sans',
                    fontSize: updatedElementPartial.style?.fontSize || el.style?.fontSize || '16px',
                    color: updatedElementPartial.style?.color || el.style?.color || '#000000',
                    backgroundColor: updatedElementPartial.style?.backgroundColor || el.style?.backgroundColor || 'transparent',
                },
                zIndex: updatedElementPartial.zIndex === undefined ? (el.zIndex === undefined ? 0 : el.zIndex) : updatedElementPartial.zIndex,
             };
          }
          return el;
        });
        if (!elementFound) {
            console.warn(`Element with ID ${updatedElementPartial.id} not found in slide ${slideId}`);
        }
        return { ...s, elements: newElements };
      }
      return s;
    });

    if (!slideFound) {
        console.warn(`Slide with ID ${slideId} not found in presentation ${presentationId}`);
        return;
    }

    await updateDoc(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
  } else {
    console.error(`Presentation with ID ${presentationId} not found.`);
  }
}

export async function addCommentToSlide(presentationId: string, slideId: string, comment: Omit<SlideComment, 'id' | 'createdAt'>): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const presDoc = await getDoc(presRef);
  if (presDoc.exists()) {
    const presentationData = presDoc.data() as Presentation;
    const slides = (presentationData?.slides || []);
    const slideIndex = slides.findIndex(s => s.id === slideId);
    
    if (slideIndex > -1) {
        const newComment: SlideComment = {
            ...comment,
            id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            createdAt: serverTimestamp() as Timestamp,
        };
        const updatedSlides = [...slides];
        const targetSlide = {...updatedSlides[slideIndex]};
        targetSlide.comments = [...(targetSlide.comments || []), newComment];
        updatedSlides[slideIndex] = targetSlide;
        
        await updateDoc(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    } else {
        console.warn(`Slide with ID ${slideId} not found in presentation ${presentationId}`);
    }
  }
}

export async function resolveCommentOnSlide(presentationId: string, slideId: string, commentId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const presDoc = await getDoc(presRef);
  if (presDoc.exists()) {
    const presentationData = presDoc.data() as Presentation;
    const slides = (presentationData?.slides || []);
    const slideIndex = slides.findIndex(s => s.id === slideId);

    if (slideIndex > -1) {
        const updatedSlides = [...slides];
        const targetSlide = {...updatedSlides[slideIndex]};
        targetSlide.comments = (targetSlide.comments || []).map(c => c.id === commentId ? { ...c, resolved: true } : c);
        updatedSlides[slideIndex] = targetSlide;
        await updateDoc(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    }
  }
}

export async function getUserProfile(userId: string): Promise<User | null> {
    const userRef = doc(usersCollection, userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = convertTimestamps(userSnap.data());
        return { id: userSnap.id, ...userData } as User;
    }
    return null;
}

export async function updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
    const userRef = doc(usersCollection, userId);
    await updateDoc(userRef, {...data, lastActive: serverTimestamp()});
}

// --- Collaboration Features ---

export async function updateUserPresence(presentationId: string, userId: string, userInfo: Pick<ActiveCollaboratorInfo, 'name' | 'profilePictureUrl' | 'color'>): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const collaboratorPath = `activeCollaborators.${userId}`;
  await updateDoc(presRef, {
    [collaboratorPath]: {
      ...userInfo,
      id: userId,
      lastSeen: serverTimestamp(),
      cursorPosition: null, // Initialize cursor position
    },
    lastUpdatedAt: serverTimestamp() 
  });
}

export async function removeUserPresence(presentationId: string, userId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const collaboratorPath = `activeCollaborators.${userId}`;
  await updateDoc(presRef, {
    [collaboratorPath]: deleteField(), // Removes the field for this user
    lastUpdatedAt: serverTimestamp()
  });
}

export async function updateUserCursorPosition(presentationId: string, userId: string, slideId: string, position: { x: number; y: number }): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const cursorPath = `activeCollaborators.${userId}.cursorPosition`;
  const lastSeenPath = `activeCollaborators.${userId}.lastSeen`;
  await updateDoc(presRef, {
    [cursorPath]: { slideId, ...position },
    [lastSeenPath]: serverTimestamp()
    // No need to update presentation's lastUpdatedAt for just cursor moves to avoid too many writes
  });
}

const LOCK_DURATION_MS = 30 * 1000; // 30 seconds for a lock

export async function acquireLock(presentationId: string, slideId: string, elementId: string, userId: string): Promise<boolean> {
  const presRef = doc(db, 'presentations', presentationId);
  const batch = writeBatch(db);

  try {
    const presDoc = await getDoc(presRef);
    if (!presDoc.exists()) return false;

    const presentation = presDoc.data() as Presentation;
    const slides = presentation.slides.map(s => {
      if (s.id === slideId) {
        return {
          ...s,
          elements: s.elements.map(el => {
            if (el.id === elementId) {
              // Check if already locked by someone else and lock is not expired
              if (el.lockedBy && el.lockedBy !== userId && el.lockTimestamp && (el.lockTimestamp.toMillis() + LOCK_DURATION_MS > Date.now())) {
                throw new Error("Element already locked by another user.");
              }
              // Acquire or renew lock
              return { ...el, lockedBy: userId, lockTimestamp: serverTimestamp() };
            }
            return el;
          })
        };
      }
      return s;
    });

    batch.update(presRef, { slides: slides, lastUpdatedAt: serverTimestamp() });
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Failed to acquire lock:", error);
    return false;
  }
}

export async function releaseLock(presentationId: string, slideId: string, elementId: string, userId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const batch = writeBatch(db);
  try {
    const presDoc = await getDoc(presRef);
    if (!presDoc.exists()) return;

    const presentation = presDoc.data() as Presentation;
    const slides = presentation.slides.map(s => {
      if (s.id === slideId) {
        return {
          ...s,
          elements: s.elements.map(el => {
            if (el.id === elementId && el.lockedBy === userId) {
              // Only release if locked by the current user
              return { ...el, lockedBy: null, lockTimestamp: null };
            }
            return el;
          })
        };
      }
      return s;
    });

    batch.update(presRef, { slides: slides, lastUpdatedAt: serverTimestamp() });
    await batch.commit();
  } catch (error) {
    console.error("Failed to release lock:", error);
  }
}

// Function to periodically release expired locks (could be run by a Firebase Function or client-side occasionally)
export async function releaseExpiredLocks(presentationId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const presDoc = await getDoc(presRef);

  if (presDoc.exists()) {
    const presentation = presDoc.data() as Presentation;
    let locksReleased = false;
    const updatedSlides = presentation.slides.map(s => {
      let slideModified = false;
      const elements = s.elements.map(el => {
        if (el.lockedBy && el.lockTimestamp && (el.lockTimestamp.toMillis() + LOCK_DURATION_MS < Date.now())) {
          slideModified = true;
          locksReleased = true;
          return { ...el, lockedBy: null, lockTimestamp: null };
        }
        return el;
      });
      return slideModified ? { ...s, elements } : s;
    });

    if (locksReleased) {
      await updateDoc(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
      console.log(`Released expired locks for presentation ${presentationId}`);
    }
  }
}
export { getNextUserColor };
