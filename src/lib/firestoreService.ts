
import { db, storage as fbStorage } from './firebaseConfig';
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
  orderBy,
  limit,
  runTransaction,
  or
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import type { Presentation, Slide, SlideElement, SlideComment, User, Team, ActiveCollaboratorInfo, TeamRole, TeamMember, TeamActivity, TeamActivityType, PresentationActivity, PresentationActivityType, PresentationAccessRole, Asset, AssetType, SlideElementType } from '@/types';
import { logTeamActivityInMongoDB } from './mongoTeamService';
import { getUserByEmailFromMongoDB } from './mongoUserService'; // Correctly points to MongoDB service
import { v4 as uuidv4 } from 'uuid';


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

const renumberSlides = (slides: Slide[]): Slide[] => {
  return slides.map((slide, index) => ({ ...slide, slideNumber: index + 1 }));
};

const presentationsCollection = collection(db, 'presentations');
const presentationActivitiesCollection = collection(db, 'presentationActivities');
const assetsCollection = collection(db, 'assets');


export async function createPresentation(userId: string, title: string, teamId?: string, description: string = ''): Promise<string> {
  const initialSlideId = uuidv4();
  const newSlide: Omit<Slide, 'presentationId'> = {
    id: initialSlideId,
    slideNumber: 1,
    elements: [{
      id: uuidv4(),
      type: 'text',
      content: `Welcome to '${title}'!`,
      position: { x: 50, y: 50 },
      size: { width: 700, height: 100 },
      style: { fontFamily: 'Space Grotesk', fontSize: '36px', color: '#333333', backgroundColor: 'transparent', textAlign: 'left', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', opacity: 1 },
      zIndex: 1,
      rotation: 0,
      lockedBy: null,
      lockTimestamp: null,
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
    teamId: teamId || undefined,
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

  if (teamId) {
    await logTeamActivityInMongoDB(teamId, userId, 'presentation_created', { presentationTitle: title }, 'presentation', docRef.id);
  }
  await logPresentationActivity(docRef.id, userId, 'presentation_created', { presentationTitle: title });
  return docRef.id;
}

export async function getPresentationsForUser(userId: string, userTeamId?: string | null): Promise<Presentation[]> {
  const conditions = [
    where('creatorId', '==', userId),
    where(`access.${userId}`, 'in', ['owner', 'editor', 'viewer'])
  ];
  if (userTeamId) {
    conditions.push(where('teamId', '==', userTeamId));
  }

  const q = query(presentationsCollection, or(...conditions), orderBy('lastUpdatedAt', 'desc'));

  const snapshot = await getDocs(q);
  const presentationsMap = new Map<string, Presentation>();

  snapshot.docs.forEach(docSnap => {
      if (!presentationsMap.has(docSnap.id)) {
        const data = convertTimestamps(docSnap.data());
        if (!data.access) data.access = {};
        presentationsMap.set(docSnap.id, { id: docSnap.id, ...data } as Presentation);
      }
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
  const updatePayload: { [key:string]: any } = { lastUpdatedAt: serverTimestamp() };

  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const typedKey = key as keyof Presentation;
      if (typedKey === 'settings') {
        const newSettings = data.settings;
        if (newSettings) {
          for (const settingKey in newSettings) {
             if (settingKey === 'password' && (newSettings.password === undefined || newSettings.password === null || newSettings.password === '')) {
                 updatePayload[`settings.password`] = deleteField(); // Use deleteField for removal
             } else if (newSettings[settingKey as keyof Presentation['settings']] !== undefined) {
                 updatePayload[`settings.${settingKey}`] = newSettings[settingKey as keyof Presentation['settings']];
             }
          }
        }
      } else if (typedKey === 'access') {
        const newAccess = data.access;
        if (newAccess) {
          for (const accessKey in newAccess) {
             if (newAccess[accessKey] === null || newAccess[accessKey] === undefined || (newAccess[accessKey] as any) === deleteField()) { // Check for deleteField marker
                updatePayload[`access.${accessKey}`] = deleteField();
             } else {
                updatePayload[`access.${accessKey}`] = newAccess[accessKey];
             }
          }
        }
      } else if (typedKey === 'slides' && data.slides) {
        updatePayload.slides = data.slides.map(slide => ({
          ...slide,
          elements: slide.elements.map(el => ({
            ...el,
            zIndex: el.zIndex === undefined ? 0 : el.zIndex,
            lockedBy: el.lockedBy || null,
            lockTimestamp: el.lockTimestamp || null,
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
        }));
      } else if (typedKey !== 'id' && typedKey !== 'lastUpdatedAt' && typedKey !== 'createdAt') {
        updatePayload[typedKey] = data[typedKey];
      }
    }
  }
  if (Object.keys(updatePayload).length > 1) { // Ensure there's something to update besides timestamp
    await updateDoc(docRef, updatePayload);
  }
}

export async function deletePresentation(presentationId: string, teamId?: string, actorId?: string): Promise<void> {
  const docRef = doc(db, 'presentations', presentationId);
  const pres = await getPresentationById(presentationId);
  await deleteDoc(docRef);
  if (teamId && actorId && pres) {
     await logTeamActivityInMongoDB(teamId, actorId, 'presentation_deleted', { presentationTitle: pres.title }, 'presentation', presentationId);
  }
  if (actorId && pres){
      await logPresentationActivity(presentationId, actorId, 'presentation_deleted', { presentationTitle: pres.title });
  }
}

export async function addSlideToPresentation(presentationId: string, newSlideData: Partial<Omit<Slide, 'id' | 'presentationId' | 'slideNumber'>> = {}): Promise<string> {
  const presRef = doc(db, 'presentations', presentationId);
  return await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");

    const presentationData = presDoc.data() as Presentation;
    let currentSlides = presentationData.slides || [];

    const slideId = uuidv4();
    const slideNumber = currentSlides.length + 1;
    const defaultElementId = uuidv4();

    const defaultElement: SlideElement = {
      id: defaultElementId, type: 'text', content: `Slide ${slideNumber}`,
      position: { x: 50, y: 50 }, size: { width: 400, height: 50 },
      style: { fontFamily: 'Space Grotesk', fontSize: '24px', color: '#333333', backgroundColor: 'transparent', textAlign: 'left', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', opacity: 1 }, zIndex: 1, rotation: 0,
      lockedBy: null, lockTimestamp: null,
    };

    const newSlide: Slide = {
      id: slideId, presentationId: presentationId, slideNumber: slideNumber,
      elements: newSlideData.elements || [defaultElement],
      speakerNotes: newSlideData.speakerNotes || "", comments: newSlideData.comments || [],
      thumbnailUrl: newSlideData.thumbnailUrl || `https://placehold.co/160x90.png?text=S${slideNumber}`,
      backgroundColor: newSlideData.backgroundColor || '#FFFFFF',
    };

    const updatedSlidesArray = [...currentSlides, newSlide];
    const finalSlides = renumberSlides(updatedSlidesArray);

    transaction.update(presRef, { slides: finalSlides, lastUpdatedAt: serverTimestamp() });
    return slideId;
  });
}

export async function deleteSlideFromPresentation(presentationId: string, slideIdToDelete: string): Promise<Slide[] | null> {
  const presRef = doc(db, 'presentations', presentationId);
  return await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");

    const presentationData = presDoc.data() as Presentation;
    let slides = presentationData.slides || [];
    const initialLength = slides.length;

    slides = slides.filter(s => s.id !== slideIdToDelete);

    if (slides.length === initialLength) {
        console.warn(`Slide ${slideIdToDelete} not found in presentation ${presentationId} for deletion.`);
        return presentationData.slides;
    }

    const updatedSlides = renumberSlides(slides);
    transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    return updatedSlides;
  });
}

export async function duplicateSlideInPresentation(presentationId: string, slideIdToDuplicate: string): Promise<{ newSlideId: string, updatedSlides: Slide[] } | null> {
  const presRef = doc(db, 'presentations', presentationId);
  return await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");

    const presentationData = presDoc.data() as Presentation;
    let slides = presentationData.slides || [];
    const originalSlideIndex = slides.findIndex(s => s.id === slideIdToDuplicate);

    if (originalSlideIndex === -1) {
      console.warn(`Slide ${slideIdToDuplicate} not found in presentation ${presentationId} for duplication.`);
      return null;
    }

    const originalSlide = slides[originalSlideIndex];
    const newSlideId = uuidv4();
    const duplicatedElements = originalSlide.elements.map(el => ({
      ...JSON.parse(JSON.stringify(el)), // Deep copy, consider structuredClone for modern environments
      id: uuidv4(),
      lockedBy: null, // Ensure new elements are not locked
      lockTimestamp: null,
    }));

    const duplicatedSlide: Slide = {
      ...JSON.parse(JSON.stringify(originalSlide)),
      id: newSlideId,
      slideNumber: 0, // Will be re-numbered
      elements: duplicatedElements,
      comments: [], // Do not duplicate comments for now
      thumbnailUrl: originalSlide.thumbnailUrl ? `${originalSlide.thumbnailUrl.split('?')[0]}?text=Copy` : `https://placehold.co/160x90.png?text=Copy`,
    };

    slides.splice(originalSlideIndex + 1, 0, duplicatedSlide);
    const updatedSlides = renumberSlides(slides);

    transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    return { newSlideId, updatedSlides };
  });
}

export async function moveSlideInPresentation(presentationId: string, slideId: string, direction: 'up' | 'down'): Promise<Slide[] | null> {
  const presRef = doc(db, 'presentations', presentationId);
  return await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");

    const presentationData = presDoc.data() as Presentation;
    let slides = [...(presentationData.slides || [])];
    const currentIndex = slides.findIndex(s => s.id === slideId);

    if (currentIndex === -1) {
      console.warn(`Slide ${slideId} not found for move operation.`);
      return presentationData.slides;
    }

    if (direction === 'up' && currentIndex > 0) {
      const temp = slides[currentIndex];
      slides[currentIndex] = slides[currentIndex - 1];
      slides[currentIndex - 1] = temp;
    } else if (direction === 'down' && currentIndex < slides.length - 1) {
      const temp = slides[currentIndex];
      slides[currentIndex] = slides[currentIndex + 1];
      slides[currentIndex + 1] = temp;
    } else {
      return presentationData.slides; // No change possible
    }

    const updatedSlides = renumberSlides(slides);
    transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    return updatedSlides;
  });
}

export async function addElementToSlide(presentationId: string, slideId: string, elementData: Omit<SlideElement, 'id'>): Promise<string> {
  const presRef = doc(db, 'presentations', presentationId);
  const newElementId = uuidv4();
  const newElement: SlideElement = {
    ...elementData,
    id: newElementId,
    lockedBy: null, // Ensure new elements are not locked
    lockTimestamp: null,
   };

  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");
    const presentationData = presDoc.data() as Presentation;
    const slides = presentationData.slides || [];
    const slideIndex = slides.findIndex(s => s.id === slideId);

    if (slideIndex === -1) throw new Error("Slide not found");

    const updatedSlides = [...slides];
    const targetSlide = { ...updatedSlides[slideIndex] };
    targetSlide.elements = [...(targetSlide.elements || []), newElement];
    updatedSlides[slideIndex] = targetSlide;

    transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
  });
  return newElementId;
}

export async function deleteElementFromSlide(presentationId: string, slideId: string, elementId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");
    const presentationData = presDoc.data() as Presentation;
    const slides = presentationData.slides || [];
    const slideIndex = slides.findIndex(s => s.id === slideId);

    if (slideIndex === -1) throw new Error("Slide not found");

    const updatedSlides = [...slides];
    const targetSlide = { ...updatedSlides[slideIndex] };
    targetSlide.elements = (targetSlide.elements || []).filter(el => el.id !== elementId);
    updatedSlides[slideIndex] = targetSlide;

    transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
  });
}


export async function updateElementInSlide(presentationId: string, slideId: string, updatedElementPartial: Partial<SlideElement>): Promise<void> {
  if (!updatedElementPartial.id) return;
  const presRef = doc(db, 'presentations', presentationId);
  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error(`Presentation ${presentationId} not found.`);
    const presentation = presDoc.data() as Presentation; let slideFound = false;
    const updatedSlides = presentation.slides.map(s => {
      if (s.id === slideId) {
        slideFound = true; let elementFound = false;
        const newElements = s.elements.map(el => {
          if (el.id === updatedElementPartial.id) {
            // Check lock before allowing update
            if (el.lockedBy && el.lockedBy !== updatedElementPartial.lockedBy && updatedElementPartial.lockedBy !== null) { // Check if someone else is trying to update a locked element
                 console.warn(`Element ${el.id} is locked by ${el.lockedBy}, update by ${updatedElementPartial.lockedBy} denied unless it's a lock release.`);
                 // If it's not a lock release/acquire operation, deny.
                 if (!(updatedElementPartial.hasOwnProperty('lockedBy'))) {
                    throw new Error("Element is locked by another user.");
                 }
            }
            elementFound = true;
            return { ...el, ...updatedElementPartial,
              style: { ...(el.style || {}), ...(updatedElementPartial.style || {}),
                fontFamily: updatedElementPartial.style?.fontFamily || el.style?.fontFamily || 'PT Sans',
                fontSize: updatedElementPartial.style?.fontSize || el.style?.fontSize || '16px',
                color: updatedElementPartial.style?.color || el.style?.color || '#000000',
                backgroundColor: updatedElementPartial.style?.backgroundColor || el.style?.backgroundColor || 'transparent',
                textAlign: updatedElementPartial.style?.textAlign || el.style?.textAlign || 'left',
                fontWeight: updatedElementPartial.style?.fontWeight || el.style?.fontWeight || 'normal',
                fontStyle: updatedElementPartial.style?.fontStyle || el.style?.fontStyle || 'normal',
                textDecoration: updatedElementPartial.style?.textDecoration || el.style?.textDecoration || 'none',
                opacity: updatedElementPartial.style?.opacity === undefined ? (el.style?.opacity === undefined ? 1 : el.style.opacity) : updatedElementPartial.style.opacity,
                shapeType: updatedElementPartial.style?.shapeType || el.style?.shapeType || 'rectangle',
              },
              zIndex: updatedElementPartial.zIndex === undefined ? (el.zIndex === undefined ? 0 : el.zIndex) : updatedElementPartial.zIndex,
              rotation: updatedElementPartial.rotation === undefined ? (el.rotation === undefined ? 0 : el.rotation) : updatedElementPartial.rotation,
              // Explicitly handle lock fields if they are part of the partial update
              lockedBy: updatedElementPartial.hasOwnProperty('lockedBy') ? updatedElementPartial.lockedBy : el.lockedBy,
              lockTimestamp: updatedElementPartial.hasOwnProperty('lockTimestamp') ? (updatedElementPartial.lockTimestamp === null ? null : serverTimestamp() as Timestamp) : el.lockTimestamp,
            };
          } return el;
        });
        if (!elementFound) console.warn(`Element ${updatedElementPartial.id} not found in slide ${slideId}`);
        return { ...s, elements: newElements };
      } return s;
    });
    if (!slideFound) { console.warn(`Slide ${slideId} not found in presentation ${presentationId}`); return; }
    transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
  });
}

export async function addCommentToSlide(presentationId: string, slideId: string, comment: Omit<SlideComment, 'id' | 'createdAt'>): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");
    const presentationData = presDoc.data() as Presentation;
    const slides = (presentationData?.slides || []);
    const slideIndex = slides.findIndex(s => s.id === slideId);
    if (slideIndex > -1) {
        const newComment: SlideComment = { ...comment, id: uuidv4(), createdAt: serverTimestamp() as Timestamp, };
        const updatedSlides = [...slides]; const targetSlide = {...updatedSlides[slideIndex]};
        targetSlide.comments = [...(targetSlide.comments || []), newComment];
        updatedSlides[slideIndex] = targetSlide;
        transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    } else console.warn(`Slide ${slideId} not found in presentation ${presentationId}`);
  });
}

export async function resolveCommentOnSlide(presentationId: string, slideId: string, commentId: string): Promise<void> {
 const presRef = doc(db, 'presentations', presentationId);
  await runTransaction(db, async (transaction) => {
    const presDoc = await transaction.get(presRef);
    if (!presDoc.exists()) throw new Error("Presentation not found");
    const presentationData = presDoc.data() as Presentation;
    const slides = (presentationData?.slides || []);
    const slideIndex = slides.findIndex(s => s.id === slideId);
    if (slideIndex > -1) {
        const updatedSlides = [...slides]; const targetSlide = {...updatedSlides[slideIndex]};
        targetSlide.comments = (targetSlide.comments || []).map(c => c.id === commentId ? { ...c, resolved: true } : c);
        updatedSlides[slideIndex] = targetSlide;
        transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    }
  });
}

export async function updateUserPresence(presentationId: string, userId: string, userInfo: Pick<ActiveCollaboratorInfo, 'name' | 'profilePictureUrl' | 'color' | 'email'>): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  const dataToSet: ActiveCollaboratorInfo = {
    ...userInfo,
    id: userId,
    lastSeen: serverTimestamp() as Timestamp,
    cursorPosition: null, // Initialize cursorPosition as null
  };
  try {
    await updateDoc(presRef, {
      [`activeCollaborators.${userId}`]: dataToSet,
      lastUpdatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating user presence:", error);
    // If presentation doc doesn't exist, this will fail. Consider creating it if it's a valid scenario.
  }
}


export async function removeUserPresence(presentationId: string, userId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  try {
    await updateDoc(presRef, { [`activeCollaborators.${userId}`]: deleteField(), lastUpdatedAt: serverTimestamp() });
  } catch (error) {
      console.warn(`Error removing user presence for user ${userId} in presentation ${presentationId}. Document might not exist or field already deleted.`, error);
  }
}

export async function updateUserCursorPosition(presentationId: string, userId: string, slideId: string, position: { x: number; y: number }): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  try {
    await updateDoc(presRef, {
      [`activeCollaborators.${userId}.cursorPosition`]: { slideId, ...position },
      [`activeCollaborators.${userId}.lastSeen`]: serverTimestamp()
    });
  } catch (error) {
      console.warn(`Error updating cursor position for user ${userId} in presentation ${presentationId}. User might not be active.`, error);
  }
}

const LOCK_DURATION_MS = 30 * 1000; // 30 seconds

export async function acquireLock(presentationId: string, slideId: string, elementId: string, userId: string): Promise<boolean> {
  const presRef = doc(db, 'presentations', presentationId);
  try {
    await runTransaction(db, async (transaction) => {
        const presDoc = await transaction.get(presRef);
        if (!presDoc.exists()) throw new Error("Presentation not found for lock.");
        const presentation = presDoc.data() as Presentation; let lockAcquired = false; let alreadyLockedByOther = false;
        const updatedSlides = presentation.slides.map(s => {
          if (s.id === slideId) {
            return { ...s, elements: s.elements.map(el => {
                if (el.id === elementId) {
                  if (el.lockedBy && el.lockedBy !== userId && el.lockTimestamp && ((el.lockTimestamp as Timestamp).toMillis() + LOCK_DURATION_MS > Date.now())) {
                    alreadyLockedByOther = true; return el;
                  }
                  lockAcquired = true; return { ...el, lockedBy: userId, lockTimestamp: serverTimestamp() as Timestamp };
                } return el;
              })};
          } return s;
        });
        if (alreadyLockedByOther) throw new Error("Element already locked by another user.");
        if (!lockAcquired) throw new Error("Element not found to lock.");
        transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    }); return true;
  } catch (error) {
    console.error("Lock acquisition failed:", error);
    return false;
  }
}

export async function releaseLock(presentationId: string, slideId: string, elementId: string, userId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
  try {
     await runTransaction(db, async (transaction) => {
        const presDoc = await transaction.get(presRef); if (!presDoc.exists()) return;
        const presentation = presDoc.data() as Presentation;
        const updatedSlides = presentation.slides.map(s => {
          if (s.id === slideId) {
            return { ...s, elements: s.elements.map(el => {
                if (el.id === elementId && el.lockedBy === userId) return { ...el, lockedBy: null, lockTimestamp: null };
                return el;
              })};
          } return s;
        });
        transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
    });
  } catch (error) { console.error("Lock release failed:", error); }
}

export async function releaseExpiredLocks(presentationId: string): Promise<void> {
  const presRef = doc(db, 'presentations', presentationId);
   try {
    await runTransaction(db, async (transaction) => {
        const presDoc = await transaction.get(presRef); if (!presDoc.exists()) return;
        const presentation = presDoc.data() as Presentation; let locksReleased = false;
        const now = Date.now();
        const updatedSlides = presentation.slides.map(s => {
          let slideModified = false;
          const elements = s.elements.map(el => {
            if (el.lockedBy && el.lockTimestamp && ((el.lockTimestamp as Timestamp).toMillis() + LOCK_DURATION_MS < now)) {
              slideModified = true; locksReleased = true; return { ...el, lockedBy: null, lockTimestamp: null };
            } return el;
          });
          return slideModified ? { ...s, elements } : s;
        });
        if (locksReleased) {
          console.log(`Released expired locks for presentation ${presentationId}`);
          transaction.update(presRef, { slides: updatedSlides, lastUpdatedAt: serverTimestamp() });
        }
    });
  } catch (error) { console.error("Expired lock release failed:", error); }
}


export async function logPresentationActivity(
  presentationId: string, actorId: string, actionType: PresentationActivityType, details?: PresentationActivity['details']
): Promise<string> {
  let actorNameResolved = 'System/Guest';
  // In a real app, you might fetch user profile here if actorId is not 'system' or 'guest'
  // For now, assuming actorId is a Firebase UID and their name is passed in details if available or can be fetched from User model.

  const activityData: Omit<PresentationActivity, 'id'> = {
    presentationId, actorId, actorName: actorNameResolved, actionType, details: details || {}, createdAt: serverTimestamp() as Timestamp,
  };
  const activityRef = await addDoc(presentationActivitiesCollection, activityData);
  return activityRef.id;
}

export async function getPresentationActivities(presentationId: string, limitCount = 20): Promise<PresentationActivity[]> {
    const q = query( presentationActivitiesCollection, where('presentationId', '==', presentationId), orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data())} as PresentationActivity));
}

// --- Asset Management ---
export async function createAssetMetadata(assetData: Omit<Asset, 'id' | 'createdAt' | 'lastUpdatedAt'>): Promise<string> {
  const docRef = await addDoc(assetsCollection, {
    ...assetData,
    createdAt: serverTimestamp() as Timestamp,
    lastUpdatedAt: serverTimestamp() as Timestamp,
  });
  if (assetData.teamId && assetData.uploaderId) {
    await logTeamActivityInMongoDB(assetData.teamId, assetData.uploaderId, 'asset_uploaded', { fileName: assetData.fileName, assetType: assetData.assetType }, 'asset', docRef.id);
  }
  return docRef.id;
}

export async function getTeamAssets(teamId: string): Promise<Asset[]> {
  const q = query(assetsCollection, where('teamId', '==', teamId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Asset));
}

export async function deleteAsset(assetId: string, storagePath: string, teamId: string, actorId: string): Promise<void> {
  const assetDocRef = doc(db, 'assets', assetId);
  const assetDocSnap = await getDoc(assetDocRef);
  const assetData = assetDocSnap.data() as Asset | undefined;

  // Delete from Firebase Storage
  const fileRef = ref(fbStorage, storagePath);
  await deleteObject(fileRef);

  // Delete metadata from Firestore
  await deleteDoc(assetDocRef);

  if (teamId && actorId && assetData) {
    await logTeamActivityInMongoDB(teamId, actorId, 'asset_deleted', { fileName: assetData.fileName, assetType: assetData.assetType }, 'asset', assetId);
  }
}
// --- End Asset Management ---

// This function now correctly uses the MongoDB service to find users by email.
export async function getUserByEmail(email: string): Promise<User | null> {
    return getUserByEmailFromMongoDB(email);
}


export { getNextUserColor };
export { uuidv4 };
